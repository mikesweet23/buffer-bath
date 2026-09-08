"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AIR_CASES,
  APPLICATIONS,
  CONSTRUCTIONS,
  DEFAULTS,
  LEGACY_CONSTRUCTIONS,
  TOP_TYPES,
  computePlanner,
  format,
  formatDuration,
  glycolMixProperties,
  roundTo,
  type AirCase,
  type Application,
  type Inputs,
  type PlannerResult,
} from "./calc";
import { openReportPrint } from "./report";

function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  hint,
  labelAction,
  readOnly,
  badge,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  labelAction?: ReactNode;
  readOnly?: boolean;
  badge?: string;
}) {
  return (
    <div className={`field ${readOnly ? "is-calculated" : ""}`}>
      <span className="field-label-row">
        <span className="field-label">
          {label}
          {badge ? <em className="value-badge">{badge}</em> : null}
        </span>
        {labelAction}
      </span>
      <label className={`input-wrap ${readOnly ? "readonly" : ""}`}>
        <input
          type="number"
          inputMode="decimal"
          aria-label={`${label} ${unit}`}
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          readOnly={readOnly}
          onChange={(event) =>
            onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
          }
          onWheel={(event) => event.currentTarget.blur()}
        />
        <span>{unit}</span>
      </label>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function TankDrawing({
  input,
  volumeLitres,
}: {
  input: Inputs;
  volumeLitres: number;
}) {
  const isOpen = input.topType === "open";
  if (input.shape === "cylindrical") {
    return (
      <div className="tank-visual">
        <svg viewBox="0 0 360 245" role="img" aria-label="Vertical cylindrical tank diagram">
          <defs>
            <linearGradient id="cyl-body" x1="0" x2="1">
              <stop offset="0" stopColor="#d7e4f0" />
              <stop offset=".46" stopColor="#ffffff" />
              <stop offset="1" stopColor="#9bb4c8" />
            </linearGradient>
            <linearGradient id="water-cyl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5FC8F5" stopOpacity=".82" />
              <stop offset="1" stopColor="#2E90FF" stopOpacity=".94" />
            </linearGradient>
          </defs>
          <path d="M92 56v122c0 23 35 42 88 42s88-19 88-42V56" fill="url(#cyl-body)" stroke="#08131F" strokeWidth="3" />
          <path d="M92 91v87c0 23 35 42 88 42s88-19 88-42V91c-25 15-150 15-176 0Z" fill="url(#water-cyl)" opacity=".82" />
          <ellipse cx="180" cy="56" rx="88" ry="31" fill={isOpen ? "#5FC8F5" : "#d6e3ee"} stroke="#08131F" strokeWidth="3" />
          {isOpen ? <ellipse cx="180" cy="56" rx="73" ry="23" fill="#c8e8ff" opacity=".7" /> : null}
          {!isOpen ? <path d="M103 51c35-22 120-22 154 0" fill="none" stroke="#7E97AE" strokeWidth="2" /> : null}
          <path d="M70 55v165M60 55h20M60 220h20" stroke="#7E97AE" strokeWidth="2" />
          <text x="54" y="142" textAnchor="middle" transform="rotate(-90 54 142)" className="svg-label">
            {format(input.depth, 2)} m liquid depth
          </text>
          <path d="M92 232h176M92 226v12M268 226v12" stroke="#7E97AE" strokeWidth="2" />
          <text x="180" y="244" textAnchor="middle" className="svg-label">
            Ø {format(input.diameter, 2)} m
          </text>
        </svg>
        <div className="visual-volume">
          <span>{format(volumeLitres, 0)}</span>
          <small>litres working volume</small>
        </div>
      </div>
    );
  }

  return (
    <div className="tank-visual">
      <svg viewBox="0 0 380 250" role="img" aria-label="Rectangular tank diagram">
        <defs>
          <linearGradient id="tank-front" x1="0" x2="1">
            <stop offset="0" stopColor="#b7c8d8" />
            <stop offset=".52" stopColor="#f7fbfd" />
            <stop offset="1" stopColor="#9bb0c2" />
          </linearGradient>
          <linearGradient id="tank-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5FC8F5" />
            <stop offset="1" stopColor="#1A6FD4" />
          </linearGradient>
        </defs>
        <path d="M75 69 238 33 310 68 145 105Z" fill={isOpen ? "#c8e8ff" : "#d6e3ee"} stroke="#08131F" strokeWidth="3" />
        {isOpen ? <path d="m89 71 148-31 58 28-149 31Z" fill="#5FC8F5" opacity=".74" /> : null}
        <path d="m75 69 70 36v115L75 182Z" fill="#9bb0c2" stroke="#08131F" strokeWidth="3" />
        <path d="m145 105 165-37v112l-165 40Z" fill="url(#tank-front)" stroke="#08131F" strokeWidth="3" />
        <path d="M145 137 310 101v79l-165 40Z" fill="url(#tank-water)" opacity=".86" />
        <path d="m75 105 70 32 165-36" fill="none" stroke="#1A6FD4" strokeWidth="2" opacity=".65" />
        <path d="M53 69v113M44 69h18M44 182h18" stroke="#7E97AE" strokeWidth="2" />
        <text x="36" y="129" textAnchor="middle" transform="rotate(-90 36 129)" className="svg-label">
          D {format(input.depth, 2)} m
        </text>
        <path d="m146 235 164-40M143 226l5 17M308 187l5 17" stroke="#7E97AE" strokeWidth="2" />
        <text x="232" y="228" textAnchor="middle" transform="rotate(-14 232 228)" className="svg-label">
          L {format(input.length, 2)} m
        </text>
        <path d="m78 201 64 32M74 209l8-16M138 241l8-16" stroke="#7E97AE" strokeWidth="2" />
        <text x="105" y="230" textAnchor="middle" transform="rotate(27 105 230)" className="svg-label">
          W {format(input.width, 2)} m
        </text>
      </svg>
      <div className="visual-volume">
        <span>{format(volumeLitres, 0)}</span>
        <small>litres working volume</small>
      </div>
    </div>
  );
}

function CircuitDrawing({
  application,
  volumeLitres,
}: {
  application: Exclude<Application, "tank">;
  volumeLitres: number;
}) {
  const cooling = application === "chw";
  return (
    <div className={`tank-visual circuit-visual ${cooling ? "cooling" : "heating"}`}>
      <svg viewBox="0 0 380 250" role="img" aria-label={`${cooling ? "Chilled" : "LPHW"} closed circuit diagram`}>
        <defs>
          <linearGradient id="circuit-plant" x1="0" x2="1">
            <stop offset="0" stopColor={cooling ? "#dff5ff" : "#fff0e4"} />
            <stop offset="1" stopColor={cooling ? "#8bd7ef" : "#f3a469"} />
          </linearGradient>
        </defs>
        <rect x="125" y="76" width="130" height="98" rx="18" fill="url(#circuit-plant)" stroke="#08131F" strokeWidth="3" />
        <text x="190" y="112" textAnchor="middle" className="svg-label circuit-title">
          {cooling ? "CHILLED CIRCUIT" : "LPHW CIRCUIT"}
        </text>
        <text x="190" y="143" textAnchor="middle" className="circuit-volume">
          {format(volumeLitres, 0)} L
        </text>
        <path d="M125 98H73c-28 0-42 18-42 46s14 46 42 46h234c28 0 42-18 42-46s-14-46-42-46h-52" fill="none" stroke={cooling ? "#1789ac" : "#d56b33"} strokeWidth="10" strokeLinecap="round" />
        <path d="m305 89 15 9-15 9M75 181l-15 9 15 9" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="190" cy="48" r="22" fill="#fff" stroke="#08131F" strokeWidth="3" />
        <path d="M190 70v16" stroke="#08131F" strokeWidth="3" />
        <text x="190" y="55" textAnchor="middle" className="circuit-symbol">
          {cooling ? "❄" : "↟"}
        </text>
        <text x="190" y="226" textAnchor="middle" className="svg-label">
          Total water volume in plant, pipework and vessels
        </text>
      </svg>
      <div className="visual-volume">
        <span>{format(volumeLitres, 0)}</span>
        <small>litres total circuit volume</small>
      </div>
    </div>
  );
}

function ResultPanel({
  input,
  result,
  processWord,
  energyWord,
  applicationLabel,
}: {
  input: Inputs;
  result: PlannerResult;
  processWord: string;
  energyWord: string;
  applicationLabel: string;
}) {
  if (!result.resultsReady) {
    return (
      <aside className="panel result-panel gated-panel" aria-live="polite">
        <p className="section-kicker">Live result</p>
        <div className="result-lead">
          <span>Waiting for construction</span>
          <strong>Select construction</strong>
          <small>Size the tank first, then choose wall construction. Live duty, flow and heat-up times appear after that step.</small>
        </div>
        <div className="result-note">
          <span className="pulse-dot" />
          Geometry is available; recovery is gated until construction is chosen.
        </div>
      </aside>
    );
  }

  const impossible = !Number.isFinite(result.recoveryMinutes);
  const selectedCase = AIR_CASES[input.airCase];
  return (
    <aside className={`panel result-panel ${impossible ? "warning-panel" : ""}`}>
      <p className="section-kicker">Live result</p>
      <div className="result-lead">
        <span>{input.recoveryMode === "available" ? `${processWord} with losses` : "Required duty"}</span>
        <strong>
          {input.recoveryMode === "available"
            ? formatDuration(result.recoveryMinutes)
            : `${format(result.duty, 1)} kW`}
        </strong>
        <small>
          {input.startTemperature}°C to {input.finishTemperature}°C ·{" "}
          {input.application === "tank"
            ? input.topType === "open"
              ? selectedCase.label.toLowerCase()
              : "closed top"
            : applicationLabel.toLowerCase()}
        </small>
      </div>
      {impossible || result.targetFlowLimited ? (
        <div className="warning-message">
          {result.flowLimited
            ? "The entered or calculated flow cannot carry the full duty under the selected temperature limit."
            : "Available duty is overcome by the selected standing or continuous load."}
        </div>
      ) : null}
      <div className="metric-grid">
        <div>
          <span>{processWord} with no losses</span>
          <b>{formatDuration(result.noLossMinutes)}</b>
        </div>
        <div>
          <span>{input.application === "tank" ? (result.isCooling ? "Standing gain" : "Hold duty") : "Continuous load"}</span>
          <b>{format(result.selectedBreakdown.total, 1)} kW</b>
        </div>
        <div>
          <span>Usable duty</span>
          <b>{format(result.duty, 1)} kW</b>
        </div>
        <div>
          <span>{energyWord} energy</span>
          <b>{format(result.sensibleEnergyKWh, 1)} kWh</b>
        </div>
        <div>
          <span>Flow / circulation</span>
          <b>{format(result.circulationM3h, 1)} m³/h</b>
        </div>
        <div>
          <span>Duty ÷ flow ΔT</span>
          <b>{format(result.flowTemperatureChange, 2)} K</b>
        </div>
      </div>
      <div className="result-note">
        <span className="pulse-dot" />
        {input.flowOverridden
          ? "Flow overridden — usable kW is limited by mass flow × Cp × ΔT."
          : input.application === "tank"
            ? "Includes temperature-dependent losses and flow limits"
            : "Closed circuit volume with duty and flow limits"}
      </div>
    </aside>
  );
}

function hydrateInputs(parsed: Partial<Inputs> & { maxCircuitDeltaT?: number }): Inputs {
  const stored = { ...DEFAULTS, ...parsed };
  stored.construction = LEGACY_CONSTRUCTIONS[stored.construction] ?? stored.construction;
  if (parsed.construction === undefined) {
    stored.construction = "";
  }
  if (typeof stored.designDeltaT !== "number" || !Number.isFinite(stored.designDeltaT)) {
    stored.designDeltaT =
      stored.application === "chw" ? 6 : stored.application === "lphw" ? 20 : 10;
  }
  if (
    parsed.designDeltaT === undefined &&
    typeof parsed.maxCircuitDeltaT === "number" &&
    Number.isFinite(parsed.maxCircuitDeltaT)
  ) {
    stored.designDeltaT = parsed.maxCircuitDeltaT;
  }
  return stored;
}

export default function Home() {
  const [input, setInput] = useState<Inputs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let storedInput: Inputs | null = null;
    try {
      const stored = window.localStorage.getItem("bath-loss-calculator-v2");
      const legacy = stored ?? window.localStorage.getItem("bath-loss-calculator-v1");
      if (legacy) {
        storedInput = hydrateInputs(JSON.parse(legacy) as Partial<Inputs>);
      }
    } catch {
      // Device storage is optional.
    }
    queueMicrotask(() => {
      if (storedInput) setInput(storedInput);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("bath-loss-calculator-v2", JSON.stringify(input));
  }, [input, loaded]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    }
  }, []);

  const patch = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const result = useMemo(() => computePlanner(input), [input]);
  const selectedConstruction = CONSTRUCTIONS.find((item) => item.id === input.construction);
  const application = APPLICATIONS[input.application];
  const processWord = result.isCooling ? "cool-down" : "heat-up";
  const energyWord = result.isCooling ? "Cooling" : "Heating";
  const dutyLabel =
    input.application === "tank"
      ? "Duty"
      : result.isCooling
        ? "Cooling duty"
        : "Heating duty";
  const meanTemperature = (safeTemp(input.startTemperature) + safeTemp(input.finishTemperature)) / 2;
  const glycol = glycolMixProperties(input.glycolPercent, meanTemperature);

  const selectApplication = (next: Application) => {
    setInput((current) => {
      const geometricVolume =
        current.shape === "rectangular"
          ? Math.max(0, current.length) * Math.max(0, current.width) * Math.max(0, current.depth) * 1000
          : (Math.PI * Math.max(0, current.diameter) ** 2 / 4) * Math.max(0, current.depth) * 1000;
      const knownVolume = current.measuredVolume > 0 ? current.measuredVolume : geometricVolume;
      if (next === "lphw") {
        return {
          ...current,
          application: next,
          measuredVolume: knownVolume,
          startTemperature: 20,
          finishTemperature: 80,
          designDeltaT: 20,
          sourceFlowTemperature: 80,
        };
      }
      if (next === "chw") {
        return {
          ...current,
          application: next,
          measuredVolume: knownVolume,
          startTemperature: 20,
          finishTemperature: 6,
          designDeltaT: 6,
          sourceFlowTemperature: 6,
        };
      }
      return {
        ...current,
        application: next,
        startTemperature: 16,
        finishTemperature: 60,
        designDeltaT: 10,
        sourceFlowTemperature: 80,
      };
    });
  };

  const reset = () => {
    setInput(DEFAULTS);
    window.localStorage.removeItem("bath-loss-calculator-v2");
    window.localStorage.removeItem("bath-loss-calculator-v1");
  };

  const setGlycol = (percent: number) => {
    setInput((current) => {
      const mix = glycolMixProperties(
        percent,
        (safeTemp(current.startTemperature) + safeTemp(current.finishTemperature)) / 2,
      );
      return {
        ...current,
        glycolPercent: percent,
        fluidOverridden: false,
        density: mix.density,
        specificHeat: mix.specificHeat,
      };
    });
  };

  const overrideFluid = (key: "density" | "specificHeat", value: number) => {
    setInput((current) => ({ ...current, [key]: value, fluidOverridden: true }));
  };

  const displayedFlow =
    input.flowUnit === "m3h"
      ? roundTo(result.circulationM3h, 2)
      : roundTo(result.circulationM3h / 3.6, 3);

  return (
    <main>
      <header className="app-header">
        <div className="header-inner">
          <div>
            <p className="eyebrow">HVAC &amp; process engineering tool</p>
            <h1>Buffer and Bath Heat Planner</h1>
            <p className="header-copy">
              Size buffer and bath heat-up, LPHW or chilled primary recovery, with flow from duty
              and ΔT, construction-gated losses, and a branded PDF report.
            </p>
          </div>
          <div className="header-actions">
            <label className="project-field">
              <span>Project reference</span>
              <input
                type="text"
                value={input.projectReference}
                placeholder="e.g. 2451 / Pool plant"
                onChange={(event) => patch("projectReference", event.target.value)}
              />
            </label>
            <button
              className="reset-button"
              type="button"
              onClick={() => openReportPrint(input, result)}
              disabled={!result.resultsReady}
            >
              Export PDF
            </button>
            <button className="reset-button ghost" type="button" onClick={reset}>
              Reset example
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <section className="panel application-panel" aria-label="Calculation application">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Calculation basis</p>
              <h2>What are you planning?</h2>
            </div>
            <span className="application-badge">{application.action}</span>
          </div>
          <div className="application-grid">
            {(Object.keys(APPLICATIONS) as Application[]).map((item) => (
              <button
                type="button"
                key={item}
                className={input.application === item ? "application-choice active" : "application-choice"}
                onClick={() => selectApplication(item)}
              >
                <span className="radio-dot" />
                <span>
                  <b>{APPLICATIONS[item].label}</b>
                  <small>{APPLICATIONS[item].detail}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="hero-grid" aria-label="System overview">
          <article className="panel drawing-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">1 · Volume {input.application === "tank" ? "and geometry" : ""}</p>
                <h2>{input.application === "tank" ? "Size and shape" : "Closed circuit volume"}</h2>
              </div>
              {input.application === "tank" ? (
                <div className="segmented compact" role="group" aria-label="Tank shape">
                  <button
                    type="button"
                    className={input.shape === "rectangular" ? "active" : ""}
                    onClick={() => patch("shape", "rectangular")}
                  >
                    Rectangle
                  </button>
                  <button
                    type="button"
                    className={input.shape === "cylindrical" ? "active" : ""}
                    onClick={() => patch("shape", "cylindrical")}
                  >
                    Cylinder
                  </button>
                </div>
              ) : null}
            </div>
            {input.application === "tank" ? (
              <TankDrawing input={input} volumeLitres={result.volumeLitres} />
            ) : (
              <CircuitDrawing application={input.application} volumeLitres={result.volumeLitres} />
            )}
            <div className="dimension-grid">
              {input.application === "tank" ? (
                input.shape === "rectangular" ? (
                  <>
                    <NumberField label="Length" value={input.length} onChange={(value) => patch("length", value)} unit="m" min={0} />
                    <NumberField label="Width" value={input.width} onChange={(value) => patch("width", value)} unit="m" min={0} />
                    <NumberField label="Liquid depth" value={input.depth} onChange={(value) => patch("depth", value)} unit="m" min={0} />
                  </>
                ) : (
                  <>
                    <NumberField label="Diameter" value={input.diameter} onChange={(value) => patch("diameter", value)} unit="m" min={0} />
                    <NumberField label="Liquid depth" value={input.depth} onChange={(value) => patch("depth", value)} unit="m" min={0} />
                  </>
                )
              ) : null}
              <NumberField
                label={input.application === "tank" ? "Known volume" : "Total circuit volume"}
                value={input.measuredVolume}
                onChange={(value) => patch("measuredVolume", value)}
                unit="L"
                min={0}
                step={10}
                hint={
                  input.application === "tank"
                    ? "Optional. Leave at 0 to use the drawing."
                    : "Include water in plant, pipework, headers and vessels."
                }
              />
            </div>
            {input.application === "tank" ? (
              <div className="geometry-strip">
                <span><b>{format(result.topArea, 2)} m²</b> top</span>
                <span><b>{format(result.sideArea, 2)} m²</b> sides</span>
                <span><b>{format(result.baseArea, 2)} m²</b> base</span>
              </div>
            ) : (
              <div className="geometry-strip circuit-strip">
                <span><b>{format(result.fluidMass, 0)} kg</b> fluid mass</span>
                <span><b>{format(result.thermalCapacity, 0)} kJ/K</b> heat capacity</span>
              </div>
            )}
          </article>

          <ResultPanel
            input={input}
            result={result}
            processWord={processWord}
            energyWord={energyWord}
            applicationLabel={application.label}
          />
        </section>

        {input.application === "tank" ? (
          <>
            <section className="panel section-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">2 · Construction</p>
                  <h2>Construction</h2>
                </div>
                <div className="u-badge">
                  <span>Wall U-value</span>
                  <b>{input.construction ? `${format(input.wallU, 2)} W/m²K` : "—"}</b>
                </div>
              </div>

              <div className="construction-grid">
                <div>
                  <label className="field">
                    <span className="field-label">Tank / buffer construction</span>
                    <select
                      value={input.construction}
                      onChange={(event) => {
                        const construction = CONSTRUCTIONS.find((item) => item.id === event.target.value);
                        setInput((current) => ({
                          ...current,
                          construction: event.target.value,
                          wallU: construction?.u ?? current.wallU,
                        }));
                      }}
                    >
                      <option value="">Select construction</option>
                      {CONSTRUCTIONS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <small>{selectedConstruction?.detail ?? "Live results stay hidden until a construction is chosen."}</small>
                  </label>
                  <NumberField
                    label="Wall U-value"
                    value={input.wallU}
                    onChange={(value) => {
                      setInput((current) => ({
                        ...current,
                        wallU: value,
                        construction: current.construction ? "custom" : current.construction,
                      }));
                    }}
                    unit="W/m²K"
                    step={0.1}
                    min={0}
                    hint="Use the manufacturer’s figure when available."
                  />
                  <label className="toggle-row">
                    <span>
                      <b>Base exposed</b>
                      <small>Include the tank base in transmission losses</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={input.baseExposed}
                      onChange={(event) => patch("baseExposed", event.target.checked)}
                    />
                  </label>
                </div>
                <div>
                  <span className="field-label">Tank top</span>
                  <div className="choice-list">
                    {TOP_TYPES.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={input.topType === item.id ? "choice active" : "choice"}
                        onClick={() => patch("topType", item.id)}
                      >
                        <span className="radio-dot" />
                        <span>
                          <b>{item.label}</b>
                          <small>{item.detail}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {input.topType === "closed-custom" ? (
                    <NumberField label="Cover U-value" value={input.lidU} onChange={(value) => patch("lidU", value)} unit="W/m²K" min={0} />
                  ) : null}
                </div>
              </div>
            </section>

            <section className={`panel section-panel ${result.resultsReady ? "" : "is-gated"}`}>
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">3 · Surface losses</p>
                  <h2>{input.topType === "open" ? "Open-top conditions" : "Closed tank losses"}</h2>
                </div>
                <span className="ambient-chip">{format(input.ambient, 0)}°C ambient</span>
              </div>

              {!result.resultsReady ? (
                <p className="section-intro">Open-top and insulation losses are shown after construction is selected.</p>
              ) : input.topType === "open" ? (
                <>
                  <p className="section-intro">
                    Compare all four conditions. Select the condition to use in the heat-up calculation.
                  </p>
                  <div className="scenario-grid">
                    {result.cases.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={input.airCase === item.id ? "scenario active" : "scenario"}
                        onClick={() => patch("airCase", item.id as AirCase)}
                      >
                        <span className="scenario-check">{input.airCase === item.id ? "✓" : ""}</span>
                        <span className="scenario-name">{item.label}</span>
                        <strong>{format(item.breakdown.total, 1)} <small>kW</small></strong>
                        <span className="scenario-desc">{item.description}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="closed-summary">
                  <span>Closed top transmission</span>
                  <strong>{format(result.selectedBreakdown.lid, 2)} kW</strong>
                  <p>Evaporation, direct water-surface convection and radiation are excluded.</p>
                </div>
              )}

              {result.resultsReady ? (
                <div className="loss-layout">
                  <div className="loss-bars">
                    {[
                      { label: "Walls + base", value: result.selectedBreakdown.walls, colour: "var(--navy)" },
                      { label: "Evaporation", value: result.selectedBreakdown.evaporation, colour: "var(--brand)" },
                      { label: "Convection", value: result.selectedBreakdown.convection, colour: "var(--amber)" },
                      { label: "Radiation", value: result.selectedBreakdown.radiation, colour: "var(--coral)" },
                      { label: "Closed cover", value: result.selectedBreakdown.lid, colour: "var(--cool)" },
                      { label: "Pipework", value: result.selectedBreakdown.pipework, colour: "var(--purple)" },
                      { label: "Additional process", value: result.selectedBreakdown.process, colour: "#7B8CDE" },
                    ]
                      .filter((item) => item.value > 0.001)
                      .map((item) => {
                        const width =
                          result.selectedBreakdown.calculatedSurface + result.selectedBreakdown.process > 0
                            ? Math.max(3, (item.value / (result.selectedBreakdown.calculatedSurface + result.selectedBreakdown.process)) * 100)
                            : 0;
                        return (
                          <div className="loss-row" key={item.label}>
                            <span>{item.label}</span>
                            <div><i style={{ width: `${width}%`, background: item.colour }} /></div>
                            <b>{format(item.value, 2)} kW</b>
                          </div>
                        );
                      })}
                    {result.selectedBreakdown.overridden ? (
                      <p className="override-note">Insulation losses overridden to {format(input.lossOverrideKw, 2)} kW at target temperature.</p>
                    ) : null}
                  </div>
                  <div className="temperature-inputs">
                    <NumberField label="Ambient temperature" value={input.ambient} onChange={(value) => patch("ambient", value)} unit="°C" step={1} />
                    <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
                    <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} />
                    {input.topType === "open" ? (
                      <NumberField label="Relative humidity" value={input.humidity} onChange={(value) => patch("humidity", value)} unit="%" step={5} min={0} />
                    ) : null}
                    <label className="toggle-row">
                      <span>
                        <b>Override insulation losses</b>
                        <small>Calculated {format(result.selectedBreakdown.calculatedSurface, 2)} kW at target. Leave off to use U-values.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={input.lossOverrideEnabled}
                        onChange={(event) =>
                          setInput((current) => ({
                            ...current,
                            lossOverrideEnabled: event.target.checked,
                            lossOverrideKw: event.target.checked
                              ? roundTo(result.selectedBreakdown.calculatedSurface, 2)
                              : current.lossOverrideKw,
                          }))
                        }
                      />
                    </label>
                    {input.lossOverrideEnabled ? (
                      <NumberField
                        label="Insulation loss at target"
                        value={input.lossOverrideKw}
                        onChange={(value) => patch("lossOverrideKw", value)}
                        unit="kW"
                        step={0.1}
                        min={0}
                        badge="Overridden"
                        hint="Scaled with temperature difference from ambient during heat-up."
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <section className="panel section-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">2 · Temperature change</p>
                <h2>{result.isCooling ? "Circuit cool-down" : "Circuit heat-up"}</h2>
              </div>
              <span className="ambient-chip">{application.label}</span>
            </div>
            <p className="section-intro">
              Closed circuit mode uses the total system water volume. Tank surface losses are
              excluded unless insulated pipework is included below.
            </p>
            <div className="closed-circuit-inputs">
              <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
              <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} />
              <NumberField label="Ambient temperature" value={input.ambient} onChange={(value) => patch("ambient", value)} unit="°C" step={1} hint="Used if insulated pipework losses are included." />
            </div>
          </section>
        )}

        <section className={`panel section-panel recovery-panel ${result.resultsReady ? "" : "is-gated"}`}>
          <div className="panel-heading recovery-heading">
            <div>
              <p className="section-kicker">{input.application === "tank" ? "4" : "3"} · Recovery</p>
              <h2>Duty, ΔT and circulation</h2>
            </div>
            <div className="segmented" role="group" aria-label="Recovery calculation mode">
              <button
                type="button"
                className={input.recoveryMode === "available" ? "active" : ""}
                onClick={() => patch("recoveryMode", "available")}
              >
                I know the kW
              </button>
              <button
                type="button"
                className={input.recoveryMode === "required" ? "active" : ""}
                onClick={() => patch("recoveryMode", "required")}
              >
                Size the kW
              </button>
            </div>
          </div>

          {!result.resultsReady ? (
            <p className="section-intro">Enter construction above to unlock duty, flow and heat-up times.</p>
          ) : (
            <div className="recovery-grid">
              <div className="recovery-inputs">
                {input.recoveryMode === "available" ? (
                  <NumberField
                    label={dutyLabel}
                    value={input.availableDuty}
                    onChange={(value) => patch("availableDuty", value)}
                    unit="kW"
                    step={5}
                    min={0}
                    hint="Plant or exchanger duty. Flow is calculated from this and ΔT unless overridden."
                  />
                ) : (
                  <NumberField
                    label="Desired recovery time"
                    value={input.desiredMinutes}
                    onChange={(value) => patch("desiredMinutes", value)}
                    unit="min"
                    step={5}
                    min={1}
                  />
                )}
                <NumberField
                  label="Design ΔT"
                  value={input.designDeltaT}
                  onChange={(value) => patch("designDeltaT", value)}
                  unit="K"
                  step={0.5}
                  min={0.1}
                  hint="Used with kW to calculate circulation: Q = ṁ × Cp × ΔT."
                />
                <NumberField
                  label="Flow / circulation"
                  value={displayedFlow}
                  onChange={(value) =>
                    setInput((current) => ({
                      ...current,
                      flowOverridden: true,
                      circulation: Number.isFinite(value)
                        ? current.flowUnit === "m3h"
                          ? value
                          : value * 3.6
                        : Number.NaN,
                    }))
                  }
                  unit={input.flowUnit === "m3h" ? "m³/h" : "l/s"}
                  step={0.1}
                  min={0}
                  readOnly={!input.flowOverridden}
                  badge={input.flowOverridden ? "Overridden" : "Calculated"}
                  hint={
                    input.flowOverridden
                      ? `Usable duty limited to ${format(result.duty, 1)} kW by this flow.`
                      : `Calculated ${format(result.calculatedFlowM3h, 2)} m³/h from kW and ΔT.`
                  }
                  labelAction={
                    <span className="mini-toggle" role="group" aria-label="Flow units and override">
                      <button
                        type="button"
                        className={input.flowUnit === "m3h" ? "active" : ""}
                        onClick={() => patch("flowUnit", "m3h")}
                      >
                        m³/h
                      </button>
                      <button
                        type="button"
                        className={input.flowUnit === "lps" ? "active" : ""}
                        onClick={() => patch("flowUnit", "lps")}
                      >
                        l/s
                      </button>
                    </span>
                  }
                />
                {input.flowOverridden ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setInput((current) => ({
                        ...current,
                        flowOverridden: false,
                        circulation: roundTo(result.calculatedFlowM3h, 3),
                      }))
                    }
                  >
                    Use calculated flow
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setInput((current) => ({
                        ...current,
                        flowOverridden: true,
                        circulation: roundTo(result.calculatedFlowM3h, 3),
                      }))
                    }
                  >
                    Override flow (limit kW)
                  </button>
                )}
                {input.application === "tank" ? (
                  <>
                    <NumberField
                      label={result.isCooling ? "Chilled source temperature" : "Primary flow temperature"}
                      value={input.sourceFlowTemperature}
                      onChange={(value) => patch("sourceFlowTemperature", value)}
                      unit="°C"
                      step={1}
                      hint="Source temperature entering the plate heat exchanger."
                    />
                    <NumberField
                      label="Minimum approach"
                      value={input.minimumApproach}
                      onChange={(value) => patch("minimumApproach", value)}
                      unit="K"
                      step={0.5}
                      min={0}
                      hint="Minimum source-to-process temperature difference."
                    />
                  </>
                ) : null}
                <NumberField
                  label="Additional continuous load"
                  value={input.additionalLoad}
                  onChange={(value) => patch("additionalLoad", value)}
                  unit="kW"
                  step={1}
                  min={0}
                  hint={
                    input.application === "tank"
                      ? "Cold product, make-up liquid or other known process duty."
                      : result.isCooling
                        ? "Known heat gain that the chiller must also remove."
                        : "Known continuous load that the heat source must also serve."
                  }
                />
              </div>

              <div className="recovery-output">
                <div className="recovery-primary">
                  <span>{processWord} with losses</span>
                  <strong>{formatDuration(result.recoveryMinutes)}</strong>
                  <small>
                    {input.recoveryMode === "available"
                      ? `${formatDuration(result.noLossMinutes)} with no standing or pipework load`
                      : result.targetFlowLimited
                        ? `Current flow cannot deliver this duty within ${format(input.desiredMinutes, 0)} minutes`
                        : `${format(input.desiredMinutes, 0)} minute target including selected loads`}
                  </small>
                </div>
                <div className="heatup-pair">
                  <div>
                    <span>With losses</span>
                    <b>{formatDuration(result.recoveryMinutes)}</b>
                  </div>
                  <div>
                    <span>No losses</span>
                    <b>{formatDuration(result.noLossMinutes)}</b>
                  </div>
                </div>
                {result.flowLimited || (input.flowOverridden && result.duty + 0.05 < result.enteredDuty) ? (
                  <div className="flow-warning">
                    <b>Flow is limiting usable duty.</b>
                    <span>
                      Entered {format(result.enteredDuty, 1)} kW is limited to {format(result.duty, 1)} kW
                      by the selected circulation and ΔT. Typical when reheat must not run all pumps.
                    </span>
                  </div>
                ) : (
                  <div className="flow-ok">
                    <b>Flow can carry the entered duty.</b>
                    <span>Mass flow × Cp × ΔT is at least the entered kW.</span>
                  </div>
                )}
                <div className="flow-summary">
                  <div>
                    <span>Usable duty</span>
                    <b>{format(result.duty, 1)} kW {input.flowOverridden ? "(flow-limited)" : ""}</b>
                  </div>
                  <div>
                    <span>Calculated flow from kW · ΔT</span>
                    <b>{format(result.calculatedFlowM3h / 3.6, 2)} l/s · {format(result.calculatedFlowM3h, 1)} m³/h</b>
                  </div>
                  <div>
                    <span>Active flow / circulation</span>
                    <b>{format(result.circulationM3h / 3.6, 2)} l/s · {format(result.circulationM3h, 1)} m³/h</b>
                  </div>
                  <div>
                    <span>Duty ÷ flow temperature change</span>
                    <b>{format(result.flowTemperatureChange, 2)} K</b>
                  </div>
                  <div>
                    <span>Complete turnover</span>
                    <b>{formatDuration(result.turnoverMinutes)}</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <details className="panel assumptions">
          <summary>
            <span>
              <b>Advanced assumptions</b>
              <small>
                Glycol, fluid properties
                {input.application === "tank" ? ", shell mass, evaporation and pipework" : " and insulated pipework"}
              </small>
            </span>
            <span className="summary-plus">+</span>
          </summary>
          <div className="advanced-grid glycol-grid">
            <label className="field glycol-field">
              <span className="field-label-row">
                <span className="field-label">
                  Ethylene glycol
                  <em className="value-badge">{input.fluidOverridden ? "Cp overridden" : "Sets Cp & density"}</em>
                </span>
                <span className="glycol-readout">{format(input.glycolPercent, 0)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={input.glycolPercent}
                aria-label="Ethylene glycol volume percent"
                onChange={(event) => setGlycol(Number(event.target.value))}
              />
              <small>0–30% by volume. Cp falls and density rises as glycol increases. Typical HVAC inhibited ethylene glycol.</small>
            </label>
            <NumberField
              label="Fluid density"
              value={input.fluidOverridden ? input.density : roundTo(result.density, 1)}
              onChange={(value) => overrideFluid("density", value)}
              unit="kg/m³"
              step={1}
              min={1}
              badge={input.fluidOverridden ? "Overridden" : "Calculated"}
              hint={input.fluidOverridden ? `Mixture would be ${format(glycol.density, 1)} kg/m³.` : "From water/glycol mix at mean fluid temperature."}
            />
            <NumberField
              label="Specific heat"
              value={input.fluidOverridden ? input.specificHeat : roundTo(result.specificHeat, 3)}
              onChange={(value) => overrideFluid("specificHeat", value)}
              unit="kJ/kgK"
              step={0.001}
              min={0.01}
              badge={input.fluidOverridden ? "Overridden" : "Calculated"}
              hint={input.fluidOverridden ? `Mixture would be ${format(glycol.specificHeat, 3)} kJ/kg·K.` : "Mass-weighted water + ethylene glycol Cp."}
            />
            {input.fluidOverridden ? (
              <button type="button" className="text-button" onClick={() => setGlycol(input.glycolPercent)}>
                Restore glycol properties
              </button>
            ) : null}
            {input.application === "tank" ? (
              <>
                <NumberField label="Tank steel mass" value={input.steelMass} onChange={(value) => patch("steelMass", value)} unit="kg" step={10} min={0} />
                <NumberField
                  label="Evaporation adjustment"
                  value={input.evaporationFactor}
                  onChange={(value) => patch("evaporationFactor", value)}
                  unit="%"
                  step={10}
                  min={0}
                  hint="100% for clean water. Adjust for process chemistry or partial covers."
                />
              </>
            ) : null}
          </div>
          <div className="pipework-block">
            <label className="toggle-row">
              <span>
                <b>Include insulated pipework losses</b>
                <small>U × π × OD × length × (fluid − ambient). Relevant for long primary runs.</small>
              </span>
              <input
                type="checkbox"
                checked={input.includePipework}
                onChange={(event) => patch("includePipework", event.target.checked)}
              />
            </label>
            {input.includePipework ? (
              <div className="advanced-grid">
                <NumberField label="Pipe length" value={input.pipeLength} onChange={(value) => patch("pipeLength", value)} unit="m" step={1} min={0} />
                <NumberField label="Pipe outside diameter" value={input.pipeDiameterMm} onChange={(value) => patch("pipeDiameterMm", value)} unit="mm" step={0.1} min={0} />
                <NumberField label="Pipework U-value" value={input.pipeU} onChange={(value) => patch("pipeU", value)} unit="W/m²K" step={0.05} min={0} hint="Indicative insulated steel pipe; replace with the specified U-value." />
              </div>
            ) : null}
          </div>
          <div className="method-note">
            <b>Calculation basis</b>
            <p>
              Heating and cooling energy use mass × specific heat × absolute temperature change.
              Circulation is calculated from duty and design ΔT unless you override flow. An
              overridden (lower) flow limits usable kW to mass flow × Cp × ΔT — for example when
              reheat must not run all pumps.
            </p>
            <p>
              Heat-up is reported with insulation / evaporation / pipework losses and again with
              no losses. Insulation losses use the selected U-values and can be overridden as a
              kW figure at target temperature.
            </p>
            <p>
              Ethylene glycol from 0–30% by volume changes density (volume-weighted) and specific
              heat (mass-weighted) using water and EG properties at the mean fluid temperature.
              Indicative construction U-values are starting assumptions.
            </p>
          </div>
        </details>

        <footer>
          <p>Buffer and Bath Heat Planner · Indicative engineering calculation</p>
          <p>Verify final exchanger selection, materials, fouling allowance and pressure drop with the manufacturer.</p>
        </footer>
      </div>
    </main>
  );
}

function safeTemp(value: number) {
  return Number.isFinite(value) ? value : 20;
}
