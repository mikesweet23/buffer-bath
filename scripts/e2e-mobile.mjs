import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const OUT = process.env.E2E_OUT || "/tmp/bb-e2e-mobile";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  protocolTimeout: 120000,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
await page.goto(process.env.E2E_URL || "http://127.0.0.1:4173/", { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });

const log = [];
function check(name, ok, extra = "") {
  log.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  console.log(ok ? "PASS" : "FAIL", name, extra);
}

async function shot(name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function noOverflow(name) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scroll: doc.scrollWidth, client: doc.clientWidth };
  });
  check(`${name} — no horizontal overflow`, overflow.scroll <= overflow.client + 1, `${overflow.scroll}/${overflow.client}`);
}

async function tap(selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.evaluate(
    (sel) => document.querySelector(sel)?.scrollIntoView({ block: "center", behavior: "instant" }),
    selector,
  );
  await delay(350);
  await page.tap(selector);
  await delay(250);
}

async function inputValue(ariaLabel) {
  return page.$eval(`input[aria-label="${ariaLabel}"]`, (el) => el.value);
}

await page.waitForSelector(".result-panel");
check("gated until construction", /Select construction/i.test(await page.$eval(".result-panel", (el) => el.textContent || "")));
await noOverflow("initial");
await shot("m-01-top");

await page.select("select", "twin-50");
await page.waitForFunction(() => !document.querySelector(".gated-panel"));

// Temperatures section: steppers adjust values
await tap('button[aria-label="Increase Start temperature"]');
check("start temp stepper +1", (await inputValue("Start temperature °C")) === "17", await inputValue("Start temperature °C"));
await tap('button[aria-label="Decrease Desired temperature"]');
check("desired temp stepper -1", (await inputValue("Desired temperature °C")) === "59", await inputValue("Desired temperature °C"));
await tap('button[aria-label="Increase Primary flow temperature"]');
check("primary temp stepper +1", (await inputValue("Primary flow temperature °C")) === "81", await inputValue("Primary flow temperature °C"));
await tap('button[aria-label="Increase Minimum approach"]');
check("approach stepper +0.5", (await inputValue("Minimum approach K")) === "3.5", await inputValue("Minimum approach K"));
await page.evaluate(() => document.querySelector("#temperatures")?.scrollIntoView());
await delay(200);
await shot("m-02-temperatures");

// Recovery: design delta-T stepper + edit-temperatures link
await tap('button[aria-label="Increase Design ΔT"]');
check("design dT stepper +0.5", (await inputValue("Design ΔT K")) === "10.5", await inputValue("Design ΔT K"));
const hasTempsLink = await page.evaluate(() => !!document.querySelector('.primary-summary a[href="#temperatures"]'));
check("recovery links back to temperatures", hasTempsLink);
await page.evaluate(() => document.querySelector(".recovery-panel")?.scrollIntoView());
await delay(200);
await shot("m-03-recovery");

// Evaporation adjustment lives in losses now
const evapInLosses = await page.evaluate(() => {
  const input = document.querySelector('input[aria-label="Evaporation adjustment %"]');
  return !!input?.closest(".section-panel")?.querySelector(".scenario-grid, .closed-summary, .loss-bars");
});
check("evaporation adjustment inside losses section", evapInLosses);

// Glycol steppers in advanced assumptions
await page.evaluate(() => document.querySelector("details.assumptions")?.setAttribute("open", ""));
await tap('button[aria-label="Increase glycol percent"]');
const glycolReadout = await page.$eval(".glycol-readout", (el) => el.textContent || "");
check("glycol stepper to 1%", /1%/.test(glycolReadout), glycolReadout);
await page.evaluate(() => document.querySelector("details.assumptions")?.scrollIntoView());
await delay(200);
await shot("m-04-advanced-glycol");

// Flow override + stepper on phone
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button.text-button")).find((el) =>
    /Override flow/i.test(el.textContent || ""),
  );
  btn?.scrollIntoView({ block: "center" });
  btn?.click();
});
await delay(300);
await tap('button[aria-label="Increase Flow / circulation"]');
const flowVal = await inputValue("Flow / circulation m³/h");
check("flow stepper adjusts overridden flow", Number(flowVal) > 0, flowVal);

// Long unreachable-target string must not overflow
await page.evaluate(() => {
  const trough = document.querySelector('input[aria-label="Duty kW"]');
  if (trough) {
    trough.focus();
    trough.select();
    document.execCommand("selectAll", false, "");
  }
});
await page.click('input[aria-label="Duty kW"]', { clickCount: 3 });
await page.keyboard.press("Backspace");
await page.type('input[aria-label="Duty kW"]', "1");
await delay(400);
await noOverflow("after interactions");
await shot("m-05-low-duty");

fs.writeFileSync(path.join(OUT, "results.txt"), `${log.join("\n")}\n`);
console.log(`\n${log.join("\n")}`);
await browser.close();
if (log.some((line) => line.startsWith("FAIL"))) process.exit(1);
