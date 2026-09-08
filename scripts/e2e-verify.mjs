import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slow = process.env.E2E_HEADLESS === "1" ? 0 : 700;
const OUT = process.env.E2E_OUT || "/tmp/bb-e2e";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: process.env.E2E_HEADLESS === "1",
  protocolTimeout: 120000,
  defaultViewport: { width: 1400, height: 900 },
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1400,900", "--window-position=0,0"],
});

const page = await browser.newPage();
await page.goto(process.env.E2E_URL || "http://127.0.0.1:4173/", { waitUntil: "networkidle0" });
await delay(slow);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await delay(slow);

async function fillNumber(label, value) {
  const selector = `input[aria-label="${label}"]`;
  await page.click(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.type(selector, String(value), { delay: 40 });
}

async function shot(name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function textOf(selector) {
  return page.$eval(selector, (el) => el.textContent?.replace(/\s+/g, " ").trim() || "");
}

const log = [];
function check(name, ok, extra = "") {
  log.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  console.log(ok ? "PASS" : "FAIL", name, extra);
}

await page.waitForSelector(".result-panel");
const gated = await textOf(".result-panel");
check("gated until construction", /Select construction/i.test(gated), gated.slice(0, 120));
await shot("01-gated-before-construction");
await delay(slow);

await page.select("select", "twin-50");
await delay(slow);
await page.waitForFunction(() => !document.querySelector(".gated-panel"));
const live = await textOf(".result-panel");
check("results after construction", /with losses/i.test(live) && !/Select construction/i.test(live), live.slice(0, 140));
await shot("02-results-after-construction");
await delay(slow);

await fillNumber("Duty kW", 80);
await fillNumber("Design ΔT K", 10);
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("small")).some((el) => /Calculated [\d.]+ m³\/h/.test(el.textContent || "")),
);
const calcHint = await page.evaluate(
  () =>
    Array.from(document.querySelectorAll("small"))
      .map((el) => el.textContent || "")
      .find((t) => t.includes("Calculated") && t.includes("m³/h")) || "",
);
check("flow calculated from kW and ΔT", /Calculated [\d.]+ m³\/h/.test(calcHint), calcHint);

await page.click("button.text-button");
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll(".value-badge")).some((el) => el.textContent?.includes("Overridden")),
);
await fillNumber("Flow / circulation m³/h", 4);
await page.waitForFunction(() => Boolean(document.querySelector(".flow-warning")));
const limited = await page.evaluate(() => {
  const usable = Array.from(document.querySelectorAll(".flow-summary div"))
    .find((el) => el.textContent?.includes("Usable duty"))
    ?.querySelector("b")?.textContent;
  const warning = document.querySelector(".flow-warning")?.textContent || "";
  return { usable, warning };
});
check(
  "override flow limits kW",
  /flow-limited/i.test(limited.usable || "") && (/limited to/i.test(limited.warning) || /limits/i.test(limited.warning)),
  limited.usable || "",
);
await shot("03-flow-override-limits-kw");
await delay(slow);

await page.evaluate(() => document.querySelector("details.assumptions")?.setAttribute("open", ""));
const cpBefore = await page.$eval('input[aria-label*="Specific heat"]', (el) => el.value);
await page.$eval(
  'input[aria-label*="Ethylene glycol volume percent"], input[type="range"]',
  (el, value) => {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto.set.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  },
  30,
);
await page.waitForFunction((prev) => {
  const cp = document.querySelector('input[aria-label*="Specific heat"]');
  return cp && cp.value !== prev;
}, {}, cpBefore);
const cpAfter = await page.$eval('input[aria-label*="Specific heat"]', (el) => el.value);
check("glycol 30% lowers Cp", Number(cpAfter) < Number(cpBefore) && Number(cpAfter) < 4.0, `${cpBefore} -> ${cpAfter}`);
await shot("04-glycol-30-percent");
await delay(slow);

const withLosses = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".heatup-pair div")).map((el) => el.textContent || ""),
);
check(
  "heat-up with and without losses shown",
  withLosses.length >= 2 && withLosses.some((t) => /With losses/i.test(t)),
  withLosses.join(" | "),
);

await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll("label.toggle-row"));
  const row = rows.find((el) => /Override insulation losses/i.test(el.textContent || ""));
  row?.querySelector("input[type=checkbox]")?.click();
});
await page.waitForSelector('input[aria-label="Insulation loss at target kW"]');
await fillNumber("Insulation loss at target kW", 25);
await page.waitForFunction(() => (document.querySelector(".override-note")?.textContent || "").includes("overridden"));
check("insulation losses overridable", true);
await shot("05-loss-override");
await delay(slow);

await page.click('input[placeholder="e.g. 2451 / Pool plant"]', { clickCount: 3 });
await page.type('input[placeholder="e.g. 2451 / Pool plant"]', "2451-TEST / Spa buffer");
const project = await page.$eval('input[placeholder="e.g. 2451 / Pool plant"]', (el) => el.value);
check("project reference set", project.includes("2451-TEST"), project);
await shot("06-project-reference");
await delay(slow);

const pdfEnabled = await page.$eval("button.reset-button", (el) => !el.disabled);
check("PDF export enabled after construction", pdfEnabled);
await page.evaluate(() => {
  window.print = () => {};
  const watch = () => {
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        if (frame.contentWindow) frame.contentWindow.print = () => {};
      } catch {
        // Cross-origin is unexpected for a blob-less iframe.
      }
    });
  };
  new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
});
await page.click("button.reset-button");
await page.waitForFunction(() => document.querySelector("iframe"), { timeout: 5000 }).catch(() => null);
await delay(400);
const reportHtml = await page.evaluate(() => {
  const frame = document.querySelector("iframe");
  return frame?.contentDocument?.documentElement?.outerHTML || "";
});
if (reportHtml) {
  check(
    "PDF report contains project reference",
    /2451-TEST/.test(reportHtml) && /Buffer and Bath/i.test(reportHtml),
    `html length ${reportHtml.length}`,
  );
  check("PDF report uses enthalpy blue", /#2E90FF|#08131F/.test(reportHtml));
} else {
  check("PDF report iframe created", false, "iframe not readable after print stub");
}

await page.click("button.application-choice:nth-of-type(2)");
await page.waitForFunction(
  () => document.body.innerText.includes("LPHW CIRCUIT") || document.body.innerText.includes("Closed circuit volume"),
);
const lphw = await textOf(".application-badge");
check("LPHW primary mode", /Heating/i.test(lphw), lphw);
await shot("07-lphw-primary");
await delay(slow);

await page.click("button.application-choice:nth-of-type(3)");
await page.waitForFunction(() => /CHILLED CIRCUIT|Chilled primary/i.test(document.body.innerText));
const body = await page.evaluate(() => document.body.innerText);
check("CHW primary mode", /Chilled primary|CHILLED CIRCUIT|cool-down/i.test(body), "chilled visible");
await shot("08-chw-primary");
await delay(slow);

await page.click("button.application-choice:nth-of-type(1)");
await page.waitForFunction(() => document.body.innerText.includes("Buffer / bath"));
await shot("09-buffer-final");

fs.writeFileSync(path.join(OUT, "results.txt"), `${log.join("\n")}\n`);
console.log(`\n${log.join("\n")}`);
await browser.close();
if (log.some((line) => line.startsWith("FAIL"))) process.exit(1);
