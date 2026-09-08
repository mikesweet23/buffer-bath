export type Shape = "rectangular" | "cylindrical";
export type TopType = "open" | "closed-wall" | "closed-insulated" | "closed-custom";
export type RecoveryMode = "available" | "required";
export type AirCase = "quiet" | "agitated" | "draught" | "ventilated";
export type FlowUnit = "m3h" | "lps";
export type Application = "tank" | "lphw" | "chw";

export type Inputs = {
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
  designDeltaT: number;
  additionalLoad: number;
  density: number;
  specificHeat: number;
  steelMass: number;
  glycolPercent: number;
  fluidLocation?: "both" | "circuit-only";
  fluidOverridden: boolean;
  flowOverridden: boolean;
  lossOverrideEnabled: boolean;
  lossOverrideKw: number;
  includePipework?: boolean;
  pipeLength?: number;
  pipeDiameterMm?: number;
  pipeU?: number;
  projectReference: string;
};

export const DEFAULTS: Inputs = {
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
  startTemperature: 16,
  finishTemperature: 60,
  humidity: 55,
  airCase: "agitated",
  evaporationFactor: 100,
  recoveryMode: "available",
  availableDuty: 120,
  desiredMinutes: 120,
  circulation: 30,
  flowUnit: "m3h",
  sourceFlowTemperature: 80,
  minimumApproach: 3,
  designDeltaT: 10,
  additionalLoad: 0,
  density: 998,
  specificHeat: 4.182,
  steelMass: 0,
  glycolPercent: 0,
  fluidLocation: "both",
  fluidOverridden: false,
  flowOverridden: false,
  lossOverrideEnabled: false,
  lossOverrideKw: 0,
  includePipework: false,
  pipeLength: 0,
  pipeDiameterMm: 0,
  pipeU: 0,
  projectReference: "",
};

export const APPLICATIONS: Record<
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

export const CONSTRUCTIONS = [
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

export const LEGACY_CONSTRUCTIONS: Record<string, string> = {
  single: "stainless-single",
  "twin-air": "steel-twin-air",
  "twin-25": "steel-mineral-25",
  "twin-75": "steel-mineral-75",
};

export const AIR_CASES: Record<
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

export const TOP_TYPES: { id: TopType; label: string; detail: string }[] = [
  { id: "open", label: "Open top", detail: "Includes evaporation, convection and radiation" },
  { id: "closed-wall", label: "Closed, same as walls", detail: "Top uses the selected wall U-value" },
  { id: "closed-insulated", label: "Insulated cover", detail: "Uses an indicative 0.8 W/m²K" },
  { id: "closed-custom", label: "Custom cover", detail: "Enter the cover U-value" },
];

export function saturationPressure(temperature: number) {
  return 0.61078 * Math.exp((17.2694 * temperature) / (temperature + 237.29));
}

export function format(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes)) return "Target cannot be reached";
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (!hours) return `${mins} min`;
  return `${hours} hr ${mins.toString().padStart(2, "0")} min`;
}

export function roundTo(value: number, digits: number) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// Fluid properties: Water and Ethylene Glycol correlations
// ---------------------------------------------------------------------------

/**
 * Liquid water density at 1 atm (0–100 °C).
 * Kell, G. S. (1975). "Density, thermal expansivity, and compressibility of liquid
 * water from 0° to 150°C: Correlations and tables for atmospheric pressure and
 * saturation reviewed and expressed on 1968 high temperature scale."
 * Journal of Chemical & Engineering Data, 20(1), 97–105.
 *
 * Valid 0–100 °C:
 *   0 °C   -> ~999.84 kg/m³
 *  20 °C   -> ~998.20 kg/m³
 *  40 °C   -> ~992.22 kg/m³
 *  80 °C   -> ~971.80 kg/m³
 * 100 °C   -> ~958.36 kg/m³
 */
export function waterDensity(temperatureC: number): number {
  const t = clamp(safeNumber(temperatureC, 20), 0, 100);
  const num =
    999.83952 +
    16.945176 * t -
    7.9870401e-3 * t * t -
    46.170461e-6 * t * t * t +
    105.56302e-9 * t * t * t * t -
    280.54253e-12 * t ** 5;
  const den = 1 + 16.87985e-3 * t;
  return num / den;
}

