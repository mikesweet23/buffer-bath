"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

type Shape = "rectangular" | "cylindrical";
type TopType = "open" | "closed-wall" | "closed-insulated" | "closed-custom";
type RecoveryMode = "available" | "required";
type AirCase = "quiet" | "agitated" | "draught" | "ventilated";
type FlowUnit = "m3h" | "lps";
type Application = "tank" | "lphw" | "chw";

type Inputs = {
  application: Application;
  shape: Shape;
  length: number;
  width: number;
  depth: number;
  diameter: number;
  measuredVolume: number;
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
  circulation: number;
  flowUnit: FlowUnit;
  sourceFlowTemperature: number;
  minimumApproach: number;
  maxCircuitDeltaT: number;
  additionalLoad: number;
  density: number;
  specificHeat: number;
  steelMass: number;
};

const DEFAULTS: Inputs = {
  application: "tank",
  shape: "rectangular",
  length: 2.5,
  width: 2.5,
  depth: 0.8,
  diameter: 2.82,
  measuredVolume: 0,
  construction: "twin-50",
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
  circulation: 30,
  flowUnit: "m3h",
  sourceFlowTemperature: 80,
  minimumApproach: 3,
  maxCircuitDeltaT: 20,
  additionalLoad: 0,
  density: 1000,
  specificHeat: 4.186,
  steelMass: 0,
};

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

