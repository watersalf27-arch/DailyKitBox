#!/usr/bin/env python3
"""DailyKitBox site-wide fixer.

Run from the repository root:
    python3 scripts/fix_site.py            report only (changes nothing)
    python3 scripts/fix_site.py --apply    write the fixes to the files

What it does on every .html page (safe to run again, a second run changes nothing):
  - canonical / og:url / schema URLs  -> https://www.dailykitbox.com/... (clean URLs, no index.html)
  - relative og:image / twitter:image -> full URLs
  - favicon + apple-touch-icon links  -> the new logo icon set
  - manifest link                     -> /manifest.json unless the folder has its own manifest file
  - Google Analytics tag              -> added when missing
  - internal links                    -> clean URLs (/merge-pdf/), known wrong folder names corrected
  - footer                            -> About / Contact / Privacy Policy / Terms of Service links added when missing
Also rebuilds sitemap.xml and lists every broken link or missing file it finds.
"""
import os
import posixpath
import re
import sys

HOST = 'https://www.dailykitbox.com'
GA_ID = 'G-BZECV8EZS6'
APPLY = '--apply' in sys.argv
ROOT = os.getcwd()
SKIP_DIRS = {'.git', '.github', 'assets', 'node_modules', 'scripts'}

# wrong folder name -> real folder name (only used when the wrong folder does not exist)
RENAMES = {
    'pdf-branding-security': 'pdf-branding-toolkit',
    'password-generator-checker': 'passwor-generator-cheker',
    'terms': 'terms-of-service',
}
# old flat page names -> folder
LEGACY = {
    'privacy-policy.html': 'privacy-policy', 'privacy.html': 'privacy-policy',
    'terms.html': 'terms-of-service', 'terms-of-service.html': 'terms-of-service',
    'about.html': 'about', 'contact.html': 'contact',
}
LEGAL = [('about', 'About'), ('contact', 'Contact'),
         ('privacy-policy', 'Privacy Policy'), ('terms-of-service', 'Terms of Service')]

ICON_FILES = ['favicon.ico', 'assets/images/favicon-48x48.png', 'assets/images/favicon-32x32.png',
              'assets/images/apple-touch-icon.png']
ICON_BLOCK = ('<link rel="icon" href="/favicon.ico" sizes="any">\n'
              '<link rel="icon" type="image/png" sizes="48x48" href="/assets/images/favicon-48x48.png">\n'
              '<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">\n'
              '<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">\n')
GA_BLOCK = ('<!-- Google tag (gtag.js) -->\n'
            '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA_ID + '"></script>\n'
            '<script>\n  window.dataLayer = window.dataLayer || [];\n'
            '  function gtag(){dataLayer.push(arguments);}\n'
            "  gtag('js', new Date());\n  gtag('config', '" + GA_ID + "');\n</script>\n")

EXTERNAL = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//)', re.I)


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def isfile(p):
    return os.path.isfile(os.path.join(ROOT, p))


def isdir(p):
    return os.path.isdir(os.path.join(ROOT, p))


def page_exists(p):
    """p is a repo-relative path without leading slash ('' = homepage)."""
    full = os.path.join(ROOT, p)
    if os.path.isdir(full):
        return os.path.isfile(os.path.join(full, 'index.html'))
    return os.path.isfile(full)


def resolve(href, rel):
    """Repo-relative path for a local href, or None for external / special links."""
    h = re.split(r'[#?]', href, 1)[0]
    if not h or EXTERNAL.match(h):
        return None
    if h.startswith('/'):
        p = posixpath.normpath(h.lstrip('/') or '.')
    else:
        p = posixpath.normpath(posixpath.join(posixpath.dirname(rel), h))
    if p.startswith('..'):
        return None
    return '' if p == '.' else p


# ---------------------------------------------------------------- link fixing
def fix_href(href, rel, flags):
    if href.startswith('#') or EXTERNAL.match(href):
        return href
    m = re.match(r'^([^#?]*)([#?].*)?$', href, re.S)
    path, tail = m.group(1), m.group(2) or ''
    if not path:
        return href
    legacy = LEGACY.get(posixpath.basename(path))
    if legacy:
        return '/' + legacy + '/' + tail
    p = resolve(path, rel)
    if p is None:
        return href
    if p == 'index.html':
        p = ''
    elif p.endswith('/index.html'):
        p = p[:-len('/index.html')]
    parts = p.split('/') if p else []
    if parts and parts[0] in RENAMES and not isdir(parts[0]) and isdir(RENAMES[parts[0]]):
        parts[0] = RENAMES[parts[0]]
        p = '/'.join(parts)
    ext = posixpath.splitext(p)[1]
    if ext:                                   # a file (pdf, png, other .html ...): leave, but check it
        if not isfile(p):
            flags.append('broken link: ' + href)
        return href
    if page_exists(p):
        return ('/' + p + '/' if p else '/') + tail
    flags.append('broken link: ' + href)
    return href