/**
 * Liquid water isobaric specific heat capacity (kJ/kg·K) at 1 atm, 0–100 °C.
 * Based on recognized formulation for water at atmospheric pressure:
 *   0 °C   -> ~4.217 kJ/kg·K
 *  20 °C   -> ~4.185 kJ/kg·K
 *  40 °C   -> ~4.175 kJ/kg·K
 *  80 °C   -> ~4.194 kJ/kg·K
 * 100 °C   -> ~4.211 kJ/kg·K
 */
export function waterSpecificHeat(temperatureC: number): number {
  const t = clamp(safeNumber(temperatureC, 20), 0, 100);
  return 4.2174 - 0.002245 * t + 3.491e-5 * t * t - 1.31e-7 * t ** 3;
}

/**
 * Published engineering data from Dow Chemical Company:
 * "Engineering & Operating Guide for DOWTHERM SR-1 and DOWTHERM 4000
 *  Inhibited Ethylene Glycol-based Heat Transfer Fluids" (Form No. 180-01190).
 * Table 11: Densities (kg/m³) of Aqueous Solutions of DOWTHERM SR-1 Fluid (SI Units).
 * Columns: [0% pure water (Kell 1975), 10% vol, 20% vol, 30% vol].
 * Range: 0–100 °C at 5 °C increments.
 */
export const DOW_DENSITY_TABLE: Record<number, [number, number, number, number]> = {
  0: [waterDensity(0), 1019.9, 1036.8, 1053.0],
  5: [waterDensity(5), 1018.7, 1035.5, 1051.5],
  10: [waterDensity(10), 1017.4, 1034.1, 1049.9],
  15: [waterDensity(15), 1016.0, 1032.5, 1048.2],
  20: [waterDensity(20), 1014.5, 1030.9, 1046.4],
  25: [waterDensity(25), 1012.8, 1029.1, 1044.5],
  30: [waterDensity(30), 1011.0, 1027.2, 1042.4],
  35: [waterDensity(35), 1009.2, 1025.1, 1040.2],
  40: [waterDensity(40), 1007.1, 1023.0, 1037.9],
  45: [waterDensity(45), 1005.0, 1020.7, 1035.5],
  50: [waterDensity(50), 1002.7, 1018.3, 1033.0],
  55: [waterDensity(55), 1000.3, 1015.8, 1030.3],
  60: [waterDensity(60), 997.8, 1013.1, 1027.5],
  65: [waterDensity(65), 995.2, 1010.4, 1024.6],
  70: [waterDensity(70), 992.5, 1007.5, 1021.6],
  75: [waterDensity(75), 989.6, 1004.5, 1018.4],
  80: [waterDensity(80), 986.6, 1001.3, 1015.1],
  85: [waterDensity(85), 983.5, 998.1, 1011.7],
  90: [waterDensity(90), 980.3, 994.7, 1008.2],
  95: [waterDensity(95), 976.9, 991.2, 1004.6],
  100: [waterDensity(100), 973.4, 987.6, 1000.8],
};

/**
 * Published engineering data from Dow Chemical Company:
 * "Engineering & Operating Guide for DOWTHERM SR-1 and DOWTHERM 4000
 *  Inhibited Ethylene Glycol-based Heat Transfer Fluids" (Form No. 180-01190).
 * Table 23: Specific Heat (kJ/kg·K) of Aqueous Solutions of DOWTHERM SR-1 Fluid (SI Units).
 * Columns: [0% pure water, 10% vol, 20% vol, 30% vol].
 * Range: 0–100 °C at 5 °C increments.
 */
