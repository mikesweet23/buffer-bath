import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const OUT = process.env.E2E_OUT || "/tmp/bb-e2e-pwa";
const BASE = process.env.E2E_URL || "http://127.0.0.1:4173/";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const log = [];
function check(name, ok, extra = "") {
  log.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  console.log(ok ? "PASS" : "FAIL", name, extra);
}

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.evaluateOnNewDocument(() => {
  window.addEventListener("beforeinstallprompt", () => {
    window.__bipFired = true;
  });
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

// Manifest + icons
const manifestUrl = await page.$eval('link[rel="manifest"]', (el) => el.href);
const manifest = await page.evaluate(async (url) => {
  const res = await fetch(url);
  return { status: res.status, json: await res.json() };
}, manifestUrl);
check("manifest serves", manifest.status === 200);
const sizes = (manifest.json.icons || []).map((i) => `${i.sizes}/${i.purpose}`).join(", ");
check(
  "manifest has 192 + 512 + maskable PNG",
  /192x192\/any/.test(sizes) && /512x512\/any/.test(sizes) && /512x512\/maskable/.test(sizes),
  sizes,
);
check("manifest standalone", manifest.json.display === "standalone");
for (const icon of manifest.json.icons.filter((i) => i.type === "image/png")) {
  const url = new URL(icon.src, manifestUrl).href;
  const head = await page.evaluate(async (u) => {
    const res = await fetch(u, { method: "GET" });
    return { status: res.status, type: res.headers.get("content-type") };
  }, url);
  check(`icon ${icon.sizes} serves`, head.status === 200 && /image\/png/.test(head.type || ""), `${head.status} ${head.type}`);
}
const appleTouch = await page.$eval('link[rel="apple-touch-icon"]', (el) => el.href);
const appleRes = await page.evaluate(async (u) => {
  const res = await fetch(u);
  return { status: res.status, type: res.headers.get("content-type") };
}, appleTouch);
check(
  "apple-touch-icon is PNG",
  appleRes.status === 200 && /image\/png/.test(appleRes.type || "") && appleTouch.endsWith(".png"),
  appleTouch,
);

// Service worker
await page.waitForFunction(() => !!navigator.serviceWorker?.controller || true, { timeout: 2000 }).catch(() => null);
await delay(1500);
const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.active?.state || reg?.installing?.state || reg?.waiting?.state || "none";
});
check("service worker active", /activated/.test(swState), swState);

// Install dialog on desktop (defaults to Android tab)
async function openInstall(pg) {
  // Footer link always opens the instructions dialog; the header button may
  // take the one-tap browser-prompt path instead when installable.
  await pg.evaluate(() => {
    const btn = document.querySelector("button.footer-install");
    btn?.scrollIntoView({ block: "center", behavior: "instant" });
    btn?.click();
  });
  await pg.waitForSelector('[role="dialog"]', { timeout: 3000 });
}

async function clickHeaderInstall(pg) {
  await pg.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((el) =>
      /^\s*Install app\s*$/.test(el.textContent || ""),
    );
    btn?.scrollIntoView({ block: "center", behavior: "instant" });
    btn?.click();
  });
  await delay(300);
}
await openInstall(page);
const desktopTab = await page.$eval('[role="dialog"] [role="tablist"]', (el) => el.textContent || "");
check("dialog opens with platform tabs", /iPhone/.test(desktopTab) && /Android/.test(desktopTab));
const activeTab = await page.$eval('[role="dialog"] [role="tab"][aria-selected="true"]', (el) => el.textContent || "");
check("desktop defaults to Android tab", /Android/.test(activeTab), activeTab);
const androidSteps = await page.$$eval(".install-steps li", (els) => els.length);
check("android steps listed", androidSteps >= 3, `${androidSteps} steps`);
await page.screenshot({ path: path.join(OUT, "pwa-dialog-android.png") });
await page.evaluate(() => {
  Array.from(document.querySelectorAll('[role="tab"]'))
    .find((el) => /iPhone/.test(el.textContent || ""))
    ?.click();
});
await delay(200);
const iosFirst = await page.$eval(".install-steps li", (el) => el.textContent || "");
check("iOS tab shows Safari steps", /Safari/.test(iosFirst), iosFirst.slice(0, 80));
await page.screenshot({ path: path.join(OUT, "pwa-dialog-ios.png") });
await page.keyboard.press("Escape");
await delay(200);
check("escape closes dialog", (await page.$('[role="dialog"]')) === null);

// Real installability signal (informational: headless heuristics may differ)
const bipFired = await page.evaluate(() => window.__bipFired === true);
console.log("INFO real beforeinstallprompt fired:", bipFired);

// Install-now path: fake beforeinstallprompt to prove the header button triggers it
await page.evaluate(() => {
  const fake = new Event("beforeinstallprompt");
  fake.prompt = async () => {
    window.__promptCalled = true;
  };
  fake.userChoice = Promise.resolve({ outcome: "dismissed" });
  window.dispatchEvent(fake);
});
await delay(200);
await clickHeaderInstall(page);
const prompted = await page.evaluate(() => window.__promptCalled === true);
check("header button triggers browser install prompt when available", prompted);
check("prompt path does not open dialog", (await page.$('[role="dialog"]')) === null);

// iPhone emulation: dialog defaults to iOS tab
const mob = await browser.newPage();
await mob.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
await mob.goto(BASE, { waitUntil: "networkidle0" });
await openInstall(mob);
const mobTab = await mob.$eval('[role="dialog"] [role="tab"][aria-selected="true"]', (el) => el.textContent || "");
check("iPhone defaults to iOS tab", /iPhone/.test(mobTab), mobTab);
await mob.screenshot({ path: path.join(OUT, "pwa-dialog-iphone.png") });
const mobOverflow = await mob.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}));
check("dialog causes no overflow on iPhone", mobOverflow.scroll <= mobOverflow.client + 1, `${mobOverflow.scroll}/${mobOverflow.client}`);

fs.writeFileSync(path.join(OUT, "results.txt"), `${log.join("\n")}\n`);
console.log(`\n${log.join("\n")}`);
await browser.close();
if (log.some((line) => line.startsWith("FAIL"))) process.exit(1);
