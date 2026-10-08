# DailyKitBox

Free online PDF tools, calculators and utilities. No sign-up, and file tools run entirely in the browser, so files are never uploaded.

**Live site:** https://www.dailykitbox.com

## Tools

| Tool | Folder |
|---|---|
| Merge PDF | `merge-pdf/` |
| Split PDF | `split-pdf/` |
| Delete PDF Pages | `delete-pdf-pages/` |
| Images to PDF | `jpg-to-pdf/` |
| Office Converter (Word / PDF) | `document-converter/` |
| Branding & Security (watermark, protect) | `pdf-branding-toolkit/` |
| Age Calculator | `age-calculator/` |
| Tip Calculator | `tip-calculator/` |
| Mortgage Calculator | `mortgage-calculator/` |
| BMI Calculator | `bmi-calculator/` |
| Weather Forecast | `weather/` |
| Word Counter | `word-counter/` |
| Brand Name & Slogan Generator | `brand-name-slogan-generator/` |
| Password Generator & Checker | `passwor-generator-cheker/` |

Other pages: `about/`, `contact/`, `privacy-policy/`, `terms/`.

## Project structure

```
/
├── index.html              Homepage (tool search, categories, dark mode, 5 languages)
├── <tool-name>/index.html  One folder per tool, served at /<tool-name>/
├── assets/
│   ├── css/                One stylesheet per tool, plus style.css
│   ├── js/                 One script per tool
│   └── images/             Logo, favicons, cover images
├── favicon.ico
├── manifest.json           Site-wide web app manifest
├── robots.txt
├── sitemap.xml
├── generate-sitemap.js     Helper for building sitemap.xml
└── CNAME                   Custom domain: www.dailykitbox.com
```

## Tech

- Plain HTML, CSS and vanilla JavaScript, no build step
- [jsPDF](https://github.com/parallax/jsPDF) (loaded from cdnjs) for PDF generation
- Hosted on GitHub Pages with the custom domain `www.dailykitbox.com`

## Adding a new tool

1. Create `<tool-name>/index.html`, `assets/css/<tool-name>.css` and `assets/js/<tool-name>.js`
2. Add a card for it in the tools grid of the root `index.html`, with the matching translation keys
3. Add the page URL to `sitemap.xml`

## Checklist for every page

- Canonical, `og:url` and schema URLs use `https://www.dailykitbox.com/...` (the `www` host, matching `CNAME`)
- Internal links use clean URLs such as `/merge-pdf/`, never `/merge-pdf/index.html`
- `og:image` and `twitter:image` use full URLs
- Google Analytics tag in `<head>`
- Footer links to About, Contact, Privacy Policy and Terms of Service