export const DOW_CP_TABLE: Record<number, [number, number, number, number]> = {
  0: [waterSpecificHeat(0), 3.939, 3.771, 3.590],
  5: [waterSpecificHeat(5), 3.947, 3.782, 3.604],
  10: [waterSpecificHeat(10), 3.956, 3.794, 3.619],
  15: [waterSpecificHeat(15), 3.965, 3.805, 3.633],
  20: [waterSpecificHeat(20), 3.974, 3.816, 3.647],
  25: [waterSpecificHeat(25), 3.982, 3.828, 3.661],
  30: [waterSpecificHeat(30), 3.991, 3.839, 3.675],
  35: [waterSpecificHeat(35), 4.000, 3.851, 3.690],
  40: [waterSpecificHeat(40), 4.009, 3.862, 3.704],
  45: [waterSpecificHeat(45), 4.017, 3.874, 3.718],
  50: [waterSpecificHeat(50), 4.026, 3.885, 3.732],
  55: [waterSpecificHeat(55), 4.035, 3.897, 3.746],
  60: [waterSpecificHeat(60), 4.044, 3.908, 3.761],
  65: [waterSpecificHeat(65), 4.052, 3.920, 3.775],
  70: [waterSpecificHeat(70), 4.061, 3.931, 3.789],
  75: [waterSpecificHeat(75), 4.070, 3.943, 3.803],
  80: [waterSpecificHeat(80), 4.079, 3.954, 3.817],
  85: [waterSpecificHeat(85), 4.087, 3.966, 3.831],
  90: [waterSpecificHeat(90), 4.096, 3.977, 3.846],
  95: [waterSpecificHeat(95), 4.105, 3.989, 3.860],
  100: [waterSpecificHeat(100), 4.113, 4.000, 3.874],
};

function interpolateDowGrid(
  table: Record<number, [number, number, number, number]>,
  concentrationVol: number,
  temperatureC: number,
): number {
  const c = clamp(concentrationVol, 0, 30);
  const t = clamp(temperatureC, 0, 100);

  const cIdx0 = Math.min(2, Math.floor(c / 10));
  const cIdx1 = cIdx0 + 1;
  const cFrac = (c - cIdx0 * 10) / 10;

  const tStep = Math.min(19, Math.floor(t / 5));
  const t0 = tStep * 5;
  const t1 = t0 + 5;
  const tFrac = (t - t0) / 5;

  const r0 = table[t0];
  const r1 = table[t1];

  const v00 = r0[cIdx0];
  const v01 = r0[cIdx1];
  const v10 = r1[cIdx0];
  const v11 = r1[cIdx1];

  const top = (1 - cFrac) * v00 + cFrac * v01;
  const bot = (1 - cFrac) * v10 + cFrac * v11;

  return (1 - tFrac) * top + tFrac * bot;
}

/**
 * Pure ethylene glycol property estimates (kg/m³, kJ/kg·K).
 * Retained for legacy reference.
 */
export function ethyleneGlycolProperties(temperatureC: number) {
  const t = clamp(safeNumber(temperatureC, 20), 0, 100);
  return {
    density: 1132.2 - 0.695 * t,
    specificHeat: 2.261 + 0.00435 * t,
  };
}

export type FluidProperties = {
  density: number;
  specificHeat: number;
  glycolPercent: number;
  temperatureC: number;
  warnings?: string[];
};

export type FluidModelSelection = "shared" | "bath-water-primary-glycol";

export type FluidModelDetails = {
  storedDensity: number;
  storedSpecificHeat: number;
  circuitDensity: number;
  circuitSpecificHeat: number;
  glycolPercent: number;
  meanTemperature: number;
  isSeparated: boolean;
  warnings?: string[];
};

/**
 * Aqueous Ethylene Glycol mixture properties (0–30% by volume, 0–100 °C)
 * based on published Dow DOWTHERM SR-1 technical engineering data.
 * Validated against reference anchor: 30% EG vol at 40 °C -> ~1,037.92 kg/m³, ~3.704 kJ/kg·K.
 */
