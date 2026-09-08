"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

type Shape = "rectangular" | "cylindrical";
type TopType = "open" | "closed-wall" | "closed-insulated" | "closed-custom";
type RecoveryMode = "available" | "required";
type AirCase = "quiet" | "agitated" | "draught" | "ventilated";
type FlowUnit = "m3h" | "lps";
type Application = "tank" | "lphw" | "chw";
type GlycolType = "propylene" | "ethylene";
type LossMode = "calculated" | "manual-kw" | "manual-wk" | "ignore";

type Inputs = {
  application: Application;
  shape: Shape;
  length: number;
  width: number;
  depth: number;
  diameter: number;
  measuredVolume: number;
  /** Construction id, or "" while the user has not yet chosen one. */
  construction: string;
  wallU: number;
  baseExposed: boolean;
  topType: TopType;
  lidU: number;
  ambient: number;
  humidity: number;
  startTemperature: number;
  finishTemperature: number;
  airCase: AirCase;
  evaporationFactor: number;
  recoveryMode: RecoveryMode;
  availableDuty: number;
  desiredMinutes: number;
  /** Design temperature difference across the exchanger / circuit, K. */
  designDeltaT: number;
  /** When true the entered circulation is used instead of duty ÷ (ρ·cp·ΔT). */
  overrideFlow: boolean;
  /** Entered circulation in m³/h (only used when overrideFlow is on). */
  circulation: number;
  flowUnit: FlowUnit;
  sourceFlowTemperature: number;
  minimumApproach: number;
  additionalLoad: number;
  /** Insulated pipework standing loss, W/K. */
  pipeworkLossWK: number;
  lossMode: LossMode;
  manualLossKw: number;
  manualLossWK: number;
  glycolType: GlycolType;
  glycolPercent: number;
  /** When true the manual density / specific heat below are used. */
  fluidOverride: boolean;
  density: number;
  specificHeat: number;
  steelMass: number;
};

type Project = {
  name: string;
  reference: string;
  client: string;
  engineer: string;
  date: string;
  notes: string;
};

type Warning = { level: "warn" | "info"; text: string };

const STORAGE_KEY = "bath-loss-calculator-v2";
const LEGACY_STORAGE_KEY = "bath-loss-calculator-v1";
const PROJECT_KEY = "buffer-bath-project-v1";
const APP_VERSION = "5";

const DEFAULTS: Inputs = {
  application: "tank",
  shape: "rectangular",
  length: 2.5,
  width: 2.5,
  depth: 0.8,
  diameter: 2.82,
  measuredVolume: 0,
  construction: "",
  wallU: 1.1,
  baseExposed: true,
  topType: "open",
  lidU: 0.8,
  ambient: 16,
  humidity: 55,
  startTemperature: 16,
  finishTemperature: 60,
  airCase: "agitated",
  evaporationFactor: 100,
  recoveryMode: "available",
  availableDuty: 120,
  desiredMinutes: 120,
  designDeltaT: 5,
  overrideFlow: false,
  circulation: 30,
  flowUnit: "m3h",
  sourceFlowTemperature: 80,
  minimumApproach: 3,
  additionalLoad: 0,
  pipeworkLossWK: 0,
  lossMode: "calculated",
  manualLossKw: 5,
  manualLossWK: 100,
  glycolType: "propylene",
  glycolPercent: 0,
  fluidOverride: false,
  density: 1000,
  specificHeat: 4.186,
  steelMass: 0,
};

const EMPTY_PROJECT: Project = {
  name: "",
  reference: "",
  client: "",
  engineer: "",
  date: "",
  notes: "",
};

function defaultsFor(application: Application): Inputs {
  const base: Inputs = { ...DEFAULTS, application };
  if (application === "lphw") {
    return { ...base, measuredVolume: 5000, startTemperature: 20, finishTemperature: 80, designDeltaT: 20 };
  }
  if (application === "chw") {
    return { ...base, measuredVolume: 5000, startTemperature: 20, finishTemperature: 6, designDeltaT: 6 };
  }
  return base;
}

const APPLICATIONS: Record<
  Application,
  { label: string; detail: string; action: string }
> = {
  tank: {
    label: "Buffer / bath",
    detail: "Tank geometry, standing losses and heat transfer through a plate exchanger.",
    action: "Heating or cooling",
  },
  lphw: {
    label: "LPHW primary circuit",
    detail: "Closed circuit volume heated by the available plant duty.",
    action: "Heating",
  },
  chw: {
    label: "Chilled primary circuit",
    detail: "Closed circuit volume cooled by the available chiller duty.",
    action: "Cooling",
  },
};

const CONSTRUCTIONS = [
  { id: "stainless-single", label: "Stainless steel, single skin", detail: "Bare stainless steel tank", u: 10 },
  { id: "steel-single", label: "Carbon steel, single skin", detail: "Bare carbon steel tank", u: 10 },
  { id: "steel-twin-air", label: "Steel twin wall, still air gap", detail: "Indicative sealed cavity", u: 3.5 },
  { id: "steel-mineral-25", label: "Steel + 25 mm foil-faced mineral wool", detail: "Indicative insulated construction", u: 2.2 },
  { id: "twin-50", label: "Steel + 50 mm foil-faced mineral wool", detail: "Good insulated construction", u: 1.1 },
  { id: "steel-mineral-75", label: "Steel + 75 mm foil-faced mineral wool", detail: "High insulation level", u: 0.7 },
  { id: "steel-pir-25", label: "Steel + 25 mm foil-faced PIR", detail: "Indicative rigid insulation", u: 0.9 },
  { id: "steel-pir-50", label: "Steel + 50 mm foil-faced PIR", detail: "Indicative rigid insulation", u: 0.5 },
  { id: "steel-pir-75", label: "Steel + 75 mm foil-faced PIR", detail: "Indicative rigid insulation", u: 0.35 },
  { id: "grp-single", label: "GRP, single skin", detail: "Indicative uninsulated GRP construction", u: 6 },
  { id: "grp-twin-air", label: "GRP twin skin, air gap", detail: "Indicative sealed cavity", u: 3 },
  { id: "grp-pu-25", label: "GRP twin skin + 25 mm PU foam", detail: "Indicative insulated GRP", u: 0.9 },
  { id: "grp-pu-50", label: "GRP twin skin + 50 mm PU foam", detail: "Indicative insulated GRP", u: 0.5 },
  { id: "grp-pu-75", label: "GRP twin skin + 75 mm PU foam", detail: "Indicative insulated GRP", u: 0.35 },
  { id: "custom", label: "Specification sheet / custom", detail: "Enter the stated U-value", u: 1.5 },
];

const LEGACY_CONSTRUCTIONS: Record<string, string> = {
  single: "stainless-single",
  "twin-air": "steel-twin-air",
  "twin-25": "steel-mineral-25",
  "twin-75": "steel-mineral-75",
};

const AIR_CASES: Record<
  AirCase,
  { label: string; short: string; description: string; evaporation: number; convection: number }
> = {
  quiet: {
    label: "Quiet surface",
    short: "Quiet",
    description: "Indoor, sheltered and little surface disturbance",
    evaporation: 1,
    convection: 6,
  },
  agitated: {
    label: "Some agitation",
    short: "Agitated",
    description: "Normal circulation with modest surface movement",
    evaporation: 1.5,
    convection: 7,
  },
  draught: {
    label: "Draught + agitation",
    short: "Draught",
    description: "Noticeable air movement or a disturbed surface",
    evaporation: 2,
    convection: 10,
  },
  ventilated: {
    label: "Heavily ventilated",
    short: "Ventilated",
    description: "Extraction, fan air or significant splashing",
    evaporation: 3,
    convection: 15,
  },
};

const TOP_TYPES: { id: TopType; label: string; detail: string }[] = [
  { id: "open", label: "Open top", detail: "Includes evaporation, convection and radiation" },
  { id: "closed-wall", label: "Closed, same as walls", detail: "Top uses the selected wall U-value" },
  { id: "closed-insulated", label: "Insulated cover", detail: "Uses an indicative 0.8 W/m²K" },
  { id: "closed-custom", label: "Custom cover", detail: "Enter the cover U-value" },
];

const LOSS_MODES: { id: LossMode; label: string; detail: string }[] = [
  { id: "calculated", label: "Calculated", detail: "From the construction, top and pipework above" },
  { id: "manual-kw", label: "Manual kW", detail: "Fixed standing loss throughout" },
  { id: "manual-wk", label: "Manual W/K", detail: "Loss coefficient × (fluid − ambient)" },
  { id: "ignore", label: "Ignore", detail: "No standing loss" },
];

/**
 * Indicative aqueous glycol properties by mass %, taken at roughly 20–40 °C
 * mean fluid temperature (ASHRAE Handbook—Fundamentals type data). 0 %
 * reproduces the plain-water defaults used by earlier versions of the app.
 */
const GLYCOLS: Record<
  GlycolType,
  { label: string; points: { percent: number; density: number; specificHeat: number; freeze: number }[] }
> = {
  propylene: {
    label: "Propylene glycol",
    points: [
      { percent: 0, density: 1000, specificHeat: 4.186, freeze: 0 },
      { percent: 10, density: 1006, specificHeat: 4.1, freeze: -3 },
      { percent: 20, density: 1015, specificHeat: 4.0, freeze: -7 },
      { percent: 30, density: 1024, specificHeat: 3.88, freeze: -13 },
    ],
  },
  ethylene: {
    label: "Ethylene glycol",
    points: [
      { percent: 0, density: 1000, specificHeat: 4.186, freeze: 0 },
      { percent: 10, density: 1011, specificHeat: 4.05, freeze: -3.5 },
      { percent: 20, density: 1026, specificHeat: 3.9, freeze: -8 },
      { percent: 30, density: 1040, specificHeat: 3.68, freeze: -15 },
    ],
  },
};

const GLYCOL_STEPS = [0, 5, 10, 15, 20, 25, 30];

function glycolProperties(type: GlycolType, percent: number) {
  const points = GLYCOLS[type].points;
  const target = Math.max(0, Math.min(30, Number.isFinite(percent) ? percent : 0));
  let lower = points[0];
  let upper = points[points.length - 1];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (target >= points[index].percent && target <= points[index + 1].percent) {
      lower = points[index];
      upper = points[index + 1];
      break;
    }
  }
  const span = upper.percent - lower.percent;
  const ratio = span > 0 ? (target - lower.percent) / span : 0;
  const mix = (a: number, b: number) => a + (b - a) * ratio;
  return {
    density: Math.round(mix(lower.density, upper.density)),
    specificHeat: Math.round(mix(lower.specificHeat, upper.specificHeat) * 1000) / 1000,
    freeze: Math.round(mix(lower.freeze, upper.freeze) * 10) / 10,
  };
}

