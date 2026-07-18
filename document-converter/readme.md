# Document Converter — Pro Conversion Proxy

This Worker is what makes PDF→DOCX, PDF→PPTX, PPTX→PDF, ODT→PDF and RTF→PDF
work. Everything else in the Document Converter tool runs client-side and
does **not** need this.

It exists for one reason: CloudConvert (and any similar API) needs a secret
API key, and a key placed directly in your website's JavaScript can be
copied out of the browser by anyone and used against your account. This
Worker holds the key server-side and only exposes three safe endpoints to
your site.

## 1. Get a CloudConvert API key

1. Create an account at https://cloudconvert.com
2. Go to Dashboard → API v2 Keys and generate a key
3. CloudConvert bills by "credits" per conversion minute — check current
   pricing at https://cloudconvert.com/pricing before going live, since
   this determines your per-conversion cost.

## 2. Deploy the Worker

Requires a free Cloudflare account and Node.js installed locally.

```bash
npm install -g wrangler
cd cloudflare-worker
wrangler login
wrangler secret put CLOUDCONVERT_API_KEY
# paste your CloudConvert key when prompted

# edit wrangler.toml: set ALLOWED_ORIGIN to your real domain
wrangler deploy
```

Wrangler will print a URL like:
`https://dkb-convert-proxy.<your-subdomain>.workers.dev`

## 3. Wire it into the front-end

Open `assets/js/tools/document-converter.js` and set:

```js
var CONFIG = {
  apiProxyUrl: 'https://dkb-convert-proxy.<your-subdomain>.workers.dev',
  ...
};
```

That's it — the "Pro · Cloud" format buttons (PDF→DOCX, PDF→PPTX, PPTX→PDF,
ODT→PDF, RTF→PDF) will start working. Everything else already works without
this step.

## Notes / things to verify before going live

- This was written against CloudConvert's documented `/v2/jobs` flow
  (import/upload → convert → export/url). Re-check
  https://cloudconvert.com/api/v2 for any field/endpoint changes before
  production use, and test each conversion pair once with a real file.
- Add your own per-user rate limiting if you expect public traffic — this
  Worker does not currently cap how often one visitor can call `/convert`,
  and every call consumes CloudConvert credits.
- `maxApiFileSizeMB` in the front-end config is a soft client-side limit
  only; CloudConvert enforces its own limits based on your plan.