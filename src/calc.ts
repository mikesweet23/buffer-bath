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
  fluidOverridden: boolean;
  flowOverridden: boolean;
  lossOverrideEnabled: boolean;
  lossOverrideKw: number;
  includePipework: boolean;
  pipeLength: number;
  pipeDiameterMm: number;
  pipeU: number;
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
  fluidOverridden: false,
  flowOverridden: false,
  lossOverrideEnabled: false,
  lossOverrideKw: 0,
  includePipework: false,
  pipeLength: 20,
  pipeDiameterMm: 76.1,
  pipeU: 0.8,
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

/**
 * Water density kg/m³, 0–100 °C (Thiesen-style quadratic fit to IAPWS values).
 */
export function waterDensity(temperatureC: number) {
  const t = clamp(temperatureC, 0, 100);
  return 999.83952 + 0.067932952 * t - 0.00909529 * t * t + 0.0001001685 * t * t * t - 1.120083e-7 * t ** 4;
}

/**
 * Water specific heat kJ/kg·K, 0–100 °C.
 */
export function waterSpecificHeat(temperatureC: number) {
  const t = clamp(temperatureC, 0, 100);
  return 4.2174 - 0.002245 * t + 3.491e-5 * t * t - 1.31e-7 * t ** 3;
}

/**
 * Ethylene glycol (pure) density kg/m³ and Cp kJ/kg·K.
 * Linear fits to published EG properties over 0–90 °C.
 */
export function ethyleneGlycolProperties(temperatureC: number) {
  const t = clamp(temperatureC, 0, 100);
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
};

/**
 * Ethylene glycol / water mixture by volume (0–30 %).
 * Density uses volume-weighted mixing; Cp uses mass-weighted mixing.
 */
export function glycolMixProperties(glycolPercent: number, temperatureC: number): FluidProperties {
  const percent = clamp(safeNumber(glycolPercent, 0), 0, 30);
  const t = Number.isFinite(temperatureC) ? temperatureC : 20;
  const waterRho = waterDensity(t);
  const waterCp = waterSpecificHeat(t);
  const glycol = ethyleneGlycolProperties(t);
  const volumeFraction = percent / 100;
  const density = (1 - volumeFraction) * waterRho + volumeFraction * glycol.density;
  const massGlycol = volumeFraction * glycol.density;
  const massWater = (1 - volumeFraction) * waterRho;
  const specificHeat = (massWater * waterCp + massGlycol * glycol.specificHeat) / density;
  return { density, specificHeat, glycolPercent: percent, temperatureC: t };
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
  glycol: FluidProperties;
  enteredDuty: number;
  duty: number;
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
  const density = input.fluidOverridden ? densityInput : glycol.density;
  const specificHeat = input.fluidOverridden ? specificHeatInput : glycol.specificHeat;

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
  const pipeDiameterM = Math.max(0, safeNumber(input.pipeDiameterMm)) / 1000;
  const pipeArea = input.includePipework
    ? Math.PI * pipeDiameterM * Math.max(0, safeNumber(input.pipeLength))
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
  const calculatedFlowM3h = flowM3hFromDuty(enteredDuty, density, specificHeat, designDeltaT);
  const circulationM3h = input.flowOverridden
    ? Math.max(0, safeNumber(input.circulation))
    : calculatedFlowM3h;
  const circulationLps = circulationM3h / 3.6;
  const flowCapacityPerK = circulationLps * (density / 1000) * specificHeat;
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
    const pipeDelta = temperature - ambient;
    const pipework = (Math.max(0, safeNumber(input.pipeU)) * pipeArea * pipeDelta) / 1000;

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
        total: (isCooling ? -surface : surface) + process,
      };
    }

    const delta = temperature - ambient;
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
      total: (isCooling ? -calculatedSurface : calculatedSurface) + process,
    };
  };

  const breakdownAt = (temperature: number, airCase: AirCase): LossBreakdown => {
    const raw = rawBreakdownAt(temperature, airCase);
    if (!input.lossOverrideEnabled || input.application !== "tank") {
      return { ...raw, overridden: false };
    }
    const targetDelta = finishTemperature - ambient;
    const nowDelta = temperature - ambient;
    const scale = Math.abs(targetDelta) < 0.05 ? 1 : nowDelta / targetDelta;
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
      total: (isCooling ? -surface : surface) + raw.process,
      overridden: true,
    };
  };

  const flowCapacityAt = (temperature: number) => {
    if (flowCapacityPerK <= 0) return 0;
    if (input.application === "tank") {
      const source = safeNumber(input.sourceFlowTemperature);
      const approach = Math.max(0, safeNumber(input.minimumApproach));
      const availableDelta = isCooling
        ? temperature - (source + approach)
        : source - approach - temperature;
      const approachCapacity = flowCapacityPerK * Math.max(0, availableDelta);
      const designCapacity = dutyFromFlowM3h(circulationM3h, density, specificHeat, designDeltaT);
      return Math.min(approachCapacity, designCapacity > 0 ? designCapacity : approachCapacity);
    }
    return dutyFromFlowM3h(circulationM3h, density, specificHeat, designDeltaT);
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
      const temperature = startTemperature + direction * (index + 0.5) * temperatureStep;
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
    if (deltaTemperature <= 0 || safeNumber(input.desiredMinutes) <= 0) {
      return Math.max(0, breakdownAt(finishTemperature, input.airCase).total);
    }
    const targetMinutes = Math.max(0.1, safeNumber(input.desiredMinutes));
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

  const unconstrainedDuty =
    input.recoveryMode === "available" ? enteredDuty : requiredPower();
  const flowLimitedDuty = dutyFromFlowM3h(circulationM3h, density, specificHeat, designDeltaT);
  const duty =
    input.flowOverridden && input.recoveryMode === "available"
      ? Math.min(unconstrainedDuty, flowLimitedDuty)
      : unconstrainedDuty;
  const recoveryMinutes = timeForPower(duty);
  const noLossMinutes = timeForPower(duty, input.airCase, true, true);
  const flowTemperatureChange = flowCapacityPerK > 0 ? duty / flowCapacityPerK : NaN;
  const turnoverMinutes = circulationM3h > 0 ? (volumeLitres / 1000 / circulationM3h) * 60 : NaN;
  const flowCapacityAtStart = flowCapacityAt(startTemperature);
  const flowCapacityAtTarget = flowCapacityAt(finishTemperature);
  const effectiveDutyAtStart = Math.min(duty, flowCapacityAtStart);
  const effectiveDutyAtTarget = Math.min(duty, flowCapacityAtTarget);
  const requiredFlowLps =
    designDeltaT > 0 ? duty / ((density / 1000) * specificHeat * designDeltaT) : Number.POSITIVE_INFINITY;
  const flowLimited = duty > Math.min(flowCapacityAtStart, flowCapacityAtTarget) + 0.05;
  const targetFlowLimited =
    input.recoveryMode === "required" &&
    (!Number.isFinite(recoveryMinutes) || recoveryMinutes > Math.max(0, safeNumber(input.desiredMinutes)) + 0.5);

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
    pipeArea,
    geometricVolume,
    volumeLitres,
    fluidMass,
    thermalCapacity,
    sensibleEnergyKWh,
    density,
    specificHeat,
    glycol,
    enteredDuty,
    duty,
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
    isCooling,
    selectedBreakdown: breakdownAt(finishTemperature, input.airCase),
    cases,
    resultsReady: constructionSelected(input),
    designDeltaT,
  };
}