def fix_links(html, rel, flags):
    return re.sub(r'(<a\b[^>]*?\bhref\s*=\s*")([^"]*)(")',
                  lambda m: m.group(1) + fix_href(m.group(2), rel, flags) + m.group(3), html, flags=re.S | re.I)


# ---------------------------------------------------------------- head fixes
def fix_hosts(html):
    html = re.sub(r'https?://dailykitbox\.com', HOST, html)
    html = html.replace('http://www.dailykitbox.com', HOST)
    html = re.sub(r'(https://www\.dailykitbox\.com/(?:[A-Za-z0-9._~-]+/)*)index\.html', r'\1', html)
    return html


def fix_tools_prefix(html):
    def repl(m):
        folder = m.group(1)
        return HOST + '/' + folder + '/' if isdir(folder) else m.group(0)
    return re.sub(r'https://www\.dailykitbox\.com/tools/([A-Za-z0-9_-]+)/', repl, html)


def fix_meta_images(html, flags):
    def repl(m):
        tag = m.group(0)
        if not re.search(r'(?:property|name)\s*=\s*"(?:og:image|twitter:image)"', tag):
            return tag
        c = re.search(r'content\s*=\s*"([^"]*)"', tag)
        if not c:
            return tag
        val = c.group(1)
        new = val
        if val.startswith('/') and not val.startswith('//'):
            new = HOST + val
        elif val.startswith('../'):
            new = HOST + '/' + val.replace('../', '')
        if new != val:
            tag = tag.replace('content="' + val + '"', 'content="' + new + '"')
        if new.startswith(HOST + '/') and not isfile(new[len(HOST) + 1:]):
            flags.append('social image file missing: ' + new[len(HOST):])
        return tag
    return re.sub(r'<meta\b[^>]*>', repl, html, flags=re.S | re.I)


def fix_icons(html, notes, flags):
    if 'favicon-48x48.png' in html:
        return html
    missing = [f for f in ICON_FILES if not isfile(f)]
    if missing:
        flags.append('icons not updated, upload first: ' + ', '.join(missing))
        return html
    pat = re.compile(r'<link\b[^>]*\brel\s*=\s*["\'](?:shortcut icon|icon|apple-touch-icon)["\'][^>]*>[ \t]*\r?\n?',
                     re.I | re.S)
    first = pat.search(html)
    if first:
        start = first.start()
        html = pat.sub('', html)
        html = html[:start] + ICON_BLOCK + html[start:]
    else:
        m = re.search(r'</head>', html, re.I)
        if not m:
            flags.append('no </head> found, icons not added')
            return html
        html = html[:m.start()] + ICON_BLOCK + html[m.start():]
    notes.append('favicon and apple-touch-icon updated')
    return html


def fix_manifest(html, rel, notes):
    m = re.search(r'<link\b[^>]*\brel\s*=\s*["\']manifest["\'][^>]*>', html, re.I | re.S)
    if not m:
        return html
    h = re.search(r'href\s*=\s*"([^"]*)"', m.group(0))
    if not h or h.group(1).startswith('/') or EXTERNAL.match(h.group(1)):
        return html
    target = resolve(h.group(1), rel)
    if target is not None and isfile(target) or not isfile('manifest.json'):
        return html                         # the folder keeps its own manifest, or there is no root one
    new_tag = m.group(0).replace('href="' + h.group(1) + '"', 'href="/manifest.json"')
    notes.append('manifest link -> /manifest.json')
    return html[:m.start()] + new_tag + html[m.end():]


def add_ga(html, notes, flags):
    if GA_ID in html:
        return html
    m = re.search(r'</head>', html, re.I)
    if not m:
        flags.append('no </head> found, analytics not added')
        return html
    notes.append('Google Analytics tag added')
    return html[:m.start()] + GA_BLOCK + html[m.start():]


def has_link(html, slug):
    return re.search(r'href\s*=\s*"(?:%s)?/%s/?"' % (re.escape(HOST), re.escape(slug)), html) is not None


def add_legal(html, notes):
    missing = [(s, l) for s, l in LEGAL if not has_link(html, s) and isdir(s)]
    if not missing:
        return html
    links = '\n'.join('<a href="/%s/" style="color:inherit;opacity:.85;text-decoration:none">%s</a>' % (s, l)
                      for s, l in missing)
    block = ('<nav class="dkb-legal-links" aria-label="Site pages" style="display:flex;flex-wrap:wrap;'
             'justify-content:center;gap:6px 18px;margin:14px 0;font-size:13px">\n' + links + '\n</nav>\n')
    ends = [m.start() for m in re.finditer(r'</footer>', html, re.I)]
    if not ends:
        ends = [m.start() for m in re.finditer(r'</body>', html, re.I)]
    pos = ends[-1] if ends else len(html)
    notes.append('footer links added: ' + ', '.join(l for _, l in missing))
    return html[:pos] + block + html[pos:]


