const fs = require("fs");
const path = require("path");

const DOMAIN = "https://dailykitbox.com";

const root = __dirname;

const ignore = [
  ".git",
  ".github",
  "assets",
  "node_modules"
];

const folders = fs.readdirSync(root).filter(item => {
  const full = path.join(root, item);
  return (
    fs.statSync(full).isDirectory() &&
    !ignore.includes(item) &&
    fs.existsSync(path.join(full, "index.html"))
  );
});

let urls = [];

urls.push(`
<url>
  <loc>${DOMAIN}/</loc>
  <priority>1.0</priority>
</url>`);

folders.forEach(folder => {
urls.push(`
<url>
  <loc>${DOMAIN}/${folder}/</loc>
  <priority>0.8</priority>
</url>`);
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls.join("\n")}

</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap);

console.log("✅ sitemap.xml generated successfully");