function fluidProperties(input: Inputs) {
  const table = glycolProperties(input.glycolType, input.glycolPercent);
  const percent = Math.max(0, Math.min(30, Number.isFinite(input.glycolPercent) ? input.glycolPercent : 0));
  const label =
    percent > 0 ? `${format(percent, 0)} % ${GLYCOLS[input.glycolType].label.toLowerCase()} / water` : "Water";
  if (input.fluidOverride) {
    return {
      density: Number.isFinite(input.density) ? input.density : table.density,
      specificHeat: Number.isFinite(input.specificHeat) ? input.specificHeat : table.specificHeat,
      freeze: table.freeze,
      label,
      basis: "manual" as const,
      table,
    };
  }
  return { ...table, label, basis: "table" as const, table };
}

function saturationPressure(temperature: number) {
  return 0.61078 * Math.exp((17.2694 * temperature) / (temperature + 237.29));
}

function format(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes)) return "Target cannot be reached";
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (!hours) return `${mins} min`;
  return `${hours} hr ${mins.toString().padStart(2, "0")} min`;
}

function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function isKnownConstruction(id: string) {
  return CONSTRUCTIONS.some((item) => item.id === id);
}

/** Upgrades an object saved by any earlier version into the current schema. */
function normaliseInputs(parsed: Partial<Inputs> & { maxCircuitDeltaT?: number }, legacy: boolean): Inputs {
  const { maxCircuitDeltaT, ...rest } = parsed;
  const merged: Inputs = { ...DEFAULTS, ...rest };
  merged.construction = LEGACY_CONSTRUCTIONS[merged.construction] ?? merged.construction;
  if (!isKnownConstruction(merged.construction)) merged.construction = "";
  if (legacy) {
    // v1 had a single "maxCircuitDeltaT" for closed circuits and always used the entered circulation.
    if (merged.application === "tank") {
      merged.designDeltaT = DEFAULTS.designDeltaT;
      merged.overrideFlow = Number.isFinite(merged.circulation) && merged.circulation > 0;
    } else {
      merged.designDeltaT = Number.isFinite(maxCircuitDeltaT) ? (maxCircuitDeltaT as number) : merged.designDeltaT;
      merged.overrideFlow = true;
    }
    // Earlier versions only had manual fluid properties; keep them if they differ from water.
    merged.fluidOverride = merged.density !== DEFAULTS.density || merged.specificHeat !== DEFAULTS.specificHeat;
  }
  if (!GLYCOL_STEPS.includes(merged.glycolPercent)) merged.glycolPercent = 0;
  if (!(merged.glycolType in GLYCOLS)) merged.glycolType = "propylene";
  if (!LOSS_MODES.some((item) => item.id === merged.lossMode)) merged.lossMode = "calculated";
  return merged;
}

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
  disabled = false,
  warning,
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
  disabled?: boolean;
  warning?: string;
}) {
  return (
    <div className={`field ${warning ? "field-warning" : ""}`}>
      <span className="field-label-row">
        <span className="field-label">{label}</span>
        {labelAction}
      </span>
      <label className={`input-wrap ${disabled ? "disabled" : ""}`}>
        <input
          type="number"
          inputMode="decimal"
          aria-label={`${label} ${unit}`}
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
          }
          onWheel={(event) => event.currentTarget.blur()}
        />
        <span>{unit}</span>
      </label>
      {warning ? <small className="warning-text">{warning}</small> : hint ? <small>{hint}</small> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field text-field">
      <span className="field-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="placeholder-card" role="status">
      <span className="placeholder-icon" aria-hidden="true">
        2
      </span>
      <div>
        <b>{title}</b>
        <p>{children}</p>
      </div>
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
              <stop offset="0" stopColor="#dce6f0" />
              <stop offset=".46" stopColor="#ffffff" />
              <stop offset="1" stopColor="#a9bcd0" />
            </linearGradient>
            <linearGradient id="water-cyl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5fc8f5" stopOpacity=".82" />
              <stop offset="1" stopColor="#1e5fa8" stopOpacity=".94" />
            </linearGradient>
          </defs>
          <path d="M92 56v122c0 23 35 42 88 42s88-19 88-42V56" fill="url(#cyl-body)" stroke="#17304a" strokeWidth="3" />
          <path d="M92 91v87c0 23 35 42 88 42s88-19 88-42V91c-25 15-150 15-176 0Z" fill="url(#water-cyl)" opacity=".82" />
          <ellipse cx="180" cy="56" rx="88" ry="31" fill={isOpen ? "#5fc8f5" : "#d7e2ee"} stroke="#17304a" strokeWidth="3" />
          {isOpen ? <ellipse cx="180" cy="56" rx="73" ry="23" fill="#bfe6fb" opacity=".7" /> : null}
          {!isOpen ? <path d="M103 51c35-22 120-22 154 0" fill="none" stroke="#7e97ae" strokeWidth="2" /> : null}
          <path d="M70 55v165M60 55h20M60 220h20" stroke="#6b8399" strokeWidth="2" />
          <text x="54" y="142" textAnchor="middle" transform="rotate(-90 54 142)" className="svg-label">
            {format(input.depth, 2)} m liquid depth
          </text>
          <path d="M92 232h176M92 226v12M268 226v12" stroke="#6b8399" strokeWidth="2" />
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
            <stop offset="0" stopColor="#b8c9da" />
            <stop offset=".52" stopColor="#f7fafd" />
            <stop offset="1" stopColor="#a3b7cb" />
          </linearGradient>
          <linearGradient id="tank-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ed0f7" />
            <stop offset="1" stopColor="#1e5fa8" />
          </linearGradient>
        </defs>
        <path d="M75 69 238 33 310 68 145 105Z" fill={isOpen ? "#a9ddf9" : "#d7e2ee"} stroke="#17304a" strokeWidth="3" />
        {isOpen ? <path d="m89 71 148-31 58 28-149 31Z" fill="#5fc8f5" opacity=".74" /> : null}
        <path d="m75 69 70 36v115L75 182Z" fill="#9fb3c7" stroke="#17304a" strokeWidth="3" />
        <path d="m145 105 165-37v112l-165 40Z" fill="url(#tank-front)" stroke="#17304a" strokeWidth="3" />
        <path d="M145 137 310 101v79l-165 40Z" fill="url(#tank-water)" opacity=".86" />
        <path d="m75 105 70 32 165-36" fill="none" stroke="#2a5a8c" strokeWidth="2" opacity=".65" />
        <path d="M53 69v113M44 69h18M44 182h18" stroke="#6b8399" strokeWidth="2" />
        <text x="36" y="129" textAnchor="middle" transform="rotate(-90 36 129)" className="svg-label">
          D {format(input.depth, 2)} m
        </text>
        <path d="m146 235 164-40M143 226l5 17M308 187l5 17" stroke="#6b8399" strokeWidth="2" />
        <text x="232" y="228" textAnchor="middle" transform="rotate(-14 232 228)" className="svg-label">
          L {format(input.length, 2)} m
        </text>
        <path d="m78 201 64 32M74 209l8-16M138 241l8-16" stroke="#6b8399" strokeWidth="2" />
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
            <stop offset="0" stopColor={cooling ? "#e6f6ff" : "#fff0e4"} />
            <stop offset="1" stopColor={cooling ? "#5fc8f5" : "#f2a03f"} />
          </linearGradient>
        </defs>
        <rect x="125" y="76" width="130" height="98" rx="18" fill="url(#circuit-plant)" stroke="#17304a" strokeWidth="3" />
        <text x="190" y="112" textAnchor="middle" className="svg-label circuit-title">
          {cooling ? "CHILLED CIRCUIT" : "LPHW CIRCUIT"}
        </text>
        <text x="190" y="143" textAnchor="middle" className="circuit-volume">
          {format(volumeLitres, 0)} L
        </text>
        <path d="M125 98H73c-28 0-42 18-42 46s14 46 42 46h234c28 0 42-18 42-46s-14-46-42-46h-52" fill="none" stroke={cooling ? "#2e90ff" : "#d9782f"} strokeWidth="10" strokeLinecap="round" />
        <path d="m305 89 15 9-15 9M75 181l-15 9 15 9" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="190" cy="48" r="22" fill="#fff" stroke="#17304a" strokeWidth="3" />
        <path d="M190 70v16" stroke="#17304a" strokeWidth="3" />
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

type Result = ReturnType<typeof calculate>;

function calculate(input: Inputs) {
  const safe = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const isTank = input.application === "tank";
  const fluid = fluidProperties(input);
  const density = Math.max(1, safe(fluid.density, 1000));
  const specificHeat = Math.max(0.01, safe(fluid.specificHeat, 4.186));
  const topArea =
    input.shape === "rectangular"
      ? Math.max(0, safe(input.length)) * Math.max(0, safe(input.width))
      : (Math.PI * Math.max(0, safe(input.diameter)) ** 2) / 4;
  const sideArea =
    input.shape === "rectangular"
      ? 2 * (Math.max(0, safe(input.length)) + Math.max(0, safe(input.width))) * Math.max(0, safe(input.depth))
      : Math.PI * Math.max(0, safe(input.diameter)) * Math.max(0, safe(input.depth));
  const baseArea = topArea;
  const geometricVolume =
    input.shape === "rectangular"
      ? Math.max(0, safe(input.length)) * Math.max(0, safe(input.width)) * Math.max(0, safe(input.depth)) * 1000
      : topArea * Math.max(0, safe(input.depth)) * 1000;
  const volumeLitres = isTank
    ? safe(input.measuredVolume) > 0
      ? input.measuredVolume
      : geometricVolume
    : Math.max(0, safe(input.measuredVolume));
  const wallArea = sideArea + (input.baseExposed ? baseArea : 0);
  const fluidMass = (volumeLitres / 1000) * density;
  const thermalCapacity = fluidMass * specificHeat + Math.max(0, safe(input.steelMass)) * 0.5;
  const ambient = safe(input.ambient);
  const startTemperature = safe(input.startTemperature);
  const finishTemperature = safe(input.finishTemperature);
  const signedDelta = finishTemperature - startTemperature;
  const direction = signedDelta < 0 ? -1 : 1;
  const deltaTemperature = Math.abs(signedDelta);
  const isCooling = direction < 0;
  const sensibleEnergyKWh = (thermalCapacity * deltaTemperature) / 3600;
  const wallU = Math.max(0, safe(input.wallU));
  const lidU =
    input.topType === "closed-wall"
      ? wallU
      : input.topType === "closed-insulated"
        ? 0.8
        : input.topType === "closed-custom"
          ? Math.max(0, safe(input.lidU))
          : 0;
  const pipeworkWK = Math.max(0, safe(input.pipeworkLossWK));
  const transmissionWK = isTank ? wallU * wallArea + lidU * topArea : 0;
  const process = Math.max(0, safe(input.additionalLoad));
  const ambientVapourPressure =
    (Math.max(0, Math.min(100, safe(input.humidity))) / 100) * saturationPressure(ambient);
  const evaporationCoefficient = 2160 / saturationPressure(60);

  const openTopBreakdown = (temperature: number, airCase: AirCase) => {
    const condition = AIR_CASES[airCase];
    const delta = temperature - ambient;
    const evaporation =
      Math.max(0, evaporationCoefficient * (saturationPressure(temperature) - ambientVapourPressure)) *
      topArea *
      condition.evaporation *
      (Math.max(0, safe(input.evaporationFactor)) / 100) /
      1000;
    const convection = (condition.convection * topArea * delta) / 1000;
    const emissivity = 0.96;
    const stefanBoltzmann = 5.670374419e-8;
    const radiation =
      (emissivity * stefanBoltzmann * topArea * ((temperature + 273.15) ** 4 - (ambient + 273.15) ** 4)) / 1000;
    return { evaporation, convection, radiation };
  };

  /** Calculated (physics-based) standing losses at a fluid temperature, kW, positive when fluid is warmer than ambient. */
  const calculatedLossesAt = (temperature: number, airCase: AirCase) => {
    const delta = temperature - ambient;
    const pipework = (pipeworkWK * delta) / 1000;
    if (!isTank) {
      return { walls: 0, lid: 0, evaporation: 0, convection: 0, radiation: 0, pipework, standing: pipework };
    }
    const walls = (wallU * wallArea * delta) / 1000;
    let lid = 0;
    let evaporation = 0;
    let convection = 0;
    let radiation = 0;
    if (input.topType === "open") {
      const top = openTopBreakdown(temperature, airCase);
      evaporation = top.evaporation;
      convection = top.convection;
      radiation = top.radiation;
    } else {
      lid = (lidU * topArea * delta) / 1000;
    }
    const standing = walls + lid + evaporation + convection + radiation + pipework;
    return { walls, lid, evaporation, convection, radiation, pipework, standing };
  };

  /** Standing loss according to the selected loss basis, kW, positive when it opposes the process. */
  const standingLossAt = (temperature: number, airCase: AirCase) => {
    switch (input.lossMode) {
      case "ignore":
        return 0;
      case "manual-kw":
        return Math.max(0, safe(input.manualLossKw));
      case "manual-wk": {
        const signed = (Math.max(0, safe(input.manualLossWK)) * (temperature - ambient)) / 1000;
        return isCooling ? -signed : signed;
      }
      default: {
        const signed = calculatedLossesAt(temperature, airCase).standing;
        return isCooling ? -signed : signed;
      }
    }
  };

  /** Total load opposing the heat-up / cool-down at a fluid temperature, kW. */
  const opposingAt = (temperature: number, airCase: AirCase) => standingLossAt(temperature, airCase) + process;

  const designDeltaT = Math.max(0, safe(input.designDeltaT));
  const capacityPerLps = (density / 1000) * specificHeat; // kW per (l/s · K)

  const flowCapacityAtFor = (perK: number, temperature: number) => {
    if (perK <= 0) return 0;
    if (isTank) {
      const source = safe(input.sourceFlowTemperature);
      const approach = Math.max(0, safe(input.minimumApproach));
      const availableDelta = isCooling ? temperature - (source + approach) : source - approach - temperature;
      return perK * Math.max(0, availableDelta);
    }
    return perK * designDeltaT;
  };

  /**
   * Integrates the heat-up in 500 equal temperature steps: t = Σ C·δT / (P_usable(T) − L(T)).
   * P_usable is limited by the flow at each temperature; L is the standing loss plus process load.
   */
  const integrate = (power: number, perK: number, airCase: AirCase, applyFlowLimit: boolean, ignoreLosses: boolean) => {
    if (deltaTemperature <= 0) return { minutes: 0, averageLoss: 0, lossEnergyKWh: 0, averageUsable: power };
    const steps = 500;
    const temperatureStep = deltaTemperature / steps;
    let seconds = 0;
    let lossEnergy = 0;
    let usableEnergy = 0;
    for (let index = 0; index < steps; index += 1) {
      const temperature = startTemperature + direction * (index + 0.5) * temperatureStep;
      const usableDuty = applyFlowLimit
        ? Math.min(Math.max(0, power), flowCapacityAtFor(perK, temperature))
        : Math.max(0, power);
      const opposingLoad = ignoreLosses ? 0 : opposingAt(temperature, airCase);
      const netPower = usableDuty - opposingLoad;
      if (netPower <= 0.001) {
        return { minutes: Number.POSITIVE_INFINITY, averageLoss: Number.NaN, lossEnergyKWh: Number.NaN, averageUsable: Number.NaN };
      }
      const stepSeconds = (thermalCapacity * temperatureStep) / netPower;
      seconds += stepSeconds;
      lossEnergy += opposingLoad * stepSeconds;
      usableEnergy += usableDuty * stepSeconds;
    }
    return {
      minutes: seconds / 60,
      averageLoss: seconds > 0 ? lossEnergy / seconds : 0,
      lossEnergyKWh: lossEnergy / 3600,
      averageUsable: seconds > 0 ? usableEnergy / seconds : power,
    };
  };

  const requiredPower = () => {
    const holdAtTarget = Math.max(0, opposingAt(finishTemperature, input.airCase));
    if (deltaTemperature <= 0 || safe(input.desiredMinutes) <= 0) return holdAtTarget;
    const targetMinutes = Math.max(0.1, safe(input.desiredMinutes));
    const timeFor = (power: number) => integrate(power, 0, input.airCase, false, false).minutes;
    let low = holdAtTarget + 0.001;
    let high = Math.max(low + 1, sensibleEnergyKWh / (targetMinutes / 60) + low);
    while (timeFor(high) > targetMinutes && high < 100000) high *= 1.5;
    for (let index = 0; index < 70; index += 1) {
      const midpoint = (low + high) / 2;
      if (timeFor(midpoint) > targetMinutes) low = midpoint;
      else high = midpoint;
    }
    return high;
  };

  const requestedDuty = input.recoveryMode === "available" ? Math.max(0, safe(input.availableDuty)) : requiredPower();
  // Design flow: q = P / (ρ · cp · ΔT)
  const designFlowLps =
    designDeltaT > 0 && capacityPerLps > 0 ? requestedDuty / (capacityPerLps * designDeltaT) : Number.POSITIVE_INFINITY;
  const enteredFlowLps = Math.max(0, safe(input.circulation)) / 3.6;
  const flowLps = input.overrideFlow ? enteredFlowLps : Number.isFinite(designFlowLps) ? designFlowLps : 0;
  const flowM3h = flowLps * 3.6;
  const flowCapacityPerK = flowLps * capacityPerLps; // kW/K carried by the circulating flow
  // Flow-limited duty: P_lim = q · ρ · cp · ΔT
  const flowDutyCapacity = flowCapacityPerK * designDeltaT;
  const duty = input.overrideFlow ? Math.min(requestedDuty, flowDutyCapacity) : requestedDuty;
  const flowLimited = input.overrideFlow && duty < requestedDuty - 0.05;

  const withLosses = integrate(duty, flowCapacityPerK, input.airCase, true, false);
  const noLosses = integrate(duty, flowCapacityPerK, input.airCase, true, true);
  const recoveryMinutes = withLosses.minutes;
  const noLossMinutes = noLosses.minutes;
  const pureSensibleMinutes = duty > 0 ? (thermalCapacity * deltaTemperature) / duty / 60 : Number.POSITIVE_INFINITY;
  const flowTemperatureChange = flowCapacityPerK > 0 ? duty / flowCapacityPerK : Number.NaN;
  const turnoverMinutes = flowM3h > 0 ? (volumeLitres / 1000 / flowM3h) * 60 : Number.NaN;
  const flowCapacityAtStart = flowCapacityAtFor(flowCapacityPerK, startTemperature);
  const flowCapacityAtTarget = flowCapacityAtFor(flowCapacityPerK, finishTemperature);
  const approachLimited = isTank && duty > 0 && flowCapacityAtTarget < duty - 0.05;
  const source = safe(input.sourceFlowTemperature);
  const approach = Math.max(0, safe(input.minimumApproach));
  const sourceUnreachable =
    isTank && (isCooling ? source + approach >= finishTemperature : source - approach <= finishTemperature);
  const targetFlowLimited =
    input.recoveryMode === "required" &&
    (!Number.isFinite(recoveryMinutes) || recoveryMinutes > Math.max(0, safe(input.desiredMinutes)) + 0.5);

  const calculatedAtTarget = calculatedLossesAt(finishTemperature, input.airCase);
  const calculatedHold = (isCooling ? -calculatedAtTarget.standing : calculatedAtTarget.standing) + process;
  const holdDuty = opposingAt(finishTemperature, input.airCase);
  const standingAtTarget = standingLossAt(finishTemperature, input.airCase);
  const ambientDelta = Math.abs(finishTemperature - ambient);
  const effectiveWK = ambientDelta > 0.01 ? (standingAtTarget * 1000) / ambientDelta : Number.NaN;
  const standingEnergyPerDay = holdDuty * 24;

  const cases = (Object.keys(AIR_CASES) as AirCase[]).map((airCase) => {
    const losses = calculatedLossesAt(finishTemperature, airCase);
    return {
      id: airCase,
      ...AIR_CASES[airCase],
      total: (isCooling ? -losses.standing : losses.standing) + process,
      recoveryMinutes: integrate(duty, flowCapacityPerK, airCase, true, false).minutes,
    };
  });

  const warnings: Warning[] = [];
  if (volumeLitres <= 0) warnings.push({ level: "warn", text: isTank ? "Enter tank dimensions or a known volume." : "Enter the total circuit volume." });
  if (deltaTemperature <= 0) warnings.push({ level: "warn", text: "Start and target temperatures are the same, so there is no heat-up to calculate." });
  if (designDeltaT <= 0) warnings.push({ level: "warn", text: "Enter a positive design ΔT so the flow can be derived." });
  if (sourceUnreachable) {
    warnings.push({
      level: "warn",
      text: isCooling
        ? "Chilled source temperature plus approach is not below the target, so the target cannot be reached."
        : "Primary flow temperature minus approach is not above the target, so the target cannot be reached.",
    });
  } else if (approachLimited) {
    warnings.push({
      level: "info",
      text: `Near the target only ${format(flowCapacityAtTarget, 1)} kW can be transferred because the source approach limits the exchanger. Reduce the design ΔT or change the source temperature.`,
    });
  }
  if (flowLimited) {
    warnings.push({
      level: "warn",
      text: `Duty is flow-limited: ${format(flowM3h, 1)} m³/h at ${format(designDeltaT, 1)} K carries ${format(duty, 1)} kW of the ${format(requestedDuty, 1)} kW requested.`,
    });
  }
  if (!Number.isFinite(recoveryMinutes) && !sourceUnreachable && deltaTemperature > 0 && volumeLitres > 0) {
    warnings.push({ level: "warn", text: "The usable duty cannot overcome the standing loss and continuous load, so the target is never reached." });
  }
  if (isTank && input.topType === "open" && (safe(input.humidity) < 0 || safe(input.humidity) > 100)) warnings.push({ level: "warn", text: "Relative humidity must be between 0 and 100 %." });
  if (isTank && input.topType === "open" && Math.max(startTemperature, finishTemperature) > 95) warnings.push({ level: "info", text: "Open-surface evaporation above about 95 °C is outside the range of the correlation used." });
  if (isTank && wallU > 12) warnings.push({ level: "info", text: "Wall U-value is unusually high; bare steel is around 10 W/m²K." });
  if (ambient < -20 || ambient > 50) warnings.push({ level: "info", text: "Ambient temperature is outside the usual −20 to 50 °C range." });
  if (input.fluidOverride && (safe(input.specificHeat) < 2 || safe(input.specificHeat) > 5)) warnings.push({ level: "info", text: "Specific heat is outside the usual 2–5 kJ/kgK range for aqueous fluids." });
  if (fluid.freeze < 0 && Math.min(startTemperature, finishTemperature, ambient) < fluid.freeze + 3) warnings.push({ level: "info", text: `The fluid is within 3 K of its indicative freeze point (${format(fluid.freeze, 0)} °C).` });

  return {
    fluid,
    density,
    specificHeat,
    topArea,
    sideArea,
    baseArea,
    wallArea,
    totalSurface: sideArea + baseArea + topArea,
    geometricVolume,
    volumeLitres,
    fluidMass,
    thermalCapacity,
    sensibleEnergyKWh,
    transmissionWK,
    pipeworkWK,
    effectiveWK,
    requestedDuty,
    duty,
    flowLimited,
    designDeltaT,
    designFlowLps,
    enteredFlowLps,
    flowLps,
    flowM3h,
    flowCapacityPerK,
    flowDutyCapacity,
    recoveryMinutes,
    noLossMinutes,
    pureSensibleMinutes,
    withLosses,
    noLosses,
    flowTemperatureChange,
    turnoverMinutes,
    flowCapacityAtStart,
    flowCapacityAtTarget,
    approachLimited,
    sourceUnreachable,
    targetFlowLimited,
    isCooling,
    holdDuty,
    calculatedHold,
    standingAtTarget,
    standingEnergyPerDay,
    calculatedAtTarget,
    process,
    cases,
    warnings,
    ambient,
    startTemperature,
    finishTemperature,
    deltaTemperature,
  };
}

function ReportRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="report-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Report({
  input,
  result,
  project,
  constructionChosen,
}: {
  input: Inputs;
  result: Result;
  project: Project;
  constructionChosen: boolean;
}) {
  const isTank = input.application === "tank";
  const application = APPLICATIONS[input.application];
  const construction = CONSTRUCTIONS.find((item) => item.id === input.construction);
  const topType = TOP_TYPES.find((item) => item.id === input.topType);
  const lossMode = LOSS_MODES.find((item) => item.id === input.lossMode);
  const processWord = result.isCooling ? "cool-down" : "heat-up";
  const kW = (value: number, digits = 1) => `${format(value, digits)} kW`;

  const geometryRows: [string, ReactNode][] = isTank
    ? [
        ["Tank shape", input.shape === "rectangular" ? "Rectangular" : "Vertical cylinder"],
        ...(input.shape === "rectangular"
          ? ([
              ["Length × width", `${format(input.length, 2)} m × ${format(input.width, 2)} m`],
            ] as [string, ReactNode][])
          : ([["Diameter", `${format(input.diameter, 2)} m`]] as [string, ReactNode][])),
        ["Liquid depth", `${format(input.depth, 2)} m`],
        ["Working volume", `${format(result.volumeLitres, 0)} L${input.measuredVolume > 0 ? " (entered)" : " (from geometry)"}`],
        ["Top / base / side areas", `${format(result.topArea, 2)} / ${format(result.baseArea, 2)} / ${format(result.sideArea, 2)} m²`],
        ["Fluid mass", `${format(result.fluidMass, 0)} kg`],
        ["Thermal capacity", `${format(result.thermalCapacity, 0)} kJ/K${input.steelMass > 0 ? ` (incl. ${format(input.steelMass, 0)} kg steel)` : ""}`],
      ]
    : [
        ["Total circuit volume", `${format(result.volumeLitres, 0)} L`],
        ["Fluid mass", `${format(result.fluidMass, 0)} kg`],
        ["Thermal capacity", `${format(result.thermalCapacity, 0)} kJ/K${input.steelMass > 0 ? ` (incl. ${format(input.steelMass, 0)} kg steel)` : ""}`],
      ];

  const fluidRows: [string, ReactNode][] = [
    ["Fluid", result.fluid.label],
    ["Glycol", input.glycolPercent > 0 ? `${GLYCOLS[input.glycolType].label}, ${format(input.glycolPercent, 0)} % by mass` : "None (water)"],
    ["Density", `${format(result.density, 0)} kg/m³${result.fluid.basis === "manual" ? " (manual override)" : ""}`],
    ["Specific heat", `${format(result.specificHeat, 3)} kJ/kgK${result.fluid.basis === "manual" ? " (manual override)" : ""}`],
    ["Indicative freeze point", `${format(result.fluid.freeze, 0)} °C`],
    ...(isTank ? ([["Evaporation adjustment", `${format(input.evaporationFactor, 0)} %`]] as [string, ReactNode][]) : []),
  ];

  const lossRows: [string, ReactNode][] = isTank
    ? [
        ["Construction", constructionChosen ? construction?.label ?? input.construction : "Not selected"],
        ["Wall U-value", `${format(input.wallU, 2)} W/m²K${input.baseExposed ? ", base exposed" : ", base not exposed"}`],
        ["Tank top", topType?.label ?? input.topType],
        ...(input.topType === "open"
          ? ([
              ["Surface condition", AIR_CASES[input.airCase].label],
              ["Relative humidity", `${format(input.humidity, 0)} %`],
            ] as [string, ReactNode][])
          : input.topType === "closed-custom"
            ? ([["Cover U-value", `${format(input.lidU, 2)} W/m²K`]] as [string, ReactNode][])
            : []),
        ["Ambient temperature", `${format(result.ambient, 1)} °C`],
        ["Transmission coefficient (walls + cover)", `${format(result.transmissionWK, 0)} W/K`],
        ["Pipework losses", `${format(result.pipeworkWK, 0)} W/K`],
        [
          "Calculated losses at target",
          `Walls ${kW(result.calculatedAtTarget.walls, 2)} · cover ${kW(result.calculatedAtTarget.lid, 2)} · evaporation ${kW(result.calculatedAtTarget.evaporation, 2)} · convection ${kW(result.calculatedAtTarget.convection, 2)} · radiation ${kW(result.calculatedAtTarget.radiation, 2)} · pipework ${kW(result.calculatedAtTarget.pipework, 2)}`,
        ],
        ["Additional continuous load", kW(result.process)],
        ["Loss basis used for heat-up", `${lossMode?.label ?? input.lossMode}${input.lossMode === "manual-kw" ? ` (${kW(input.manualLossKw)})` : input.lossMode === "manual-wk" ? ` (${format(input.manualLossWK, 0)} W/K)` : ""}`],
        ["Standing loss at target (basis used)", kW(result.standingAtTarget, 2)],
        ["Equivalent loss coefficient at target", `${format(result.effectiveWK, 0)} W/K`],
        ["Hold duty at target", kW(result.holdDuty, 2)],
      ]
    : [
        ["Ambient temperature", `${format(result.ambient, 1)} °C`],
        ["Pipework losses", `${format(result.pipeworkWK, 0)} W/K`],
        ["Additional continuous load", kW(result.process)],
        ["Loss basis used for heat-up", `${lossMode?.label ?? input.lossMode}${input.lossMode === "manual-kw" ? ` (${kW(input.manualLossKw)})` : input.lossMode === "manual-wk" ? ` (${format(input.manualLossWK, 0)} W/K)` : ""}`],
        ["Standing loss at target (basis used)", kW(result.standingAtTarget, 2)],
        ["Continuous load at target", kW(result.holdDuty, 2)],
      ];

  const dutyRows: [string, ReactNode][] = [
    ["Duty basis", input.recoveryMode === "available" ? "Entered exchanger / plant duty" : `Sized for ${format(input.desiredMinutes, 0)} min recovery`],
    ["Requested duty", kW(result.requestedDuty)],
    ["Design ΔT", `${format(result.designDeltaT, 1)} K`],
    ["Design flow = P ÷ (ρ·cp·ΔT)", `${format(result.designFlowLps, 2)} l/s · ${format(result.designFlowLps * 3.6, 1)} m³/h`],
    [
      "Flow used",
      input.overrideFlow
        ? `${format(result.flowLps, 2)} l/s · ${format(result.flowM3h, 1)} m³/h (entered override)`
        : `${format(result.flowLps, 2)} l/s · ${format(result.flowM3h, 1)} m³/h (design flow)`,
    ],
    ["Flow-limited duty = q·ρ·cp·ΔT", `${kW(result.duty)}${result.flowLimited ? " — FLOW-LIMITED" : ""}`],
    ["Achieved ΔT at delivered duty", `${format(result.flowTemperatureChange, 2)} K`],
    ...(isTank
      ? ([
          [result.isCooling ? "Chilled source temperature" : "Primary flow temperature", `${format(input.sourceFlowTemperature, 1)} °C`],
          ["Minimum approach", `${format(input.minimumApproach, 1)} K`],
          ["Transferable duty at start / target", `${kW(result.flowCapacityAtStart)} / ${kW(result.flowCapacityAtTarget)}`],
        ] as [string, ReactNode][])
      : []),
    ["Complete turnover", formatDuration(result.turnoverMinutes)],
  ];

  const heatRows: [string, ReactNode][] = [
    ["Start → target", `${format(result.startTemperature, 1)} °C → ${format(result.finishTemperature, 1)} °C (${format(result.deltaTemperature, 1)} K)`],
    ["Ambient", `${format(result.ambient, 1)} °C`],
    ...(isTank
      ? ([
          [
            "Exchanger secondary at target",
            result.isCooling
              ? `${format(result.finishTemperature, 1)} °C in → ${format(result.finishTemperature - (Number.isFinite(result.flowTemperatureChange) ? result.flowTemperatureChange : 0), 1)} °C out`
              : `${format(result.finishTemperature, 1)} °C in → ${format(result.finishTemperature + (Number.isFinite(result.flowTemperatureChange) ? result.flowTemperatureChange : 0), 1)} °C out`,
          ],
        ] as [string, ReactNode][])
      : ([
          [
            "Circuit flow / return at target",
            result.isCooling
              ? `${format(result.finishTemperature, 1)} °C / ${format(result.finishTemperature + result.designDeltaT, 1)} °C`
              : `${format(result.finishTemperature, 1)} °C / ${format(result.finishTemperature - result.designDeltaT, 1)} °C`,
          ],
        ] as [string, ReactNode][])),
    [`${result.isCooling ? "Cooling" : "Heating"} energy (sensible)`, `${format(result.sensibleEnergyKWh, 1)} kWh`],
    ["Energy to standing losses during recovery", `${format(result.withLosses.lossEnergyKWh, 1)} kWh`],
    ["Average standing loss during recovery", kW(result.withLosses.averageLoss, 2)],
    [`${result.isCooling ? "Cool-down" : "Heat-up"} time WITH losses`, <strong key="with">{formatDuration(result.recoveryMinutes)}</strong>],
    [`${result.isCooling ? "Cool-down" : "Heat-up"} time with NO losses`, <strong key="without">{formatDuration(result.noLossMinutes)}</strong>],
    ["Standing energy at target", `${format(result.standingEnergyPerDay, 0)} kWh per 24 h`],
  ];

  return (
    <article className="report-sheet">
      <header className="report-header">
        <div>
          <p className="report-kicker">Buffer and Bath Heat Planner · Calculation report</p>
          <h1>{project.name || "Untitled project"}</h1>
          <p className="report-sub">
            {application.label} · {application.action.toLowerCase()} · {processWord}
          </p>
        </div>
        <dl className="report-meta">
          <div>
            <dt>Reference</dt>
            <dd>{project.reference || "—"}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd>{project.client || "—"}</dd>
          </div>
          <div>
            <dt>Engineer</dt>
            <dd>{project.engineer || "—"}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDate(project.date)}</dd>
          </div>
        </dl>
      </header>

      <section className="report-summary">
        <div>
          <span>{result.isCooling ? "Cool-down" : "Heat-up"} with losses</span>
          <strong>{formatDuration(result.recoveryMinutes)}</strong>
        </div>
        <div>
          <span>{result.isCooling ? "Cool-down" : "Heat-up"} with no losses</span>
          <strong>{formatDuration(result.noLossMinutes)}</strong>
        </div>
        <div>
          <span>Delivered duty</span>
          <strong>
            {kW(result.duty)}
            {result.flowLimited ? <small> of {kW(result.requestedDuty)} requested</small> : null}
          </strong>
        </div>
        <div>
          <span>Flow / circulation</span>
          <strong>
            {format(result.flowLps, 2)} l/s <small>{format(result.flowM3h, 1)} m³/h</small>
          </strong>
        </div>
      </section>

      {result.warnings.length ? (
        <section className="report-section">
          <h2>Checks</h2>
          <ul className="report-warnings">
            {result.warnings.map((item) => (
              <li key={item.text} className={item.level}>
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="report-columns">
        <section className="report-section">
          <h2>{isTank ? "Geometry and volume" : "Circuit volume"}</h2>
          <ReportRows rows={geometryRows} />
        </section>
        <section className="report-section">
          <h2>Fluid and assumptions</h2>
          <ReportRows rows={fluidRows} />
        </section>
      </div>

      <section className="report-section">
        <h2>{isTank ? "Construction and standing losses" : "Standing losses"}</h2>
        <ReportRows rows={lossRows} />
      </section>

      <div className="report-columns">
        <section className="report-section">
          <h2>Duty and flow</h2>
          <ReportRows rows={dutyRows} />
        </section>
        <section className="report-section">
          <h2>{result.isCooling ? "Cool-down" : "Heat-up"} time</h2>
          <ReportRows rows={heatRows} />
        </section>
      </div>

      {project.notes ? (
        <section className="report-section">
          <h2>Notes</h2>
          <p className="report-notes">{project.notes}</p>
        </section>
      ) : null}

      <section className="report-section report-footnotes">
        <h2>Method</h2>
        <ol>
          <li>
            Thermal capacity C = m·cp + m<sub>steel</sub>·0.5 kJ/K. Sensible energy = C·|T<sub>target</sub> − T<sub>start</sub>| ÷ 3600 kWh.
          </li>
          <li>
            Design flow q = P ÷ (ρ·cp·ΔT) in l/s with ρ in kg/m³ ÷ 1000 and cp in kJ/kgK; m³/h = l/s × 3.6. With a flow override the delivered duty is limited to
            P<sub>lim</sub> = q·ρ·cp·ΔT and that limited duty is used for the heat-up time.
          </li>
          {isTank ? (
            <li>
              Exchanger transfer at fluid temperature T is additionally limited to q·ρ·cp·(T<sub>source</sub> − approach − T) for heating (mirror image for cooling).
            </li>
          ) : null}
          <li>
            Standing losses: walls and closed covers U·A·(T − T<sub>ambient</sub>); open surfaces combine evaporation (vapour-pressure difference with a surface
            condition factor), convection (h·A·ΔT) and radiation (ε = 0.96); pipework W/K × (T − T<sub>ambient</sub>). Manual kW or W/K figures replace the
            calculated standing loss when selected.
          </li>
          <li>
            Heat-up time with losses integrates 500 equal temperature steps: t = Σ C·δT ÷ (P<sub>usable</sub>(T) − L(T) − P<sub>process</sub>), so losses
            grow and the heating rate falls as the fluid approaches the target. The no-loss time uses the same integration with L = 0 and no process load
            (equal to C·ΔT ÷ P where the flow limit does not bind).
          </li>
          <li>
            Glycol density and specific heat are interpolated from indicative published tables at about 20–40 °C mean fluid temperature; 0 % reproduces
            water (1000 kg/m³, 4.186 kJ/kgK).
          </li>
          <li>Indicative engineering calculation. Verify exchanger selection, materials, fouling allowance and pressure drop with the manufacturer.</li>
        </ol>
        <p className="report-generated">
          Generated {new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })} · Buffer and Bath Heat Planner v{APP_VERSION}
        </p>
      </section>
    </article>
  );
}

export default function Home() {
  const [input, setInput] = useState<Inputs>(DEFAULTS);
  const [project, setProject] = useState<Project>(EMPTY_PROJECT);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"app" | "report">("app");

  useEffect(() => {
    let storedInput: Inputs | null = null;
    let storedProject: Project | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        storedInput = normaliseInputs(JSON.parse(stored) as Partial<Inputs>, false);
      } else {
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) storedInput = normaliseInputs(JSON.parse(legacy) as Partial<Inputs>, true);
      }
      const projectStored = window.localStorage.getItem(PROJECT_KEY);
      if (projectStored) storedProject = { ...EMPTY_PROJECT, ...(JSON.parse(projectStored) as Partial<Project>) };
    } catch {
      // Device storage is optional.
    }
    queueMicrotask(() => {
      if (storedInput) setInput(storedInput);
      setProject(storedProject ?? { ...EMPTY_PROJECT, date: todayIso() });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // Device storage is optional.
    }
  }, [input, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    } catch {
      // Device storage is optional.
    }
  }, [project, loaded]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (view !== "report") return;
    window.scrollTo({ top: 0 });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setView("app");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const patch = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const patchProject = <K extends keyof Project>(key: K, value: Project[K]) => {
    setProject((current) => ({ ...current, [key]: value }));
  };

  const result = useMemo(() => calculate(input), [input]);

  const isTank = input.application === "tank";
  const constructionChosen = !isTank || isKnownConstruction(input.construction);
  const selectedConstruction = CONSTRUCTIONS.find((item) => item.id === input.construction);
  const impossible = !Number.isFinite(result.recoveryMinutes);
  const selectedCase = AIR_CASES[input.airCase];
  const application = APPLICATIONS[input.application];
  const processWord = result.isCooling ? "cool-down" : "heat-up";
  const energyWord = result.isCooling ? "Cooling" : "Heating";
  const dutyLabel = isTank
    ? "Exchanger duty"
    : result.isCooling
      ? "Available cooling duty"
      : "Available heating duty";
  const stepOffset = isTank ? 0 : -1;
  const blockingWarnings = result.warnings.filter((item) => item.level === "warn");

  const selectApplication = (next: Application) => {
    setInput((current) => {
      const geometricVolume =
        current.shape === "rectangular"
          ? Math.max(0, current.length) * Math.max(0, current.width) * Math.max(0, current.depth) * 1000
          : ((Math.PI * Math.max(0, current.diameter) ** 2) / 4) * Math.max(0, current.depth) * 1000;
      const knownVolume = current.measuredVolume > 0 ? current.measuredVolume : geometricVolume;
      if (next === "lphw") {
        return {
          ...current,
          application: next,
          measuredVolume: knownVolume,
          startTemperature: 20,
          finishTemperature: 80,
          designDeltaT: 20,
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
        };
      }
      return {
        ...current,
        application: next,
        startTemperature: 16,
        finishTemperature: 60,
        designDeltaT: DEFAULTS.designDeltaT,
      };
    });
  };

  const resetMode = () => {
    setInput(defaultsFor(input.application));
  };

  const openReport = () => setView("report");
  const printReport = () => window.print();

  const summarySentence = (() => {
    if (!constructionChosen) return "";
    const volume = `${format(result.volumeLitres, 0)} L`;
    const temps = `${format(result.startTemperature, 0)} °C to ${format(result.finishTemperature, 0)} °C`;
    const dutyText = result.flowLimited
      ? `${format(result.duty, 1)} kW (flow-limited from ${format(result.requestedDuty, 1)} kW)`
      : `${format(result.duty, 1)} kW`;
    if (impossible) {
      return `${volume} of ${result.fluid.label.toLowerCase()} cannot be taken from ${temps} with ${dutyText} against the selected loads.`;
    }
    return `${volume} of ${result.fluid.label.toLowerCase()} from ${temps} with ${dutyText} takes ${formatDuration(result.recoveryMinutes)} including losses, or ${formatDuration(result.noLossMinutes)} with no losses.`;
  })();

  const lossModeField =
    input.lossMode === "manual-kw" ? (
      <NumberField
        label="Standing loss (manual)"
        value={input.manualLossKw}
        onChange={(value) => patch("manualLossKw", value)}
        unit="kW"
        step={0.5}
        min={0}
        hint="Fixed loss applied throughout the heat-up."
      />
    ) : input.lossMode === "manual-wk" ? (
      <NumberField
        label="Loss coefficient (manual)"
        value={input.manualLossWK}
        onChange={(value) => patch("manualLossWK", value)}
        unit="W/K"
        step={10}
        min={0}
        hint="Multiplied by fluid − ambient temperature at each step."
      />
    ) : null;

  const glycolAvailable = result.fluid.table;

  return (
    <main>
      <div className={view === "report" ? "app-shell screen-hidden" : "app-shell"}>
        <header className="app-header">
          <div className="header-inner">
            <div>
              <p className="eyebrow">HVAC &amp; process engineering tool · v{APP_VERSION}</p>
              <h1>Buffer and Bath Heat Planner</h1>
              <p className="header-copy">
                Plan tank losses or the heating and cooling recovery of a known water or glycol volume, with the
                flow derived from duty and ΔT and checked against any circulation limit.
              </p>
            </div>
            <div className="header-actions">
              <button className="header-button primary" type="button" onClick={openReport}>
                Report / PDF
              </button>
              <button className="header-button" type="button" onClick={resetMode}>
                Reset {application.label.toLowerCase()}
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
                  <p className="section-kicker">1 · Volume {isTank ? "and geometry" : ""}</p>
                  <h2>{isTank ? "Size and shape" : "Closed circuit volume"}</h2>
                </div>
                {isTank ? (
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
                {isTank ? (
                  input.shape === "rectangular" ? (
                    <>
                      <NumberField label="Length" value={input.length} onChange={(value) => patch("length", value)} unit="m" min={0} warning={input.length <= 0 ? "Must be above zero" : undefined} />
                      <NumberField label="Width" value={input.width} onChange={(value) => patch("width", value)} unit="m" min={0} warning={input.width <= 0 ? "Must be above zero" : undefined} />
                      <NumberField label="Liquid depth" value={input.depth} onChange={(value) => patch("depth", value)} unit="m" min={0} warning={input.depth <= 0 ? "Must be above zero" : undefined} />
                    </>
                  ) : (
                    <>
                      <NumberField label="Diameter" value={input.diameter} onChange={(value) => patch("diameter", value)} unit="m" min={0} warning={input.diameter <= 0 ? "Must be above zero" : undefined} />
                      <NumberField label="Liquid depth" value={input.depth} onChange={(value) => patch("depth", value)} unit="m" min={0} warning={input.depth <= 0 ? "Must be above zero" : undefined} />
                    </>
                  )
                ) : null}
                <NumberField
                  label={isTank ? "Known volume" : "Total circuit volume"}
                  value={input.measuredVolume}
                  onChange={(value) => patch("measuredVolume", value)}
                  unit="L"
                  min={0}
                  step={10}
                  hint={
                    isTank
                      ? "Optional. Leave blank to use the drawing."
                      : "Include water in plant, pipework, headers and vessels."
                  }
                />
              </div>
              {isTank ? (
                <div className="geometry-strip">
                  <span><b>{format(result.topArea, 2)} m²</b> top</span>
                  <span><b>{format(result.sideArea, 2)} m²</b> sides</span>
                  <span><b>{format(result.baseArea, 2)} m²</b> base</span>
                  <span><b>{format(result.fluidMass, 0)} kg</b> fluid</span>
                  <span><b>{format(result.thermalCapacity, 0)} kJ/K</b> capacity</span>
                </div>
              ) : (
                <div className="geometry-strip circuit-strip">
                  <span><b>{format(result.fluidMass, 0)} kg</b> fluid mass</span>
                  <span><b>{format(result.thermalCapacity, 0)} kJ/K</b> heat capacity</span>
                  <span><b>{format(result.sensibleEnergyKWh, 1)} kWh</b> {energyWord.toLowerCase()} energy</span>
                </div>
              )}
            </article>

            {constructionChosen ? (
              <aside className={`panel result-panel ${impossible ? "warning-panel" : ""}`}>
                <p className="section-kicker">Live result</p>
                <div className="result-lead">
                  <span>{input.recoveryMode === "available" ? `Estimated ${processWord} with losses` : "Required duty"}</span>
                  <strong>
                    {input.recoveryMode === "available"
                      ? formatDuration(result.recoveryMinutes)
                      : `${format(result.requestedDuty, 1)} kW`}
                  </strong>
                  <small>
                    {format(result.startTemperature, 0)}°C to {format(result.finishTemperature, 0)}°C ·{" "}
                    {isTank
                      ? input.topType === "open"
                        ? selectedCase.label.toLowerCase()
                        : "closed top"
                      : application.label.toLowerCase()}
                    {input.glycolPercent > 0 ? ` · ${result.fluid.label.toLowerCase()}` : ""}
                  </small>
                </div>
                {blockingWarnings.length ? (
                  <div className="warning-message">
                    {blockingWarnings[0].text}
                  </div>
                ) : null}
                <div className="metric-grid">
                  <div>
                    <span>{processWord === "heat-up" ? "Heat-up, no losses" : "Cool-down, no losses"}</span>
                    <b>{formatDuration(result.noLossMinutes)}</b>
                  </div>
                  <div>
                    <span>{isTank ? (result.isCooling ? "Standing gain" : "Hold duty") : "Continuous load"} at target</span>
                    <b>{format(result.holdDuty, 1)} kW</b>
                  </div>
                  <div>
                    <span>{result.flowLimited ? "Flow-limited duty" : "Delivered duty"}</span>
                    <b>
                      {format(result.duty, 1)} kW
                      {result.flowLimited ? <em className="limited-tag">limited</em> : null}
                    </b>
                  </div>
                  <div>
                    <span>Flow / circulation</span>
                    <b>{format(result.flowLps, 2)} l/s</b>
                  </div>
                  <div>
                    <span>{energyWord} energy</span>
                    <b>{format(result.sensibleEnergyKWh, 1)} kWh</b>
                  </div>
                  <div>
                    <span>Loss coefficient at target</span>
                    <b>{format(result.effectiveWK, 0)} W/K</b>
                  </div>
                </div>
                <div className="result-note">
                  <span className="pulse-dot" />
                  {isTank
                    ? "Includes temperature-dependent losses and flow limits"
                    : "Closed circuit volume with duty and flow limits"}
                </div>
              </aside>
            ) : (
              <aside className="panel result-panel placeholder-panel">
                <p className="section-kicker">Live result</p>
                <Placeholder title="Select a construction to see results">
                  Choose the tank or buffer construction in step 2 below. The heat-up time, losses and flow
                  check appear here once the construction is set.
                </Placeholder>
              </aside>
            )}
          </section>

          {isTank ? (
            <>
              <section className="panel section-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">2 · Construction</p>
                    <h2>Construction</h2>
                  </div>
                  <div className="u-badge">
                    <span>Wall U-value</span>
                    <b>{constructionChosen ? `${format(input.wallU, 2)} W/m²K` : "—"}</b>
                  </div>
                </div>

                <div className="construction-grid">
                  <div>
                    <label className="field">
                      <span className="field-label">Tank / buffer construction</span>
                      <select
                        className={constructionChosen ? "" : "attention"}
                        value={constructionChosen ? input.construction : ""}
                        onChange={(event) => {
                          const construction = CONSTRUCTIONS.find((item) => item.id === event.target.value);
                          setInput((current) => ({
                            ...current,
                            construction: event.target.value,
                            wallU: construction?.u ?? current.wallU,
                          }));
                        }}
                      >
                        <option value="" disabled>
                          Select a construction…
                        </option>
                        {CONSTRUCTIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <small>{constructionChosen ? selectedConstruction?.detail : "Required before results are shown."}</small>
                    </label>
                    <NumberField
                      label="Wall U-value"
                      value={input.wallU}
                      onChange={(value) => {
                        setInput((current) => ({ ...current, wallU: value, construction: "custom" }));
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
                    {constructionChosen ? (
                      <div className="derived-strip">
                        <span><b>{format(result.wallArea, 2)} m²</b> wall {input.baseExposed ? "+ base" : ""} area</span>
                        <span><b>{format(result.transmissionWK, 0)} W/K</b> transmission (walls{input.topType !== "open" ? " + cover" : ""})</span>
                      </div>
                    ) : null}
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

              <section className="panel section-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">3 · Surface losses</p>
                    <h2>{input.topType === "open" ? "Open-top conditions" : "Closed tank losses"}</h2>
                  </div>
                  <span className="ambient-chip">{format(input.ambient, 0)}°C ambient</span>
                </div>

                {!constructionChosen ? (
                  <Placeholder title="Losses need a construction">
                    Select the construction in step 2. The open-top conditions and loss breakdown are then
                    calculated for the chosen U-value.
                  </Placeholder>
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
                          onClick={() => patch("airCase", item.id)}
                        >
                          <span className="scenario-check">{input.airCase === item.id ? "✓" : ""}</span>
                          <span className="scenario-name">{item.label}</span>
                          <strong>{format(item.total, 1)} <small>kW</small></strong>
                          <span className="scenario-desc">{item.description}</span>
                          <span className="scenario-time">{formatDuration(item.recoveryMinutes)} {processWord}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="closed-summary">
                    <span>Closed top transmission</span>
                    <strong>{format(result.calculatedAtTarget.lid, 2)} kW</strong>
                    <p>Evaporation, direct water-surface convection and radiation are excluded.</p>
                  </div>
                )}

                <div className="loss-layout">
                  <div className="loss-bars">
                    {constructionChosen ? (
                      [
                        { label: "Walls + base", value: result.calculatedAtTarget.walls, colour: "var(--navy)" },
                        { label: "Evaporation", value: result.calculatedAtTarget.evaporation, colour: "var(--brand)" },
                        { label: "Convection", value: result.calculatedAtTarget.convection, colour: "var(--amber)" },
                        { label: "Radiation", value: result.calculatedAtTarget.radiation, colour: "var(--coral)" },
                        { label: "Closed cover", value: result.calculatedAtTarget.lid, colour: "var(--blue)" },
                        { label: "Pipework", value: result.calculatedAtTarget.pipework, colour: "var(--navy-mid)" },
                        { label: "Additional process", value: result.process, colour: "var(--purple)" },
                      ]
                        .filter((item) => Math.abs(item.value) > 0.001)
                        .map((item) => {
                          const total = Math.abs(result.calculatedHold);
                          const width = total > 0 ? Math.max(3, (Math.abs(item.value) / total) * 100) : 0;
                          return (
                            <div className="loss-row" key={item.label}>
                              <span>{item.label}</span>
                              <div><i style={{ width: `${width}%`, background: item.colour }} /></div>
                              <b>{format(Math.abs(item.value), 2)} kW</b>
                            </div>
                          );
                        })
                    ) : (
                      <p className="section-intro">Loss breakdown appears after a construction is selected.</p>
                    )}
                    {constructionChosen ? (
                      <div className="loss-total">
                        <span>Calculated {result.isCooling ? "gain" : "loss"} at {format(result.finishTemperature, 0)} °C</span>
                        <b>{format(Math.abs(result.calculatedHold), 2)} kW · {format(result.standingEnergyPerDay, 0)} kWh/day</b>
                      </div>
                    ) : null}
                  </div>
                  <div className="temperature-inputs">
                    <NumberField label="Ambient temperature" value={input.ambient} onChange={(value) => patch("ambient", value)} unit="°C" step={1} />
                    <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
                    <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} warning={input.finishTemperature === input.startTemperature ? "Same as start" : undefined} />
                    {input.topType === "open" ? (
                      <NumberField label="Relative humidity" value={input.humidity} onChange={(value) => patch("humidity", value)} unit="%" step={5} min={0} max={100} warning={input.humidity < 0 || input.humidity > 100 ? "0–100 %" : undefined} />
                    ) : null}
                    <NumberField
                      label="Insulated pipework losses"
                      value={input.pipeworkLossWK}
                      onChange={(value) => patch("pipeworkLossWK", value)}
                      unit="W/K"
                      step={10}
                      min={0}
                      hint="Optional. Roughly 0.2–0.4 W/mK per metre of insulated pipe."
                    />
                  </div>
                </div>
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
                Closed circuit mode uses the total system fluid volume. Tank surface losses are excluded; add
                insulated pipework losses here and any known continuous heat gain or load in the duty section.
              </p>
              <div className="closed-circuit-inputs">
                <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
                <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} warning={input.finishTemperature === input.startTemperature ? "Same as start" : undefined} />
                <NumberField label="Ambient temperature" value={input.ambient} onChange={(value) => patch("ambient", value)} unit="°C" step={1} hint="Used for pipework losses." />
                <NumberField
                  label="Insulated pipework losses"
                  value={input.pipeworkLossWK}
                  onChange={(value) => patch("pipeworkLossWK", value)}
                  unit="W/K"
                  step={10}
                  min={0}
                  hint="Optional. Roughly 0.2–0.4 W/mK per metre of insulated pipe."
                />
              </div>
            </section>
          )}

          <section className="panel section-panel recovery-panel">
            <div className="panel-heading recovery-heading">
              <div>
                <p className="section-kicker">{4 + stepOffset} · Duty and flow</p>
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
                  label={isTank ? "Design ΔT across exchanger" : "Design circuit ΔT"}
                  value={input.designDeltaT}
                  onChange={(value) => patch("designDeltaT", value)}
                  unit="K"
                  step={1}
                  min={0}
                  warning={!(input.designDeltaT > 0) ? "Enter a positive ΔT" : undefined}
                  hint={isTank ? "Temperature rise of the circulated fluid through the exchanger." : "Flow-to-return difference at design duty."}
                />
                <label className="toggle-row flow-toggle">
                  <span>
                    <b>Override flow / circulation</b>
                    <small>
                      {input.overrideFlow
                        ? "Duty is limited to what this flow can carry at the design ΔT."
                        : `Flow is derived from duty ÷ (ρ·cp·ΔT): ${format(result.designFlowLps, 2)} l/s.`}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={input.overrideFlow}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setInput((current) => ({
                        ...current,
                        overrideFlow: checked,
                        circulation:
                          checked && !(current.circulation > 0) && Number.isFinite(result.designFlowLps)
                            ? Math.round(result.designFlowLps * 3.6 * 10) / 10
                            : current.circulation,
                      }));
                    }}
                  />
                </label>
                <NumberField
                  label={input.overrideFlow ? "Flow / circulation (override)" : "Flow / circulation (derived)"}
                  value={
                    input.overrideFlow
                      ? input.flowUnit === "m3h"
                        ? input.circulation
                        : input.circulation / 3.6
                      : input.flowUnit === "m3h"
                        ? Math.round(result.flowM3h * 100) / 100
                        : Math.round(result.flowLps * 1000) / 1000
                  }
                  onChange={(value) =>
                    patch(
                      "circulation",
                      Number.isFinite(value)
                        ? input.flowUnit === "m3h"
                          ? value
                          : value * 3.6
                        : Number.NaN,
                    )
                  }
                  unit={input.flowUnit === "m3h" ? "m³/h" : "l/s"}
                  step={input.flowUnit === "m3h" ? 1 : 0.1}
                  min={0}
                  disabled={!input.overrideFlow}
                  hint={input.overrideFlow ? "e.g. a reheat case where only some pumps run." : "Switch the override on to enter a fixed circulation."}
                  labelAction={
                    <span className="mini-toggle" role="group" aria-label="Flow units">
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
                {isTank ? (
                  <>
                    <NumberField
                      label={result.isCooling ? "Chilled source temperature" : "Primary flow temperature"}
                      value={input.sourceFlowTemperature}
                      onChange={(value) => patch("sourceFlowTemperature", value)}
                      unit="°C"
                      step={1}
                      hint="Source temperature entering the plate heat exchanger."
                      warning={result.sourceUnreachable ? "Cannot reach the target" : undefined}
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
                    isTank
                      ? "Cold product, make-up liquid or other known process duty."
                      : result.isCooling
                        ? "Known heat gain that the chiller must also remove."
                        : "Known continuous load that the heat source must also serve."
                  }
                />
              </div>

              {constructionChosen ? (
                <div className="recovery-output">
                  <div className="recovery-primary">
                    <span>{result.flowLimited ? "Flow-limited duty" : input.recoveryMode === "available" ? "Delivered duty" : "Required duty"}</span>
                    <strong>{format(result.duty, 1)} kW</strong>
                    <small>
                      {result.flowLimited
                        ? `${format(result.requestedDuty, 1)} kW requested; ${format(result.flowM3h, 1)} m³/h at ${format(result.designDeltaT, 1)} K carries only ${format(result.duty, 1)} kW`
                        : input.recoveryMode === "available"
                          ? `Design flow ${format(result.designFlowLps, 2)} l/s · ${format(result.designFlowLps * 3.6, 1)} m³/h at ${format(result.designDeltaT, 1)} K`
                          : result.targetFlowLimited
                            ? `Current flow cannot deliver this duty within ${format(input.desiredMinutes, 0)} minutes`
                            : `Sized for a ${format(input.desiredMinutes, 0)} minute ${processWord} including selected loads`}
                    </small>
                  </div>
                  {result.flowLimited ? (
                    <div className="flow-warning">
                      <b>Flow is limiting the usable duty.</b>
                      <span>
                        Requested {format(result.requestedDuty, 1)} kW; flow-limited {format(result.duty, 1)} kW. The limited figure is used for
                        the {processWord} time. Increase the circulation or the design ΔT to recover the full duty.
                      </span>
                    </div>
                  ) : result.approachLimited || result.sourceUnreachable ? (
                    <div className="flow-warning">
                      <b>{result.sourceUnreachable ? "Source temperature cannot reach the target." : "Source approach limits duty near the target."}</b>
                      <span>
                        {result.sourceUnreachable
                          ? "Raise the source temperature or reduce the approach and target."
                          : `Only ${format(result.flowCapacityAtTarget, 1)} kW can be transferred at ${format(result.finishTemperature, 0)} °C.`}
                      </span>
                    </div>
                  ) : (
                    <div className="flow-ok">
                      <b>Flow can carry the {input.recoveryMode === "available" ? "entered" : "required"} duty.</b>
                      <span>The duty, ΔT and flow are compatible.</span>
                    </div>
                  )}
                  <div className="flow-summary">
                    <div>
                      <span>Requested duty</span>
                      <b>{format(result.requestedDuty, 1)} kW</b>
                    </div>
                    <div>
                      <span>Flow-limited duty (q·ρ·cp·ΔT)</span>
                      <b>{format(input.overrideFlow ? result.flowDutyCapacity : result.duty, 1)} kW</b>
                    </div>
                    <div>
                      <span>{input.overrideFlow ? "Entered flow" : "Design flow"}</span>
                      <b>{format(result.flowLps, 2)} l/s · {format(result.flowM3h, 1)} m³/h</b>
                    </div>
                    {input.overrideFlow ? (
                      <div>
                        <span>Design flow for full duty</span>
                        <b>{format(result.designFlowLps, 2)} l/s · {format(result.designFlowLps * 3.6, 1)} m³/h</b>
                      </div>
                    ) : null}
                    <div>
                      <span>Achieved ΔT at delivered duty</span>
                      <b>{format(result.flowTemperatureChange, 2)} K</b>
                    </div>
                    {isTank ? (
                      <div>
                        <span>Transferable at start / target</span>
                        <b>{format(result.flowCapacityAtStart, 1)} / {format(result.flowCapacityAtTarget, 1)} kW</b>
                      </div>
                    ) : null}
                    <div>
                      <span>Complete turnover</span>
                      <b>{formatDuration(result.turnoverMinutes)}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="recovery-output placeholder-output">
                  <Placeholder title="Select a construction to see the flow check">
                    Duty, flow and circulation results appear once the construction in step 2 is chosen.
                  </Placeholder>
                </div>
              )}
            </div>
          </section>

          <section className="panel section-panel heatup-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">{5 + stepOffset} · {result.isCooling ? "Cool-down" : "Heat-up"} time</p>
                <h2>{result.isCooling ? "Cool-down" : "Heat-up"} with and without losses</h2>
              </div>
              <div className="segmented four" role="group" aria-label="Standing loss basis">
                {LOSS_MODES.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={input.lossMode === item.id ? "active" : ""}
                    onClick={() => patch("lossMode", item.id)}
                    title={item.detail}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="heatup-grid">
              <div className="heatup-inputs">
                <p className="section-intro">
                  {LOSS_MODES.find((item) => item.id === input.lossMode)?.detail}. Losses are recalculated at each
                  temperature step, so the {processWord} slows as the fluid approaches the target.
                </p>
                {lossModeField}
                <div className="temperature-strip">
                  <div>
                    <span>Start</span>
                    <b>{format(result.startTemperature, 1)} °C</b>
                  </div>
                  <div>
                    <span>Target</span>
                    <b>{format(result.finishTemperature, 1)} °C</b>
                  </div>
                  <div>
                    <span>Ambient</span>
                    <b>{format(result.ambient, 1)} °C</b>
                  </div>
                  {isTank ? (
                    <div>
                      <span>{result.isCooling ? "Chilled source" : "Primary flow"}</span>
                      <b>{format(input.sourceFlowTemperature, 1)} °C</b>
                    </div>
                  ) : null}
                  <div>
                    <span>{isTank ? "Secondary in → out at target" : "Flow / return at target"}</span>
                    <b>
                      {isTank
                        ? `${format(result.finishTemperature, 1)} → ${format(
                            result.finishTemperature + (result.isCooling ? -1 : 1) * (Number.isFinite(result.flowTemperatureChange) ? result.flowTemperatureChange : 0),
                            1,
                          )} °C`
                        : `${format(result.finishTemperature, 1)} / ${format(result.finishTemperature + (result.isCooling ? 1 : -1) * result.designDeltaT, 1)} °C`}
                    </b>
                  </div>
                </div>
              </div>

              {constructionChosen ? (
                <div className="heatup-output">
                  <div className="heatup-card primary">
                    <span>With standing losses</span>
                    <strong>{formatDuration(result.recoveryMinutes)}</strong>
                    <small>
                      Average loss {format(result.withLosses.averageLoss, 2)} kW · {format(result.withLosses.lossEnergyKWh, 1)} kWh lost during the {processWord}
                    </small>
                  </div>
                  <div className="heatup-card">
                    <span>With no losses</span>
                    <strong>{formatDuration(result.noLossMinutes)}</strong>
                    <small>
                      C·ΔT ÷ P = {format(result.sensibleEnergyKWh, 1)} kWh ÷ {format(result.duty, 1)} kW
                      {result.approachLimited ? " (approach limit applied)" : ""}
                    </small>
                  </div>
                  <div className="heatup-card">
                    <span>Hold at target</span>
                    <strong>{format(result.holdDuty, 2)} kW</strong>
                    <small>
                      {format(result.effectiveWK, 0)} W/K equivalent · {format(result.standingEnergyPerDay, 0)} kWh per day
                    </small>
                  </div>
                  <div className="heatup-card">
                    <span>Loss penalty</span>
                    <strong>
                      {Number.isFinite(result.recoveryMinutes) && Number.isFinite(result.noLossMinutes)
                        ? `+${formatDuration(result.recoveryMinutes - result.noLossMinutes)}`
                        : "—"}
                    </strong>
                    <small>Extra time attributable to losses and continuous load</small>
                  </div>
                  <p className="heatup-summary">{summarySentence}</p>
                </div>
              ) : (
                <div className="heatup-output">
                  <Placeholder title="Select a construction to see the heat-up time">
                    The time with and without losses is shown here once the construction in step 2 is chosen.
                  </Placeholder>
                </div>
              )}
            </div>
          </section>

          <details className="panel assumptions">
            <summary>
              <span>
                <b>Advanced assumptions</b>
                <small>
                  Glycol and fluid properties
                  {isTank ? ", shell mass and evaporation adjustment" : ""}
                </small>
              </span>
              <span className="summary-plus">+</span>
            </summary>
            <div className="advanced-grid">
              <label className="field">
                <span className="field-label">Glycol type</span>
                <select value={input.glycolType} onChange={(event) => patch("glycolType", event.target.value as GlycolType)}>
                  {(Object.keys(GLYCOLS) as GlycolType[]).map((item) => (
                    <option key={item} value={item}>
                      {GLYCOLS[item].label}
                    </option>
                  ))}
                </select>
                <small>Indicative freeze point {format(result.fluid.freeze, 0)} °C</small>
              </label>
              <label className="field">
                <span className="field-label">Glycol concentration</span>
                <select value={input.glycolPercent} onChange={(event) => patch("glycolPercent", Number(event.target.value))}>
                  {GLYCOL_STEPS.map((item) => (
                    <option key={item} value={item}>
                      {item === 0 ? "0 % (water)" : `${item} % by mass`}
                    </option>
                  ))}
                </select>
                <small>
                  Table: {format(glycolAvailable.density, 0)} kg/m³ · {format(glycolAvailable.specificHeat, 3)} kJ/kgK
                </small>
              </label>
              <NumberField
                label="Fluid density"
                value={input.fluidOverride ? input.density : glycolAvailable.density}
                onChange={(value) => patch("density", value)}
                unit="kg/m³"
                step={10}
                min={1}
                disabled={!input.fluidOverride}
              />
              <NumberField
                label="Specific heat"
                value={input.fluidOverride ? input.specificHeat : glycolAvailable.specificHeat}
                onChange={(value) => patch("specificHeat", value)}
                unit="kJ/kgK"
                step={0.01}
                min={0.01}
                disabled={!input.fluidOverride}
              />
              <label className="toggle-row">
                <span>
                  <b>Override fluid properties</b>
                  <small>Enter density and specific heat manually instead of the glycol table</small>
                </span>
                <input
                  type="checkbox"
                  checked={input.fluidOverride}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setInput((current) => ({
                      ...current,
                      fluidOverride: checked,
                      density: checked ? glycolAvailable.density : current.density,
                      specificHeat: checked ? glycolAvailable.specificHeat : current.specificHeat,
                    }));
                  }}
                />
              </label>
              {isTank ? (
                <>
                  <NumberField label="Tank steel mass" value={input.steelMass} onChange={(value) => patch("steelMass", value)} unit="kg" step={10} min={0} hint="Adds 0.5 kJ/kgK of shell capacity." />
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
            <div className="method-note">
              <b>Calculation basis</b>
              <p>
                Heating and cooling energy use C × |ΔT| where C = mass × specific heat (+ 0.5 kJ/kgK for tank steel).
                Design flow q = P ÷ (ρ·cp·ΔT). With the flow override on, the delivered duty is limited to q·ρ·cp·ΔT and
                that limited figure is used for the {processWord} time. In buffer or bath mode the exchanger can also
                only transfer q·ρ·cp·(source − approach − T) as the fluid approaches the source temperature.
              </p>
              <p>
                Wall and closed-cover losses use U × area × temperature difference. Open-top losses combine estimated
                evaporation, convection and radiation. Pipework losses use the entered W/K. The heat-up integrates 500
                temperature steps, so losses rise and the rate falls as the fluid warms; the no-loss time is the same
                integration with losses and continuous load set to zero. Manual kW or W/K figures replace the calculated
                standing loss when selected.
              </p>
              <p>
                Glycol properties are interpolated from indicative published tables at about 20–40 °C. Propylene 30 %:
                ≈1024 kg/m³, 3.88 kJ/kgK; ethylene 30 %: ≈1040 kg/m³, 3.68 kJ/kgK. Indicative construction U-values are
                starting assumptions; replace them with the manufacturer’s declared value where available.
              </p>
            </div>
          </details>

          <details className="panel assumptions project-panel">
            <summary>
              <span>
                <b>Project reference</b>
                <small>
                  {project.name || project.reference
                    ? [project.name, project.reference, project.client].filter(Boolean).join(" · ")
                    : "Project, client, engineer and notes for the printed report"}
                </small>
              </span>
              <span className="summary-plus">+</span>
            </summary>
            <div className="project-grid">
              <TextField label="Project name" value={project.name} onChange={(value) => patchProject("name", value)} placeholder="e.g. Process bath heating upgrade" />
              <TextField label="Reference" value={project.reference} onChange={(value) => patchProject("reference", value)} placeholder="Job or drawing number" />
              <TextField label="Client" value={project.client} onChange={(value) => patchProject("client", value)} />
              <TextField label="Engineer" value={project.engineer} onChange={(value) => patchProject("engineer", value)} />
              <TextField label="Date" value={project.date} onChange={(value) => patchProject("date", value)} type="date" />
              <TextField label="Notes" value={project.notes} onChange={(value) => patchProject("notes", value)} multiline placeholder="Assumptions, revision notes or anything to appear on the report" />
            </div>
            <div className="project-actions">
              <button type="button" className="action-button primary" onClick={openReport}>
                Preview report / Save as PDF
              </button>
              <button type="button" className="action-button" onClick={() => setProject({ ...EMPTY_PROJECT, date: todayIso() })}>
                Clear project details
              </button>
            </div>
          </details>

          <footer>
            <p>Buffer and Bath Heat Planner v{APP_VERSION} · Indicative engineering calculation</p>
            <p>Verify final exchanger selection, materials, fouling allowance and pressure drop with the manufacturer.</p>
          </footer>
        </div>
      </div>

      <div className={view === "report" ? "report report-visible" : "report"} aria-hidden={view !== "report"}>
        <div className="report-toolbar">
          <button type="button" className="action-button" onClick={() => setView("app")}>
            ← Back to calculator
          </button>
          <span>Use “Save as PDF” in the print dialog to export the report.</span>
          <button type="button" className="action-button primary" onClick={printReport}>
            Print / Save as PDF
          </button>
        </div>
        <Report input={input} result={result} project={project} constructionChosen={constructionChosen} />
      </div>
    </main>
  );
}
