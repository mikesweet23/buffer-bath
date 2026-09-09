import {
  APPLICATIONS,
  CONSTRUCTIONS,
  format,
  formatDuration,
  type Inputs,
  type PlannerResult,
} from "./calc";

function row(label: string, value: string) {
  return `<tr><th>${label}</th><td>${value}</td></tr>`;
}

function section(title: string, body: string) {
  return `<section><h2>${title}</h2>${body}</section>`;
}

export function buildReportHtml(input: Inputs, result: PlannerResult) {
  const application = APPLICATIONS[input.application];
  const construction = CONSTRUCTIONS.find((item) => item.id === input.construction);
  const processWord = result.isCooling ? "Cool-down" : "Heat-up";
  const generated = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const reference = input.projectReference.trim() || "Unreferenced";
  const fluidNote = input.fluidOverridden
    ? "User-overridden density and specific heat"
    : input.application === "tank" && input.fluidLocation === "circuit-only"
      ? `Separated: Pure water bath, ${format(input.glycolPercent, 0)}% vol aqueous Ethylene Glycol primary circuit`
      : `${format(input.glycolPercent, 0)}% vol aqueous Ethylene Glycol (DOWTHERM SR-1)`;
  const flowNote = input.flowOverridden
    ? "Overridden (flow-limited duty)"
    : input.recoveryMode === "required"
      ? "Sized automatically to meet recovery time"
      : "Calculated from kW and ΔT";
  const lossNote = input.lossOverrideEnabled
    ? `Overridden insulation loss ${format(input.lossOverrideKw, 2)} kW at target`
    : "Calculated from U-values";

  const dutyBlock =
    input.recoveryMode === "required"
      ? `<table>${row("Sizing mode", "Size the kW")}
        ${row("Target recovery time", `${format(input.desiredMinutes, 0)} min`)}
        ${row("Required duty (unconstrained)", `${format(result.unconstrainedDuty, 1)} kW`)}
        ${row("Usable duty", `${format(result.duty, 1)} kW ${input.flowOverridden ? "(flow-limited)" : ""}`)}
        ${row("Effective duty at start", `${format(result.effectiveDutyAtStart, 1)} kW`)}
        ${row("Effective duty at target", `${format(result.effectiveDutyAtTarget, 1)} kW ${result.approachLimitedAtTarget ? "(approach-limited)" : ""}`)}
        ${row("Design ΔT", `${format(input.designDeltaT, 2)} K`)}
        ${row("Flow / circulation", `${format(result.circulationM3h, 2)} m³/h · ${format(result.circulationM3h / 3.6, 2)} l/s`)}
        ${row("Flow status", flowNote)}
        ${row("Duty ÷ flow ΔT", `${format(result.flowTemperatureChange, 2)} K`)}</table>`
      : `<table>${row("Entered duty", `${format(result.enteredDuty, 1)} kW`)}
        ${row("Usable duty", `${format(result.duty, 1)} kW ${input.flowOverridden ? "(flow-limited)" : ""}`)}
        ${row("Effective duty at start", `${format(result.effectiveDutyAtStart, 1)} kW`)}
        ${row("Effective duty at target", `${format(result.effectiveDutyAtTarget, 1)} kW ${result.approachLimitedAtTarget ? "(approach-limited)" : ""}`)}
        ${row("Design ΔT", `${format(input.designDeltaT, 2)} K`)}
        ${row("Flow / circulation", `${format(result.circulationM3h, 2)} m³/h · ${format(result.circulationM3h / 3.6, 2)} l/s`)}
        ${row("Flow status", flowNote)}
        ${row("Duty ÷ flow ΔT", `${format(result.flowTemperatureChange, 2)} K`)}</table>`;

  const warningSection =
    result.limitReason || (result.fluidModel.warnings && result.fluidModel.warnings.length > 0)
      ? section(
          "Warnings & Operating Limits",
          `<div style="background: #FFF4E5; border: 1px solid #FFE0B2; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; color: #8F4700;">
            ${result.limitReason ? `<p style="margin: 0 0 6px;"><strong>Restriction:</strong> ${result.limitReason}</p>` : ""}
            ${
              result.fluidModel.warnings && result.fluidModel.warnings.length > 0
                ? result.fluidModel.warnings
                    .map((w) => `<p style="margin: 0 0 4px;"><strong>Property notice:</strong> ${w}</p>`)
                    .join("")
                : ""
            }
          </div>`,
        )
      : "";

  const geometry =
    input.application === "tank"
      ? `<table>${
          input.shape === "rectangular"
            ? row("Length", `${format(input.length, 2)} m`) +
              row("Width", `${format(input.width, 2)} m`) +
              row("Liquid depth", `${format(input.depth, 2)} m`)
            : row("Diameter", `${format(input.diameter, 2)} m`) +
              row("Liquid depth", `${format(input.depth, 2)} m`)
        }${row("Working volume", `${format(result.volumeLitres, 0)} L`)}
        ${row("Top area", `${format(result.topArea, 2)} m²`)}
        ${row("Side area", `${format(result.sideArea, 2)} m²`)}
        ${row("Base area", `${format(result.baseArea, 2)} m²`)}</table>`
      : `<table>${row("Circuit volume", `${format(result.volumeLitres, 0)} L`)}
        ${row("Fluid mass", `${format(result.fluidMass, 0)} kg`)}
        ${row("Heat capacity", `${format(result.thermalCapacity, 0)} kJ/K`)}</table>`;

  const constructionBlock =
    input.application === "tank"
      ? section(
          "Construction",
          `<table>${row("Construction", construction?.label ?? "Not selected")}
          ${row("Wall U-value", `${format(input.wallU, 2)} W/m²K`)}
          ${row("Base exposed", input.baseExposed ? "Yes" : "No")}
          ${row("Tank top", input.topType.replace("-", " "))}
          ${row("Ambient", `${format(input.ambient, 1)} °C`)}</table>`,
        )
      : "";

  const pipework = input.includePipework
    ? row("Insulated pipework", `${format(input.pipeLength ?? 0, 1)} m × Ø ${format(input.pipeDiameterMm ?? 0, 1)} mm, U ${format(input.pipeU ?? 0, 2)} W/m²K`) +
      row("Pipework loss at target", `${format(result.selectedBreakdown.pipework, 2)} kW`)
    : "";

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>Buffer &amp; Bath report · ${reference}</title>
  <style>
    :root {
      --ground: #08131F;
      --panel: #0E1E2E;
      --brand: #2E90FF;
      --ink: #0E1E2E;
      --muted: #4A6780;
      --line: #D4E3F0;
      --paper: #F4F8FC;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: white;
      font: 13px/1.45 "Geist", "IBM Plex Sans", Arial, sans-serif;
    }
    .hero {
      background: linear-gradient(135deg, #08131F, #0E1E2E 62%, #123A66);
      color: #E6EEF6;
      padding: 28px 32px 24px;
    }
    .hero p { margin: 0 0 6px; color: #9BB6D0; letter-spacing: .12em; text-transform: uppercase; font-size: 11px; }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.04em; }
    .hero strong { color: #5FC8F5; }
    main { padding: 24px 32px 40px; }
    section { margin: 0 0 22px; break-inside: avoid; }
    h2 { margin: 0 0 10px; font-size: 15px; color: #1A6FD4; letter-spacing: .04em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 7px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { width: 42%; color: var(--muted); font-weight: 600; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .metric { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
    .metric span { display: block; color: var(--muted); font-size: 11px; }
    .metric b { display: block; margin-top: 4px; font-size: 20px; }
    footer { color: var(--muted); font-size: 11px; }
    @media print { .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header class="hero">
    <p>HVAC engineering report</p>
    <h1>Buffer and Bath Heat Planner</h1>
    <div>Project reference: <strong>${reference}</strong></div>
    <div>${application.label} · ${generated}</div>
  </header>
  <main>
    ${warningSection}
    ${section("Application", `<table>${row("Mode", application.label)}${row("Action", application.action)}${row("Temperatures", `${format(input.startTemperature, 1)} °C → ${format(input.finishTemperature, 1)} °C`)}</table>`)}
    ${section("Volume and size", geometry)}
    ${constructionBlock}
    ${section("Duty, flow and circulation", dutyBlock)}
    ${section(
      `${processWord} times`,
      `<div class="metrics">
        <div class="metric"><span>${processWord} with losses</span><b>${formatDuration(result.recoveryMinutes)}</b></div>
        <div class="metric"><span>${processWord} with no losses</span><b>${formatDuration(result.noLossMinutes)}</b></div>
        <div class="metric"><span>${result.isCooling ? "Standing gain" : "Hold / standing loss"}</span><b>${format(result.selectedBreakdown.total, 2)} kW</b></div>
        <div class="metric"><span>${result.isCooling ? "Cooling" : "Heating"} energy</span><b>${format(result.sensibleEnergyKWh, 1)} kWh</b></div>
      </div>`,
    )}
    ${section(
      "Losses and fluid",
      `<table>${row("Insulation losses", lossNote)}
      ${row("Calculated surface losses", `${format(result.selectedBreakdown.calculatedSurface, 2)} kW`)}
      ${pipework}
      ${row("Fluid model", fluidNote)}
      ${
        input.application === "tank" && input.fluidLocation === "circuit-only"
          ? row("Bath fluid (water)", `${format(result.density, 1)} kg/m³, ${format(result.specificHeat, 3)} kJ/kg·K`) +
            row("Circuit fluid (EG)", `${format(result.circuitDensity, 1)} kg/m³, ${format(result.circuitSpecificHeat, 3)} kJ/kg·K`)
          : row("Density", `${format(result.density, 1)} kg/m³`) +
            row("Specific heat", `${format(result.specificHeat, 3)} kJ/kg·K`)
      }</table>`,
    )}
    <footer>
      Indicative engineering calculation. Enter the duty available at actual glycol concentration, operating temperatures and achievable flow. The calculator does not automatically predict pump flow reduction, pressure drop, fouling or exchanger performance changes caused by glycol. Evaporation calculation assumes clean water unless an adjustment factor is supplied. Verify final exchanger selection, materials, fouling allowance and pressure drop with the manufacturer.
    </footer>
  </main>
</body>
</html>`;
}

export function openReportPrint(input: Inputs, result: PlannerResult) {
  const html = buildReportHtml(input, result);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) {
    document.body.removeChild(frame);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) document.body.removeChild(frame);
    }, 500);
  };
  win.addEventListener("afterprint", cleanup);
  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
  };
  win.addEventListener("load", trigger);
  window.setTimeout(trigger, 120);
}
