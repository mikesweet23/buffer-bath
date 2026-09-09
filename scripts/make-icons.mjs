// Renders the planner's PWA icons from inline SVG using headless Chrome.
// Run: node scripts/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT_DIR = new URL("../public/icons/", import.meta.url);
const PUBLIC_DIR = new URL("../public/", import.meta.url);
fs.mkdirSync(OUT_DIR, { recursive: true });

const GLYPH = `
  <defs>
    <linearGradient id="thermal" x1="16" y1="9" x2="16" y2="26" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5FC8F5"/>
      <stop offset="1" stop-color="#2E90FF"/>
    </linearGradient>
  </defs>
  <path d="M10 10v10.2c0 3.7 2.7 6.8 6 6.8s6-3.1 6-6.8V10Z" fill="url(#thermal)"/>
  <ellipse cx="16" cy="10" rx="6" ry="2.8" fill="#F4F8FC"/>`;

const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#08131F"/>${GLYPH}</svg>`;
// Full-bleed for Apple touch: glyph nudged up to sit comfortably in the squircle.
const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 32 32"><rect x="0" y="-1" width="32" height="32" fill="#08131F"/>${GLYPH}</svg>`;
// Maskable: glyph shrunk to 80% so it stays inside Android's 66% safe-zone circle.
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#08131F"/><g transform="translate(16 16) scale(0.8) translate(-16 -17)">${GLYPH}</g></svg>`;

const TARGETS = [
  { file: "icons/icon-192.png", size: 192, svg: svgAny },
  { file: "icons/icon-512.png", size: 512, svg: svgAny },
  { file: "icons/icon-maskable-512.png", size: 512, svg: svgMaskable },
  { file: "apple-touch-icon.png", size: 180, svg: svgFull },
];

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"],
});

for (const target of TARGETS) {
  const page = await browser.newPage();
  await page.setViewport({ width: target.size, height: target.size, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0"><div id="icon" style="width:${target.size}px;height:${target.size}px">${target.svg.replace("<svg ", `<svg width="${target.size}" height="${target.size}" `)}</div></body></html>`,
    { waitUntil: "load" },
  );
  const el = await page.$("#icon");
  const dest = path.join(new URL("../public/", import.meta.url).pathname, target.file);
  await el.screenshot({ path: dest, omitBackground: false });
  await page.close();
  console.log("wrote", target.file, `${target.size}x${target.size}`);
}

await browser.close();
console.log("public dir:", PUBLIC_DIR.pathname);