function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  hint,
  labelAction,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  min?: number;
  hint?: string;
  labelAction?: ReactNode;
}) {
  return (
    <div className="field">
      <span className="field-label-row">
        <span className="field-label">{label}</span>
        {labelAction}
      </span>
      <label className="input-wrap">
        <input
          type="number"
          inputMode="decimal"
          aria-label={`${label} ${unit}`}
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
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
              <stop offset="0" stopColor="#dbe7ea" />
              <stop offset=".46" stopColor="#ffffff" />
              <stop offset="1" stopColor="#aabec3" />
            </linearGradient>
            <linearGradient id="water-cyl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#52dfd2" stopOpacity=".82" />
              <stop offset="1" stopColor="#0d96a0" stopOpacity=".94" />
            </linearGradient>
          </defs>
          <path d="M92 56v122c0 23 35 42 88 42s88-19 88-42V56" fill="url(#cyl-body)" stroke="#18343d" strokeWidth="3" />
          <path d="M92 91v87c0 23 35 42 88 42s88-19 88-42V91c-25 15-150 15-176 0Z" fill="url(#water-cyl)" opacity=".82" />
          <ellipse cx="180" cy="56" rx="88" ry="31" fill={isOpen ? "#49d8cf" : "#d6e3e6"} stroke="#18343d" strokeWidth="3" />
          {isOpen ? <ellipse cx="180" cy="56" rx="73" ry="23" fill="#aaf8ed" opacity=".7" /> : null}
          {!isOpen ? <path d="M103 51c35-22 120-22 154 0" fill="none" stroke="#779097" strokeWidth="2" /> : null}
          <path d="M70 55v165M60 55h20M60 220h20" stroke="#6c8289" strokeWidth="2" />
          <text x="54" y="142" textAnchor="middle" transform="rotate(-90 54 142)" className="svg-label">
            {format(input.depth, 2)} m liquid depth
          </text>
          <path d="M92 232h176M92 226v12M268 226v12" stroke="#6c8289" strokeWidth="2" />
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
            <stop offset="0" stopColor="#b7cbd0" />
            <stop offset=".52" stopColor="#f7fbfc" />
            <stop offset="1" stopColor="#a1b7bd" />
          </linearGradient>
          <linearGradient id="tank-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#61e9dc" />
            <stop offset="1" stopColor="#0f98a3" />
          </linearGradient>
        </defs>
        <path d="M75 69 238 33 310 68 145 105Z" fill={isOpen ? "#8cf4e8" : "#d6e3e6"} stroke="#18343d" strokeWidth="3" />
        {isOpen ? <path d="m89 71 148-31 58 28-149 31Z" fill="#55dbd2" opacity=".74" /> : null}
        <path d="m75 69 70 36v115L75 182Z" fill="#9eb5bb" stroke="#18343d" strokeWidth="3" />
        <path d="m145 105 165-37v112l-165 40Z" fill="url(#tank-front)" stroke="#18343d" strokeWidth="3" />
        <path d="M145 137 310 101v79l-165 40Z" fill="url(#tank-water)" opacity=".86" />
        <path d="m75 105 70 32 165-36" fill="none" stroke="#0f8790" strokeWidth="2" opacity=".65" />
        <path d="M53 69v113M44 69h18M44 182h18" stroke="#6c8289" strokeWidth="2" />
        <text x="36" y="129" textAnchor="middle" transform="rotate(-90 36 129)" className="svg-label">
          D {format(input.depth, 2)} m
        </text>
        <path d="m146 235 164-40M143 226l5 17M308 187l5 17" stroke="#6c8289" strokeWidth="2" />
        <text x="232" y="228" textAnchor="middle" transform="rotate(-14 232 228)" className="svg-label">
          L {format(input.length, 2)} m
        </text>
        <path d="m78 201 64 32M74 209l8-16M138 241l8-16" stroke="#6c8289" strokeWidth="2" />
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
        <rect x="125" y="76" width="130" height="98" rx="18" fill="url(#circuit-plant)" stroke="#18343d" strokeWidth="3" />
        <text x="190" y="112" textAnchor="middle" className="svg-label circuit-title">
          {cooling ? "CHILLED CIRCUIT" : "LPHW CIRCUIT"}
        </text>
        <text x="190" y="143" textAnchor="middle" className="circuit-volume">
          {format(volumeLitres, 0)} L
        </text>
        <path d="M125 98H73c-28 0-42 18-42 46s14 46 42 46h234c28 0 42-18 42-46s-14-46-42-46h-52" fill="none" stroke={cooling ? "#1789ac" : "#d56b33"} strokeWidth="10" strokeLinecap="round" />
        <path d="m305 89 15 9-15 9M75 181l-15 9 15 9" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="190" cy="48" r="22" fill="#fff" stroke="#18343d" strokeWidth="3" />
        <path d="M190 70v16" stroke="#18343d" strokeWidth="3" />
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

export default function Home() {
  const [input, setInput] = useState<Inputs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let storedInput: Inputs | null = null;
    try {
      const stored = window.localStorage.getItem("bath-loss-calculator-v1");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Inputs>;
        storedInput = { ...DEFAULTS, ...parsed };
        storedInput.construction =
          LEGACY_CONSTRUCTIONS[storedInput.construction] ?? storedInput.construction;
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
    window.localStorage.setItem("bath-loss-calculator-v1", JSON.stringify(input));
  }, [input, loaded]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    }
  }, []);

  const patch = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const result = useMemo(() => {
    const safe = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
    const density = Math.max(1, safe(input.density, 1000));
    const specificHeat = Math.max(0.01, safe(input.specificHeat, 4.186));
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
    const volumeLitres =
      input.application === "tank"
        ? safe(input.measuredVolume) > 0
          ? input.measuredVolume
          : geometricVolume
        : Math.max(0, safe(input.measuredVolume));
    const wallArea = sideArea + (input.baseExposed ? baseArea : 0);
    const fluidMass = (volumeLitres / 1000) * density;
    const thermalCapacity =
      fluidMass * specificHeat + Math.max(0, safe(input.steelMass)) * 0.5;
    const startTemperature = safe(input.startTemperature);
    const finishTemperature = safe(input.finishTemperature);
    const signedDelta = finishTemperature - startTemperature;
    const direction = signedDelta < 0 ? -1 : 1;
    const deltaTemperature = Math.abs(signedDelta);
    const isCooling = direction < 0;
    const sensibleEnergyKWh = (thermalCapacity * deltaTemperature) / 3600;
    const circulationM3h = Math.max(0, safe(input.circulation));
    const circulationLps = circulationM3h / 3.6;
    const flowCapacityPerK = circulationLps * (density / 1000) * specificHeat;
    const ambientVapourPressure =
      (Math.max(0, Math.min(100, safe(input.humidity))) / 100) *
      saturationPressure(safe(input.ambient));
    const evaporationCoefficient = 2160 / saturationPressure(60);

    const openTopBreakdown = (temperature: number, airCase: AirCase) => {
      const condition = AIR_CASES[airCase];
      const delta = temperature - safe(input.ambient);
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
        (emissivity *
          stefanBoltzmann *
          topArea *
          ((temperature + 273.15) ** 4 - (safe(input.ambient) + 273.15) ** 4)) /
        1000;
      return { evaporation, convection, radiation };
    };

    const breakdownAt = (temperature: number, airCase: AirCase) => {
      const process = Math.max(0, safe(input.additionalLoad));
      if (input.application !== "tank") {
        return {
          walls: 0,
          lid: 0,
          evaporation: 0,
          convection: 0,
          radiation: 0,
          process,
          surface: 0,
          total: process,
        };
      }

      const delta = temperature - safe(input.ambient);
      const walls = (Math.max(0, safe(input.wallU)) * wallArea * delta) / 1000;
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
        const selectedLidU =
          input.topType === "closed-wall"
            ? input.wallU
            : input.topType === "closed-insulated"
              ? 0.8
              : input.lidU;
        lid = (Math.max(0, safe(selectedLidU)) * topArea * delta) / 1000;
      }
      const surface = walls + lid + evaporation + convection + radiation;
      return {
        walls,
        lid,
        evaporation,
        convection,
        radiation,
        process,
        surface,
        total: (isCooling ? -surface : surface) + process,
      };
    };

    const flowCapacityAt = (temperature: number) => {
      if (flowCapacityPerK <= 0) return 0;
      if (input.application === "tank") {
        const source = safe(input.sourceFlowTemperature);
        const approach = Math.max(0, safe(input.minimumApproach));
        const availableDelta = isCooling
          ? temperature - (source + approach)
          : source - approach - temperature;
        return flowCapacityPerK * Math.max(0, availableDelta);
      }
      return flowCapacityPerK * Math.max(0, safe(input.maxCircuitDeltaT));
    };

    const timeForPower = (
      power: number,
      airCase = input.airCase,
      applyFlowLimit = true,
      ignoreLoads = false,
    ) => {
      if (deltaTemperature <= 0) return 0;
      const steps = 500;
      const temperatureStep = deltaTemperature / steps;
      let seconds = 0;
      for (let index = 0; index < steps; index += 1) {
        const temperature =
          startTemperature + direction * (index + 0.5) * temperatureStep;
        const usableDuty = applyFlowLimit
          ? Math.min(Math.max(0, power), flowCapacityAt(temperature))
          : Math.max(0, power);
        const opposingLoad = ignoreLoads ? 0 : breakdownAt(temperature, airCase).total;
        const netPower = usableDuty - opposingLoad;
        if (netPower <= 0.001) return Number.POSITIVE_INFINITY;
        seconds += (thermalCapacity * temperatureStep) / netPower;
      }
      return seconds / 60;
    };

    const requiredPower = () => {
      if (deltaTemperature <= 0 || safe(input.desiredMinutes) <= 0) {
        return Math.max(0, breakdownAt(finishTemperature, input.airCase).total);
      }
      const targetMinutes = Math.max(0.1, safe(input.desiredMinutes));
      let low = Math.max(0, breakdownAt(finishTemperature, input.airCase).total) + 0.001;
      let high = Math.max(low + 1, sensibleEnergyKWh / (targetMinutes / 60) + low);
      while (timeForPower(high, input.airCase, false) > targetMinutes && high < 100000) {
        high *= 1.5;
      }
      for (let index = 0; index < 70; index += 1) {
        const midpoint = (low + high) / 2;
        if (timeForPower(midpoint, input.airCase, false) > targetMinutes) low = midpoint;
        else high = midpoint;
      }
      return high;
    };

    const duty =
      input.recoveryMode === "available"
        ? Math.max(0, safe(input.availableDuty))
        : requiredPower();
    const recoveryMinutes = timeForPower(duty);
    const noLossMinutes = timeForPower(duty, input.airCase, true, true);
    const flowTemperatureChange = flowCapacityPerK > 0 ? duty / flowCapacityPerK : NaN;
    const turnoverMinutes =
      circulationM3h > 0 ? (volumeLitres / 1000 / circulationM3h) * 60 : NaN;
    const flowCapacityAtStart = flowCapacityAt(startTemperature);
    const flowCapacityAtTarget = flowCapacityAt(finishTemperature);
    const effectiveDutyAtStart = Math.min(duty, flowCapacityAtStart);
    const effectiveDutyAtTarget = Math.min(duty, flowCapacityAtTarget);
    const designDelta =
      input.application === "tank"
        ? isCooling
          ? finishTemperature - (safe(input.sourceFlowTemperature) + Math.max(0, safe(input.minimumApproach)))
          : safe(input.sourceFlowTemperature) - Math.max(0, safe(input.minimumApproach)) - finishTemperature
        : Math.max(0, safe(input.maxCircuitDeltaT));
    const requiredFlowLps =
      designDelta > 0
        ? duty / ((density / 1000) * specificHeat * designDelta)
        : Number.POSITIVE_INFINITY;
    const flowLimited =
      duty > Math.min(flowCapacityAtStart, flowCapacityAtTarget) + 0.05;
    const targetFlowLimited =
      input.recoveryMode === "required" &&
      (!Number.isFinite(recoveryMinutes) ||
        recoveryMinutes > Math.max(0, safe(input.desiredMinutes)) + 0.5);

    const cases = (Object.keys(AIR_CASES) as AirCase[]).map((airCase) => ({
      id: airCase,
      ...AIR_CASES[airCase],
      breakdown: breakdownAt(finishTemperature, airCase),
      recoveryMinutes: timeForPower(duty, airCase),
    }));

    return {
      topArea,
      sideArea,
      baseArea,
      wallArea,
      geometricVolume,
      volumeLitres,
      fluidMass,
      thermalCapacity,
      sensibleEnergyKWh,
      duty,
      recoveryMinutes,
      noLossMinutes,
      flowTemperatureChange,
      turnoverMinutes,
      flowCapacityAtStart,
      flowCapacityAtTarget,
      effectiveDutyAtStart,
      effectiveDutyAtTarget,
      requiredFlowLps,
      flowLimited,
      targetFlowLimited,
      isCooling,
      selectedBreakdown: breakdownAt(finishTemperature, input.airCase),
      cases,
    };
  }, [input]);

  const selectedConstruction = CONSTRUCTIONS.find((item) => item.id === input.construction);
  const impossible = !Number.isFinite(result.recoveryMinutes);
  const selectedCase = AIR_CASES[input.airCase];
  const application = APPLICATIONS[input.application];
  const processWord = result.isCooling ? "cool-down" : "heat-up";
  const energyWord = result.isCooling ? "Cooling" : "Heating";
  const dutyLabel =
    input.application === "tank"
      ? "Available exchanger duty"
      : result.isCooling
        ? "Available cooling duty"
        : "Available heating duty";

  const selectApplication = (next: Application) => {
    setInput((current) => {
      const geometricVolume =
        current.shape === "rectangular"
          ? Math.max(0, current.length) * Math.max(0, current.width) * Math.max(0, current.depth) * 1000
          : (Math.PI * Math.max(0, current.diameter) ** 2 / 4) * Math.max(0, current.depth) * 1000;
      const knownVolume =
        current.measuredVolume > 0 ? current.measuredVolume : geometricVolume;
      if (next === "lphw") {
        return {
          ...current,
          application: next,
          measuredVolume: knownVolume,
          startTemperature: 20,
          finishTemperature: 80,
          maxCircuitDeltaT: 20,
        };
      }
      if (next === "chw") {
        return {
          ...current,
          application: next,
          measuredVolume: knownVolume,
          startTemperature: 20,
          finishTemperature: 6,
          maxCircuitDeltaT: 6,
        };
      }
      return {
        ...current,
        application: next,
        startTemperature: 16,
        finishTemperature: 60,
      };
    });
  };

  const reset = () => {
    setInput(DEFAULTS);
    window.localStorage.removeItem("bath-loss-calculator-v1");
  };

  return (
    <main>
      <header className="app-header">
        <div className="header-inner">
          <div>
            <p className="eyebrow">HVAC &amp; process engineering tool</p>
            <h1>Buffer and Bath Heat Planner</h1>
            <p className="header-copy">
              Plan tank losses or the heating and cooling recovery of a known water volume, with
              flow checked against the available duty.
            </p>
          </div>
          <button className="reset-button" type="button" onClick={reset}>
            Reset example
          </button>
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
                    ? "Optional. Leave blank to use the drawing."
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

          <aside className={`panel result-panel ${impossible ? "warning-panel" : ""}`}>
            <p className="section-kicker">Live result</p>
            <div className="result-lead">
              <span>{input.recoveryMode === "available" ? `Estimated ${processWord}` : "Required duty"}</span>
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
                  : application.label.toLowerCase()}
              </small>
            </div>
            {impossible || result.targetFlowLimited ? (
              <div className="warning-message">
                {result.flowLimited
                  ? "The entered flow cannot carry the full duty under the selected temperature limit."
                  : "Available duty is overcome by the selected standing or continuous load."}
              </div>
            ) : null}
            <div className="metric-grid">
              <div>
                <span>{input.application === "tank" ? (result.isCooling ? "Standing gain" : "Hold duty") : "Continuous load"}</span>
                <b>{format(result.selectedBreakdown.total, 1)} kW</b>
              </div>
              <div>
                <span>{energyWord} energy</span>
                <b>{format(result.sensibleEnergyKWh, 1)} kWh</b>
              </div>
              <div>
                <span>Duty ÷ flow ΔT</span>
                <b>{format(result.flowTemperatureChange, 2)} K</b>
              </div>
              <div>
                <span>{input.application === "tank" ? "Tank turnover" : "System turnover"}</span>
                <b>{format(result.turnoverMinutes, 1)} min</b>
              </div>
            </div>
            <div className="result-note">
              <span className="pulse-dot" />
              {input.application === "tank"
                ? "Includes temperature-dependent losses and flow limits"
                : "Closed circuit volume with duty and flow limits"}
            </div>
          </aside>
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
              <b>{format(input.wallU, 2)} W/m²K</b>
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
                  {CONSTRUCTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <small>{selectedConstruction?.detail}</small>
              </label>
              <NumberField
                label="Wall U-value"
                value={input.wallU}
                onChange={(value) => {
                  patch("wallU", value);
                  patch("construction", "custom");
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

        <section className="panel section-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">3 · Surface losses</p>
              <h2>{input.topType === "open" ? "Open-top conditions" : "Closed tank losses"}</h2>
            </div>
            <span className="ambient-chip">{format(input.ambient, 0)}°C ambient</span>
          </div>

          {input.topType === "open" ? (
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

          <div className="loss-layout">
            <div className="loss-bars">
              {[
                { label: "Walls + base", value: result.selectedBreakdown.walls, colour: "var(--navy)" },
                { label: "Evaporation", value: result.selectedBreakdown.evaporation, colour: "var(--teal)" },
                { label: "Convection", value: result.selectedBreakdown.convection, colour: "var(--amber)" },
                { label: "Radiation", value: result.selectedBreakdown.radiation, colour: "var(--coral)" },
                { label: "Closed cover", value: result.selectedBreakdown.lid, colour: "var(--blue)" },
                { label: "Additional process", value: result.selectedBreakdown.process, colour: "var(--purple)" },
              ]
                .filter((item) => item.value > 0.001)
                .map((item) => {
                  const width =
                    result.selectedBreakdown.total > 0
                      ? Math.max(3, (item.value / result.selectedBreakdown.total) * 100)
                      : 0;
                  return (
                    <div className="loss-row" key={item.label}>
                      <span>{item.label}</span>
                      <div><i style={{ width: `${width}%`, background: item.colour }} /></div>
                      <b>{format(item.value, 2)} kW</b>
                    </div>
                  );
                })}
            </div>
            <div className="temperature-inputs">
              <NumberField label="Ambient temperature" value={input.ambient} onChange={(value) => patch("ambient", value)} unit="°C" step={1} />
              <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
              <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} />
              {input.topType === "open" ? (
                <NumberField label="Relative humidity" value={input.humidity} onChange={(value) => patch("humidity", value)} unit="%" step={5} min={0} />
              ) : null}
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
              Closed circuit mode uses the total system water volume. Tank surface losses are
              excluded; enter any known continuous heat gain or load in the duty section.
            </p>
            <div className="closed-circuit-inputs">
              <NumberField label="Start temperature" value={input.startTemperature} onChange={(value) => patch("startTemperature", value)} unit="°C" step={1} />
              <NumberField label="Target temperature" value={input.finishTemperature} onChange={(value) => patch("finishTemperature", value)} unit="°C" step={1} />
            </div>
          </section>
        )}

        <section className="panel section-panel recovery-panel">
          <div className="panel-heading recovery-heading">
            <div>
              <p className="section-kicker">{input.application === "tank" ? "4" : "3"} · Recovery</p>
              <h2>Duty and flow / circulation</h2>
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
                label="Flow / circulation"
                value={input.flowUnit === "m3h" ? input.circulation : input.circulation / 3.6}
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
                step={1}
                min={0}
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
              ) : (
                <NumberField
                  label="Maximum circuit ΔT"
                  value={input.maxCircuitDeltaT}
                  onChange={(value) => patch("maxCircuitDeltaT", value)}
                  unit="K"
                  step={1}
                  min={0}
                  hint="Design flow-to-return temperature difference used to limit carried duty."
                />
              )}
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
                <span>{input.recoveryMode === "available" ? `Calculated ${processWord}` : "Required duty"}</span>
                <strong>
                  {input.recoveryMode === "available"
                    ? formatDuration(result.recoveryMinutes)
                    : `${format(result.duty, 1)} kW`}
                </strong>
                <small>
                  {input.recoveryMode === "available"
                    ? `${format(result.noLossMinutes, 0)} min with the flow limit but no standing or continuous load`
                    : result.targetFlowLimited
                      ? `Current flow cannot deliver this duty within ${format(input.desiredMinutes, 0)} minutes`
                      : `${format(input.desiredMinutes, 0)} minute target including selected loads`}
                </small>
              </div>
              {result.flowLimited ? (
                <div className="flow-warning">
                  <b>Flow is limiting usable duty.</b>
                  <span>
                    Increase flow, increase the permitted temperature difference, or reduce the
                    entered duty.
                  </span>
                </div>
              ) : (
                <div className="flow-ok">
                  <b>Flow can carry the entered duty.</b>
                  <span>The duty and selected temperature limit are compatible.</span>
                </div>
              )}
              <div className="flow-summary">
                <div>
                  <span>Flow / circulation</span>
                  <b>{format(input.circulation / 3.6, 2)} l/s · {format(input.circulation, 1)} m³/h</b>
                </div>
                <div>
                  <span>Duty ÷ flow temperature change</span>
                  <b>{format(result.flowTemperatureChange, 2)} K</b>
                </div>
                <div>
                  <span>Flow-limited capacity at start</span>
                  <b>{format(result.flowCapacityAtStart, 1)} kW</b>
                </div>
                <div>
                  <span>Flow-limited capacity at target</span>
                  <b>{format(result.flowCapacityAtTarget, 1)} kW</b>
                </div>
                <div>
                  <span>Minimum flow for full duty</span>
                  <b>{format(result.requiredFlowLps, 2)} l/s · {format(result.requiredFlowLps * 3.6, 1)} m³/h</b>
                </div>
                <div>
                  <span>Complete turnover</span>
                  <b>{formatDuration(result.turnoverMinutes)}</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        <details className="panel assumptions">
          <summary>
            <span>
              <b>Advanced assumptions</b>
              <small>
                Fluid properties
                {input.application === "tank" ? ", shell mass and evaporation adjustment" : ""}
              </small>
            </span>
            <span className="summary-plus">+</span>
          </summary>
          <div className="advanced-grid">
            <NumberField label="Fluid density" value={input.density} onChange={(value) => patch("density", value)} unit="kg/m³" step={10} min={1} />
            <NumberField label="Specific heat" value={input.specificHeat} onChange={(value) => patch("specificHeat", value)} unit="kJ/kgK" step={0.01} min={0.01} />
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
          <div className="method-note">
            <b>Calculation basis</b>
            <p>
              Heating and cooling energy use mass × specific heat × absolute temperature change.
              Duty carried by the circuit is limited to mass flow × specific heat × the available
              temperature difference. A high entered duty therefore cannot be delivered by a low
              flow rate.
            </p>
            <p>
              In buffer or bath mode, wall and closed-cover losses use U × area × temperature
              difference. Open-top losses combine estimated evaporation, convection and radiation,
              recalculated throughout recovery. Closed circuit modes exclude tank surface losses
              and use only the entered total volume and additional continuous load.
            </p>
            <p>
              Indicative construction U-values are starting assumptions. Replace them with the
              manufacturer’s declared value where available.
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