export function glycolMixProperties(glycolPercent: number, temperatureC: number): FluidProperties {
  const warnings: string[] = [];
  const rawPercent = safeNumber(glycolPercent, 0);
  const rawT = safeNumber(temperatureC, 20);

  if (rawPercent < 0 || rawPercent > 30) {
    warnings.push(
      `Glycol concentration ${rawPercent}% is outside the supported 0–30% by volume data range for DOWTHERM SR-1.`,
    );
  }
  if (rawT < 0 || rawT > 100) {
    warnings.push(
      `Temperature ${rawT}°C is outside the supported 0–100°C fluid property range for atmospheric liquid.`,
    );
  }

  const percent = clamp(rawPercent, 0, 30);
  const t = clamp(rawT, 0, 100);

  const density = interpolateDowGrid(DOW_DENSITY_TABLE, percent, t);
  const specificHeat = interpolateDowGrid(DOW_CP_TABLE, percent, t);

  return {
    density,
    specificHeat,
    glycolPercent: percent,
    temperatureC: t,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function flowM3hFromDuty(dutyKw: number, density: number, specificHeat: number, deltaT: number) {
  if (dutyKw <= 0 || density <= 0 || specificHeat <= 0 || deltaT <= 0) return 0;
  return (3600 * dutyKw) / (density * specificHeat * deltaT);
}

export function dutyFromFlowM3h(flowM3h: number, density: number, specificHeat: number, deltaT: number) {
  if (flowM3h <= 0 || density <= 0 || specificHeat <= 0 || deltaT <= 0) return 0;
  return (flowM3h / 3600) * density * specificHeat * deltaT;
}

export function litresToM3h(lps: number) {
  return lps * 3.6;
}

export function m3hToLps(m3h: number) {
  return m3h / 3.6;
}

export type LossBreakdown = {
  walls: number;
  lid: number;
  evaporation: number;
  convection: number;
  radiation: number;
  pipework: number;
  process: number;
  surface: number;
  calculatedSurface: number;
  total: number;
  overridden: boolean;
};

export type PlannerResult = {
  topArea: number;
  sideArea: number;
  baseArea: number;
  wallArea: number;
  pipeArea: number;
  geometricVolume: number;
  volumeLitres: number;
  fluidMass: number;
  thermalCapacity: number;
  sensibleEnergyKWh: number;
  density: number;
  specificHeat: number;
  circuitDensity: number;
  circuitSpecificHeat: number;
  fluidModel: FluidModelDetails;
  glycol: FluidProperties;
  enteredDuty: number;
  duty: number;
  unconstrainedDuty: number;
  flowLimitedDuty: number;
  calculatedFlowM3h: number;
  circulationM3h: number;
  recoveryMinutes: number;
  noLossMinutes: number;
  flowTemperatureChange: number;
  turnoverMinutes: number;
  flowCapacityAtStart: number;
  flowCapacityAtTarget: number;
  effectiveDutyAtStart: number;
  effectiveDutyAtTarget: number;
  requiredFlowLps: number;
  flowLimited: boolean;
  targetFlowLimited: boolean;
  approachLimitedAtTarget: boolean;
  limitReason: string;
  isCooling: boolean;
  selectedBreakdown: LossBreakdown;
  cases: Array<{
    id: AirCase;
    label: string;
    short: string;
    description: string;
    evaporation: number;
    convection: number;
    breakdown: LossBreakdown;
    recoveryMinutes: number;
  }>;
  resultsReady: boolean;
  designDeltaT: number;
};

export function constructionSelected(input: Inputs) {
  return input.application !== "tank" || Boolean(input.construction);
}

export function computePlanner(input: Inputs): PlannerResult {
  const densityInput = Math.max(1, safeNumber(input.density, 998));
  const specificHeatInput = Math.max(0.01, safeNumber(input.specificHeat, 4.182));
  const startTemperature = safeNumber(input.startTemperature);
  const finishTemperature = safeNumber(input.finishTemperature);
  const meanTemperature = (startTemperature + finishTemperature) / 2;
  const glycol = glycolMixProperties(input.glycolPercent, meanTemperature);

  // Stored fluid vs circulating/primary fluid properties
  const isSeparated = input.application === "tank" && input.fluidLocation === "circuit-only";
  let storedDensity: number;
  let storedSpecificHeat: number;
  let circuitDensity: number;
  let circuitSpecificHeat: number;

  if (input.fluidOverridden) {
    storedDensity = densityInput;
    storedSpecificHeat = specificHeatInput;
    circuitDensity = densityInput;
    circuitSpecificHeat = specificHeatInput;
  } else if (isSeparated) {
    // Tank fluid is pure water at bath mean temperature
    storedDensity = waterDensity(meanTemperature);
    storedSpecificHeat = waterSpecificHeat(meanTemperature);
    // Primary/circulation circuit contains the glycol mixture
    circuitDensity = glycol.density;
    circuitSpecificHeat = glycol.specificHeat;
  } else {
    // Shared fluid assumption: bath/vessel and circuit both contain the same fluid
    storedDensity = glycol.density;
    storedSpecificHeat = glycol.specificHeat;
    circuitDensity = glycol.density;
    circuitSpecificHeat = glycol.specificHeat;
  }

  const fluidModel: FluidModelDetails = {
    storedDensity,
    storedSpecificHeat,
    circuitDensity,
    circuitSpecificHeat,
    glycolPercent: input.glycolPercent,
    meanTemperature,
    isSeparated,
    ...(glycol.warnings ? { warnings: glycol.warnings } : {}),
  };

  const density = storedDensity;
  const specificHeat = storedSpecificHeat;

  const topArea =
    input.shape === "rectangular"
      ? Math.max(0, safeNumber(input.length)) * Math.max(0, safeNumber(input.width))
      : (Math.PI * Math.max(0, safeNumber(input.diameter)) ** 2) / 4;
  const sideArea =
    input.shape === "rectangular"
      ? 2 * (Math.max(0, safeNumber(input.length)) + Math.max(0, safeNumber(input.width))) * Math.max(0, safeNumber(input.depth))
      : Math.PI * Math.max(0, safeNumber(input.diameter)) * Math.max(0, safeNumber(input.depth));
  const baseArea = topArea;
  const geometricVolume =
    input.shape === "rectangular"
      ? Math.max(0, safeNumber(input.length)) * Math.max(0, safeNumber(input.width)) * Math.max(0, safeNumber(input.depth)) * 1000
      : topArea * Math.max(0, safeNumber(input.depth)) * 1000;
  const volumeLitres =
    input.application === "tank"
      ? safeNumber(input.measuredVolume) > 0
        ? input.measuredVolume
        : geometricVolume
      : Math.max(0, safeNumber(input.measuredVolume));
  const wallArea = sideArea + (input.baseExposed ? baseArea : 0);
  const pipeArea = input.includePipework
    ? Math.PI * (Math.max(0, safeNumber(input.pipeDiameterMm ?? 0)) / 1000) * Math.max(0, safeNumber(input.pipeLength ?? 0))
    : 0;
  const fluidMass = (volumeLitres / 1000) * density;
  const thermalCapacity = fluidMass * specificHeat + Math.max(0, safeNumber(input.steelMass)) * 0.5;
  const signedDelta = finishTemperature - startTemperature;
  const direction = signedDelta < 0 ? -1 : 1;
  const deltaTemperature = Math.abs(signedDelta);
  const isCooling = direction < 0;
  const sensibleEnergyKWh = (thermalCapacity * deltaTemperature) / 3600;
  const designDeltaT = Math.max(0, safeNumber(input.designDeltaT));
  const enteredDuty = Math.max(0, safeNumber(input.availableDuty));

  const ambientVapourPressure =
    (Math.max(0, Math.min(100, safeNumber(input.humidity))) / 100) * saturationPressure(safeNumber(input.ambient));
  const evaporationCoefficient = 2160 / saturationPressure(60);
  const ambient = safeNumber(input.ambient);

  const openTopBreakdown = (temperature: number, airCase: AirCase) => {
    const condition = AIR_CASES[airCase];
    const delta = temperature - ambient;
    const evaporation =
      (Math.max(0, evaporationCoefficient * (saturationPressure(temperature) - ambientVapourPressure)) *
        topArea *
        condition.evaporation *
        (Math.max(0, safeNumber(input.evaporationFactor)) / 100)) /
      1000;
    const convection = (condition.convection * topArea * delta) / 1000;
    const emissivity = 0.96;
    const stefanBoltzmann = 5.670374419e-8;
    const radiation =
      (emissivity *
        stefanBoltzmann *
        topArea *
        ((temperature + 273.15) ** 4 - (ambient + 273.15) ** 4)) /
      1000;
    return { evaporation, convection, radiation };
  };

  const rawBreakdownAt = (temperature: number, airCase: AirCase): Omit<LossBreakdown, "overridden"> => {
    const process = Math.max(0, safeNumber(input.additionalLoad));
    const pipeDelta = Math.abs(temperature - ambient);
    const pipework = input.includePipework
      ? (Math.max(0, safeNumber(input.pipeU ?? 0)) * pipeArea * pipeDelta) / 1000
      : 0;

    if (input.application !== "tank") {
      const surface = pipework;
      return {
        walls: 0,
        lid: 0,
        evaporation: 0,
        convection: 0,
        radiation: 0,
        pipework,
        process,
        surface,
        calculatedSurface: surface,
        total: surface + process,
      };
    }

    const delta = Math.abs(temperature - ambient);
    const walls = (Math.max(0, safeNumber(input.wallU)) * wallArea * delta) / 1000;
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
      lid = (Math.max(0, safeNumber(selectedLidU)) * topArea * delta) / 1000;
    }
    const calculatedSurface = walls + lid + evaporation + convection + radiation + pipework;
    return {
      walls,
      lid,
      evaporation,
      convection,
      radiation,
      pipework,
      process,
      surface: calculatedSurface,
      calculatedSurface,
      total: calculatedSurface + process,
    };
  };

  const breakdownAt = (temperature: number, airCase: AirCase): LossBreakdown => {
    const raw = rawBreakdownAt(temperature, airCase);
    if (!input.lossOverrideEnabled || input.application !== "tank") {
      return { ...raw, overridden: false };
    }
    const targetDelta = Math.abs(finishTemperature - ambient);
    const nowDelta = Math.abs(temperature - ambient);
    const scale = targetDelta < 0.05 ? 1 : nowDelta / targetDelta;
    const overriddenSurface = safeNumber(input.lossOverrideKw) * scale;
    const surface = overriddenSurface;
    return {
      walls: 0,
      lid: 0,
      evaporation: 0,
      convection: 0,
      radiation: 0,
      pipework: 0,
      process: raw.process,
      surface,
      calculatedSurface: raw.calculatedSurface,
      total: surface + raw.process,
      overridden: true,
    };
  };

  const flowCapacityForCirculation = (flowM3h: number, temperature: number) => {
    const flowLps = flowM3h / 3.6;
    const flowCapPerK = flowLps * (circuitDensity / 1000) * circuitSpecificHeat;
    if (flowCapPerK <= 0) return 0;
    if (input.application === "tank") {
      const source = safeNumber(input.sourceFlowTemperature);
      const approach = Math.max(0, safeNumber(input.minimumApproach));
      const availableDelta = isCooling
        ? temperature - (source + approach)
        : source - approach - temperature;
      const approachCapacity = flowCapPerK * Math.max(0, availableDelta);
      const designCapacity = dutyFromFlowM3h(flowM3h, circuitDensity, circuitSpecificHeat, designDeltaT);
      return Math.min(approachCapacity, designCapacity > 0 ? designCapacity : approachCapacity);
    }
    return dutyFromFlowM3h(flowM3h, circuitDensity, circuitSpecificHeat, designDeltaT);
  };

  const timeForPowerWithFlow = (
    power: number,
    flowM3h: number,
    airCase = input.airCase,
    applyFlowLimit = true,
    ignoreLoads = false,
  ) => {
    if (deltaTemperature <= 0) return 0;
    const steps = 500;
    const temperatureStep = deltaTemperature / steps;
    let seconds = 0;
    for (let index = 0; index < steps; index += 1) {
      const temperature = startTemperature + direction * (index + 0.5) * temperatureStep;
      const usableDuty = applyFlowLimit
        ? Math.min(Math.max(0, power), flowCapacityForCirculation(flowM3h, temperature))
        : Math.max(0, power);
      const opposingLoad = ignoreLoads ? 0 : breakdownAt(temperature, airCase).total;
      const netPower = usableDuty - opposingLoad;
      if (netPower <= 0.001) return Number.POSITIVE_INFINITY;
      seconds += (thermalCapacity * temperatureStep) / netPower;
    }
    return seconds / 60;
  };

  const unconstrainedRequiredDuty = (() => {
    if (deltaTemperature <= 0 || safeNumber(input.desiredMinutes) <= 0) {
      return Math.max(0, breakdownAt(finishTemperature, input.airCase).total);
    }
    const targetMinutes = Math.max(0.1, safeNumber(input.desiredMinutes));
    const timePurePower = (p: number) => {
      if (deltaTemperature <= 0) return 0;
      const steps = 500;
      const temperatureStep = deltaTemperature / steps;
      let seconds = 0;
      for (let index = 0; index < steps; index += 1) {
        const temperature = startTemperature + direction * (index + 0.5) * temperatureStep;
        const opposingLoad = breakdownAt(temperature, input.airCase).total;
        const netPower = p - opposingLoad;
        if (netPower <= 0.001) return Number.POSITIVE_INFINITY;
        seconds += (thermalCapacity * temperatureStep) / netPower;
      }
      return seconds / 60;
    };

    let low = Math.max(0, breakdownAt(finishTemperature, input.airCase).total) + 0.001;
    let high = Math.max(low + 1, sensibleEnergyKWh / (targetMinutes / 60) + low);
    while (timePurePower(high) > targetMinutes && high < 1000000) {
      high *= 1.5;
    }
    for (let index = 0; index < 70; index += 1) {
      const midpoint = (low + high) / 2;
      if (timePurePower(midpoint) > targetMinutes) low = midpoint;
      else high = midpoint;
    }
    return high;
  })();

  let unconstrainedDuty: number;
  let activeDuty: number;
  let calculatedFlowM3h: number;
  let circulationM3h: number;

  if (input.recoveryMode === "available") {
    unconstrainedDuty = enteredDuty;
    calculatedFlowM3h = flowM3hFromDuty(enteredDuty, circuitDensity, circuitSpecificHeat, designDeltaT);
    circulationM3h = input.flowOverridden
      ? Math.max(0, safeNumber(input.circulation))
      : calculatedFlowM3h;
    const flowLimitedDuty = dutyFromFlowM3h(circulationM3h, circuitDensity, circuitSpecificHeat, designDeltaT);
    activeDuty = input.flowOverridden ? Math.min(unconstrainedDuty, flowLimitedDuty) : unconstrainedDuty;
  } else {
    // "Size the kW" mode:
    unconstrainedDuty = unconstrainedRequiredDuty;
    if (input.flowOverridden) {
      circulationM3h = Math.max(0, safeNumber(input.circulation));
      const flowLimitedDuty = dutyFromFlowM3h(circulationM3h, circuitDensity, circuitSpecificHeat, designDeltaT);
      calculatedFlowM3h = flowM3hFromDuty(unconstrainedDuty, circuitDensity, circuitSpecificHeat, designDeltaT);
      activeDuty = Math.min(unconstrainedDuty, flowLimitedDuty);
    } else {
      const timeWithAutoFlow = (p: number, airCase = input.airCase, ignoreLoads = false) => {
        if (deltaTemperature <= 0) return 0;
        const autoFlow = flowM3hFromDuty(p, circuitDensity, circuitSpecificHeat, designDeltaT);
        return timeForPowerWithFlow(p, autoFlow, airCase, true, ignoreLoads);
      };

      const source = safeNumber(input.sourceFlowTemperature);
      const approach = Math.max(0, safeNumber(input.minimumApproach));
      const targetDeltaAtFinish = isCooling
        ? finishTemperature - (source + approach)
        : source - approach - finishTemperature;

      const targetMinutes = Math.max(0.1, safeNumber(input.desiredMinutes));
      if (input.application === "tank" && targetDeltaAtFinish <= 0) {
        // Unattainable target
        activeDuty = unconstrainedRequiredDuty;
        calculatedFlowM3h = flowM3hFromDuty(activeDuty, circuitDensity, circuitSpecificHeat, designDeltaT);
        circulationM3h = calculatedFlowM3h;
      } else {
        // Binary search for required duty with auto flow
        let low = Math.max(0, breakdownAt(finishTemperature, input.airCase).total) + 0.001;
        let high = Math.max(low + 1, sensibleEnergyKWh / (targetMinutes / 60) + low);
        while (timeWithAutoFlow(high, input.airCase, false) > targetMinutes && high < 10000000) {
          high *= 1.5;
        }
        if (high < 10000000) {
          for (let index = 0; index < 70; index += 1) {
            const midpoint = (low + high) / 2;
            if (timeWithAutoFlow(midpoint, input.airCase, false) > targetMinutes) low = midpoint;
            else high = midpoint;
          }
          activeDuty = high;
        } else {
          activeDuty = unconstrainedRequiredDuty;
        }
        calculatedFlowM3h = flowM3hFromDuty(activeDuty, circuitDensity, circuitSpecificHeat, designDeltaT);
        circulationM3h = calculatedFlowM3h;
      }
    }
  }

  const duty = activeDuty;
  const flowLimitedDuty = dutyFromFlowM3h(circulationM3h, circuitDensity, circuitSpecificHeat, designDeltaT);
  const flowCapacityAt = (temperature: number) =>
    flowCapacityForCirculation(circulationM3h, temperature);

  const recoveryMinutes = timeForPowerWithFlow(duty, circulationM3h, input.airCase, true, false);
  const noLossMinutes = timeForPowerWithFlow(duty, circulationM3h, input.airCase, true, true);
  const circulationLps = circulationM3h / 3.6;
  const flowCapacityPerK = circulationLps * (circuitDensity / 1000) * circuitSpecificHeat;
  const flowTemperatureChange = flowCapacityPerK > 0 ? duty / flowCapacityPerK : NaN;
  const turnoverMinutes = circulationM3h > 0 ? (volumeLitres / 1000 / circulationM3h) * 60 : NaN;
  const flowCapacityAtStart = flowCapacityAt(startTemperature);
  const flowCapacityAtTarget = flowCapacityAt(finishTemperature);
  const effectiveDutyAtStart = Math.min(duty, flowCapacityAtStart);
  const effectiveDutyAtTarget = Math.min(duty, flowCapacityAtTarget);
  const requiredFlowLps =
    designDeltaT > 0
      ? duty / ((circuitDensity / 1000) * circuitSpecificHeat * designDeltaT)
      : Number.POSITIVE_INFINITY;

  // Determine flow/approach limitations and limit reasons:
  // Is approach limited at target?
  let approachLimitedAtTarget = false;
  if (input.application === "tank") {
    const source = safeNumber(input.sourceFlowTemperature);
    const approach = Math.max(0, safeNumber(input.minimumApproach));
    const targetDelta = isCooling
      ? finishTemperature - (source + approach)
      : source - approach - finishTemperature;
    if (targetDelta < designDeltaT) {
      const approachCap = flowCapacityPerK * Math.max(0, targetDelta);
      if (approachCap < duty - 0.05) {
        approachLimitedAtTarget = true;
      }
    }
  }

  const flowLimited =
    duty > Math.min(flowCapacityAtStart, flowCapacityAtTarget) + 0.05 ||
    (input.flowOverridden && unconstrainedDuty > flowLimitedDuty + 0.05);

  let limitReason = "";
  if (input.application === "tank") {
    const source = safeNumber(input.sourceFlowTemperature);
    const approach = Math.max(0, safeNumber(input.minimumApproach));
    const targetDelta = isCooling
      ? finishTemperature - (source + approach)
      : source - approach - finishTemperature;
    if (targetDelta <= 0) {
      limitReason = `Target temperature ${finishTemperature}°C cannot be reached with source at ${source}°C and ${approach} K minimum approach.`;
    } else if (input.flowOverridden && unconstrainedDuty > flowLimitedDuty + 0.05) {
      limitReason = `Overridden flow of ${format(circulationM3h, 2)} m³/h limits deliverable duty to ${format(flowLimitedDuty, 1)} kW at ${designDeltaT} K design ΔT.`;
    } else if (approachLimitedAtTarget) {
      limitReason = `Source temperature (${source}°C) and ${approach} K minimum approach reduce effective duty to ${format(effectiveDutyAtTarget, 1)} kW near target temperature.`;
    }
  } else if (input.flowOverridden && unconstrainedDuty > flowLimitedDuty + 0.05) {
    limitReason = `Overridden flow of ${format(circulationM3h, 2)} m³/h limits deliverable duty to ${format(flowLimitedDuty, 1)} kW at ${designDeltaT} K design ΔT.`;
  }

  const targetFlowLimited =
    input.recoveryMode === "required" &&
    (!Number.isFinite(recoveryMinutes) ||
      recoveryMinutes > Math.max(0, safeNumber(input.desiredMinutes)) + 0.5);

  const cases = (Object.keys(AIR_CASES) as AirCase[]).map((airCase) => ({
    id: airCase,
    ...AIR_CASES[airCase],
    breakdown: breakdownAt(finishTemperature, airCase),
    recoveryMinutes: timeForPowerWithFlow(duty, circulationM3h, airCase, true, false),
  }));

  return {
    topArea,
    sideArea,
    baseArea,
    wallArea,
    pipeArea,
    geometricVolume,
    volumeLitres,
    fluidMass,
    thermalCapacity,
    sensibleEnergyKWh,
    density,
    specificHeat,
    circuitDensity,
    circuitSpecificHeat,
    fluidModel,
    glycol,
    enteredDuty,
    duty,
    unconstrainedDuty,
    flowLimitedDuty,
    calculatedFlowM3h,
    circulationM3h,
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
    approachLimitedAtTarget,
    limitReason,
    isCooling,
    selectedBreakdown: breakdownAt(finishTemperature, input.airCase),
    cases,
    resultsReady: constructionSelected(input),
    designDeltaT,
  };
}