def check_assets(html, rel, flags):
    for tag, attr in (('link', 'href'), ('script', 'src'), ('img', 'src')):
        for m in re.finditer(r'<%s\b[^>]*?\b%s\s*=\s*"([^"]*)"' % (tag, attr), html, re.I | re.S):
            p = resolve(m.group(1), rel)
            if p is not None and p and not (isfile(p) or page_exists(p)):
                flags.append('missing file: ' + m.group(1))


def process(rel):
    original = read(os.path.join(ROOT, rel))
    html, notes, flags = original, [], []

    def step(func, label, *args):
        nonlocal html
        before = html
        html = func(html, *args)
        if label and html != before:
            notes.append(label)

    step(fix_hosts, 'URLs normalised (www host, no index.html)')
    step(fix_tools_prefix, 'removed wrong /tools/ prefix')
    step(fix_meta_images, 'social image URLs made absolute', flags)
    step(fix_icons, '', notes, flags)
    step(fix_manifest, '', rel, notes)
    step(add_ga, '', notes, flags)
    step(fix_links, 'internal links cleaned', rel, flags)
    step(add_legal, '', notes)
    check_assets(html, rel, flags)
    return original, html, notes, sorted(set(flags))


def build_sitemap():
    urls = [HOST + '/']
    for name in sorted(os.listdir(ROOT)):
        if name in SKIP_DIRS or name.startswith('.') or not isdir(name):
            continue
        idx = os.path.join(ROOT, name, 'index.html')
        if os.path.isfile(idx) and 'noindex' not in read(idx).lower():
            urls.append(HOST + '/' + name + '/')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            ''.join('<url><loc>%s</loc></url>\n' % u for u in urls) + '</urlset>\n')


def main():
    lines = ['# DailyKitBox site fixer', '', 'Mode: **%s**' % ('APPLY (files written)' if APPLY else 'REPORT only (nothing changed)'), '']
    html_files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if not (dirpath == ROOT and d in SKIP_DIRS)]
        for fn in filenames:
            if fn.lower().endswith('.html'):
                html_files.append(os.path.relpath(os.path.join(dirpath, fn), ROOT).replace(os.sep, '/'))
    html_files.sort()

    changed = 0
    flag_lines = []
    for rel in html_files:
        original, html, notes, flags = process(rel)
        if html != original:
            changed += 1
            lines.append('- `%s`: %s' % (rel, '; '.join(notes) if notes else 'URLs normalised'))
            if APPLY:
                write(os.path.join(ROOT, rel), html)
        for f in flags:
            flag_lines.append('- `%s`: %s' % (rel, f))
    if not changed:
        lines.append('- No page needed changes.')

    lines += ['', '## Sitemap']
    sm = build_sitemap()
    old = read(os.path.join(ROOT, 'sitemap.xml')) if isfile('sitemap.xml') else ''
    if sm != old:
        lines.append('- sitemap.xml %s (%d URLs)' % ('rebuilt' if APPLY else 'would be rebuilt', sm.count('<url>')))
        if APPLY:
            write(os.path.join(ROOT, 'sitemap.xml'), sm)
    else:
        lines.append('- sitemap.xml already up to date')

    lines += ['', '## Files']
    for name in ('maskable-192.png', 'maskable-512.png'):
        if isfile(name) and isdir('assets/images') and not isfile('assets/images/' + name):
            lines.append('- `%s` %s to assets/images/' % (name, 'moved' if APPLY else 'would be moved'))
            if APPLY:
                os.rename(os.path.join(ROOT, name), os.path.join(ROOT, 'assets/images', name))
    for f in ['favicon.ico'] + ['assets/images/' + n for n in
                                ('logo-icon-512.png', 'logo-icon-192.png', 'favicon-48x48.png', 'favicon-32x32.png',
                                 'apple-touch-icon.png', 'dkb-logo-icon.webp', 'maskable-192.png', 'maskable-512.png')]:
        if not isfile(f) and not (APPLY is False and f.startswith('assets/images/maskable') and isfile(f.split('/')[-1])):
            lines.append('- MISSING: `%s` (upload it)' % f)

    lines += ['', '## Things I could not fix automatically', '']
    lines += flag_lines or ['- Nothing found.']
    lines += ['', 'Pages checked: %d | pages changed: %d' % (len(html_files), changed)]
    report = '\n'.join(lines) + '\n'
    print(report)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(report)


if __name__ == '__main__':
    main()