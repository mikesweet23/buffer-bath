import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  computePlanner,
  dutyFromFlowM3h,
  flowM3hFromDuty,
  glycolMixProperties,
  waterDensity,
  waterSpecificHeat,
  type Inputs,
} from "./calc";
import { buildReportHtml } from "./report";

function tankInput(overrides: Partial<Inputs> = {}): Inputs {
  return {
    ...DEFAULTS,
    construction: "twin-50",
    ...overrides,
  };
}

describe("1. Water density authoritative formulation (Kell 1975)", () => {
  it("verifies water density against authoritative values (0, 20, 40, 80, 100 °C)", () => {
    // Expected values from Kell (1975) at 1 atm:
    // 0 °C: ~999.84 kg/m³
    // 20 °C: ~998.20 kg/m³
    // 40 °C: ~992.22 kg/m³
    // 80 °C: ~971.80 kg/m³
    // 100 °C: ~958.36 kg/m³
    expect(waterDensity(0)).toBeCloseTo(999.84, 1);
    expect(waterDensity(20)).toBeCloseTo(998.2, 1);
    expect(waterDensity(40)).toBeCloseTo(992.22, 1);
    expect(waterDensity(80)).toBeCloseTo(971.8, 1);
    expect(waterDensity(100)).toBeCloseTo(958.36, 1);

    // Verify it doesn't return the erroneous ~1005 at 100°C
    expect(waterDensity(100)).toBeLessThan(960);
  });
});

describe("2. Mixture density and Cp against published Dow DOWTHERM SR-1 data", () => {
  it("verifies reference anchor: 30% EG vol at 40°C", () => {
    const props = glycolMixProperties(30, 40);
    // Anchor: 30% vol at 40°C: ~1,037.92 kg/m³, ~3.704 kJ/kg·K (Table 11 & Table 23)
    expect(props.density).toBeCloseTo(1037.9, 0);
    expect(props.specificHeat).toBeCloseTo(3.704, 2);
  });

  it("verifies mixture properties across 0–30% vol and 0–100°C from Dow tables", () => {
    // At 0% glycol, should match water
    const w20 = glycolMixProperties(0, 20);
    expect(w20.density).toBeCloseTo(waterDensity(20), 1);
    expect(w20.specificHeat).toBeCloseTo(waterSpecificHeat(20), 2);

    // At 10% vol and 20°C: Dow Table 11 -> 1014.5 kg/m³, Table 23 -> 3.974 kJ/kg·K
    const g10_20 = glycolMixProperties(10, 20);
    expect(g10_20.density).toBeCloseTo(1014.5, 0);
    expect(g10_20.specificHeat).toBeCloseTo(3.974, 2);

    // At 20% vol and 60°C: Dow Table 11 -> 1013.1 kg/m³, Table 23 -> 3.908 kJ/kg·K
    const g20_60 = glycolMixProperties(20, 60);
    expect(g20_60.density).toBeCloseTo(1013.1, 0);
    expect(g20_60.specificHeat).toBeCloseTo(3.908, 2);

    // At 30% vol and 80°C: Dow Table 11 -> 1015.1 kg/m³, Table 23 -> 3.817 kJ/kg·K
    const g30_80 = glycolMixProperties(30, 80);
    expect(g30_80.density).toBeCloseTo(1015.1, 0);
    expect(g30_80.specificHeat).toBeCloseTo(3.817, 2);
  });

  it("warns when concentration or temperature are outside supported data range", () => {
    const overConc = glycolMixProperties(35, 20);
    expect(overConc.warnings).toBeDefined();
    expect(overConc.warnings?.some((w) => w.includes("35%"))).toBe(true);

    const negConc = glycolMixProperties(-5, 20);
    expect(negConc.warnings).toBeDefined();

    const overTemp = glycolMixProperties(20, 110);
    expect(overTemp.warnings).toBeDefined();
    expect(overTemp.warnings?.some((w) => w.includes("110°C"))).toBe(true);

    const subZero = glycolMixProperties(20, -10);
    expect(subZero.warnings).toBeDefined();

    // Within range has no warnings
    const normal = glycolMixProperties(20, 50);
    expect(normal.warnings).toBeUndefined();
  });
});

describe("3. Energy and heating time hand calculation for loss-free, constant-duty case", () => {
  it("matches hand calculation: 1000 L water, 20°C to 60°C at 50 kW constant duty", () => {
    // Mean temp = 40°C
    const rho = waterDensity(40);
    const cp = waterSpecificHeat(40);
    const mass = 1 * rho; // 1000 L = 1 m³
    const thermalCap = mass * cp; // kJ/K
    const deltaT = 40; // K
    const energyKWh = (thermalCap * deltaT) / 3600;
    const duty = 50; // kW
    const expectedHours = energyKWh / duty;
    const expectedMinutes = expectedHours * 60;

    const res = computePlanner({
      ...DEFAULTS,
      application: "tank",
      construction: "twin-50",
      shape: "rectangular",
      measuredVolume: 1000,
      startTemperature: 20,
      finishTemperature: 60,
      availableDuty: 50,
      designDeltaT: 20,
      sourceFlowTemperature: 100, // plenty of approach
      minimumApproach: 0,
      steelMass: 0,
      glycolPercent: 0,
      lossOverrideEnabled: true,
      lossOverrideKw: 0, // no loss
      includePipework: false,
      flowOverridden: false,
    });

    expect(res.thermalCapacity).toBeCloseTo(thermalCap, 1);
    expect(res.sensibleEnergyKWh).toBeCloseTo(energyKWh, 1);
    expect(res.noLossMinutes).toBeCloseTo(expectedMinutes, 1);
    expect(res.recoveryMinutes).toBeCloseTo(expectedMinutes, 1);
  });
});

describe("4. Automatic flow increases when heat capacity per litre falls", () => {
  it("requires higher circulation rate for 30% glycol than water at fixed duty and circuit ΔT", () => {
    const waterPlanner = computePlanner(
      tankInput({
        glycolPercent: 0,
        availableDuty: 100,
        designDeltaT: 10,
        flowOverridden: false,
      }),
    );

    const glycolPlanner = computePlanner(
      tankInput({
        glycolPercent: 30,
        availableDuty: 100,
        designDeltaT: 10,
        flowOverridden: false,
      }),
    );

    // volumetric heat capacity = density * Cp
    const waterCapPerM3 = waterPlanner.circuitDensity * waterPlanner.circuitSpecificHeat;
    const glycolCapPerM3 = glycolPlanner.circuitDensity * glycolPlanner.circuitSpecificHeat;
    expect(glycolCapPerM3).toBeLessThan(waterCapPerM3);

    // flow = 3600 * kW / (density * Cp * ΔT)
    expect(glycolPlanner.calculatedFlowM3h).toBeGreaterThan(waterPlanner.calculatedFlowM3h);
    expect(glycolPlanner.circulationM3h).toBeGreaterThan(waterPlanner.circulationM3h);
  });
});

describe("5. Fixed-flow duty falls when heat capacity per litre falls", () => {
  it("delivers less duty at fixed flow when glycol is present", () => {
    const fixedFlow = 15; // m³/h
    const deltaT = 10;

    const waterPlanner = computePlanner(
      tankInput({
        glycolPercent: 0,
        availableDuty: 200,
        flowOverridden: true,
        circulation: fixedFlow,
        designDeltaT: deltaT,
        sourceFlowTemperature: 100,
        minimumApproach: 0,
      }),
    );

    const glycolPlanner = computePlanner(
      tankInput({
        glycolPercent: 30,
        availableDuty: 200,
        flowOverridden: true,
        circulation: fixedFlow,
        designDeltaT: deltaT,
        sourceFlowTemperature: 100,
        minimumApproach: 0,
      }),
    );

    expect(glycolPlanner.duty).toBeLessThan(waterPlanner.duty);
    const expectedRatio =
      (glycolPlanner.circuitDensity * glycolPlanner.circuitSpecificHeat) /
      (waterPlanner.circuitDensity * waterPlanner.circuitSpecificHeat);
    expect(glycolPlanner.duty / waterPlanner.duty).toBeCloseTo(expectedRatio, 3);
  });
});

describe("6. Heat-up time unchanged at fixed flow, fixed circuit ΔT, zero shell mass and no loads", () => {
  it("shows heat-up time remains identical as fluid heat capacity changes when flow limits duty throughout", () => {
    // When flow is fixed to V_dot and circuit temperature difference is fixed to ΔT_c:
    // Stored fluid mass M = V * rho.
    // Stored thermal capacity C_stored = V * rho * Cp.
    // Stored energy to raise by ΔT_bath is E = V * rho * Cp * ΔT_bath.
    // Circulating duty P = V_dot * rho * Cp * ΔT_c.
    // Therefore time t = E / P = (V * rho * Cp * ΔT_bath) / (V_dot * rho * Cp * ΔT_c)
    // t = (V * ΔT_bath) / (V_dot * ΔT_c), which is completely INDEPENDENT of rho and Cp!
    const fixedFlow = 10; // m³/h
    const designDeltaT = 10;

    const waterBath = computePlanner(
      tankInput({
        measuredVolume: 5000,
        startTemperature: 20,
        finishTemperature: 60,
        steelMass: 0,
        additionalLoad: 0,
        lossOverrideEnabled: true,
        lossOverrideKw: 0,
        includePipework: false,
        availableDuty: 200,
        flowOverridden: true,
        circulation: fixedFlow,
        designDeltaT,
        glycolPercent: 0,
        sourceFlowTemperature: 100,
        minimumApproach: 0,
      }),
    );

    const glycolBath = computePlanner(
      tankInput({
        measuredVolume: 5000,
        startTemperature: 20,
        finishTemperature: 60,
        steelMass: 0,
        additionalLoad: 0,
        lossOverrideEnabled: true,
        lossOverrideKw: 0,
        includePipework: false,
        availableDuty: 200,
        flowOverridden: true,
        circulation: fixedFlow,
        designDeltaT,
        glycolPercent: 30,
        sourceFlowTemperature: 100,
        minimumApproach: 0,
      }),
    );

    expect(glycolBath.recoveryMinutes).toBeCloseTo(waterBath.recoveryMinutes, 2);
    expect(glycolBath.noLossMinutes).toBeCloseTo(waterBath.noLossMinutes, 2);
  });
});

describe("7. Heating and cooling correctly account for heat loss or heat gain", () => {
  it("heating with standing losses takes longer than no losses", () => {
    const res = computePlanner(
      tankInput({
        startTemperature: 16,
        finishTemperature: 60,
        availableDuty: 100,
        topType: "open",
        ambient: 16,
      }),
    );
    expect(res.isCooling).toBe(false);
    expect(res.selectedBreakdown.total).toBeGreaterThan(0);
    expect(res.recoveryMinutes).toBeGreaterThan(res.noLossMinutes);
  });

  it("cooling with heat gain from ambient takes longer than loss-free cooling", () => {
    const res = computePlanner({
      ...DEFAULTS,
      application: "chw",
      measuredVolume: 2000,
      startTemperature: 25,
      finishTemperature: 6,
      ambient: 25,
      availableDuty: 50,
      designDeltaT: 6,
      includePipework: true,
      pipeLength: 50,
      pipeDiameterMm: 76.1,
      pipeU: 1.5,
    });
    expect(res.isCooling).toBe(true);
    expect(res.selectedBreakdown.pipework).toBeGreaterThan(0);
    expect(res.recoveryMinutes).toBeGreaterThan(res.noLossMinutes);
  });
});

describe("8. Required-duty sizing in 'Size the kW' mode", () => {
  it("reproduces requested recovery time when feasible", () => {
    const desiredMinutes = 90;
    const res = computePlanner(
      tankInput({
        recoveryMode: "required",
        desiredMinutes,
        sourceFlowTemperature: 85,
        minimumApproach: 3,
        designDeltaT: 10,
        flowOverridden: false,
      }),
    );

    expect(Number.isFinite(res.duty)).toBe(true);
    expect(res.duty).toBeGreaterThan(0);
    expect(res.recoveryMinutes).toBeCloseTo(desiredMinutes, 0);
  });

  it("is independent of previous hidden available-duty input", () => {
    const res1 = computePlanner(
      tankInput({
        recoveryMode: "required",
        desiredMinutes: 60,
        availableDuty: 50,
        flowOverridden: false,
      }),
    );

    const res2 = computePlanner(
      tankInput({
        recoveryMode: "required",
        desiredMinutes: 60,
        availableDuty: 500, // vastly different previous hidden duty
        flowOverridden: false,
      }),
    );

    expect(res1.duty).toBeCloseTo(res2.duty, 4);
    expect(res1.calculatedFlowM3h).toBeCloseTo(res2.calculatedFlowM3h, 4);
    expect(res1.circulationM3h).toBeCloseTo(res2.circulationM3h, 4);
    expect(res1.recoveryMinutes).toBeCloseTo(res2.recoveryMinutes, 4);
  });
});

describe("9. Manual flow restrictions and unattainable source-temperature targets produce clear warnings", () => {
  it("produces warning and limitReason when manual flow restricts duty", () => {
    const res = computePlanner(
      tankInput({
        availableDuty: 150,
        designDeltaT: 10,
        flowOverridden: true,
        circulation: 2, // very low flow (delivers ~23 kW)
      }),
    );
    expect(res.flowLimited).toBe(true);
    expect(res.duty).toBeLessThan(150);
    expect(res.limitReason).toContain("Overridden flow");
  });

  it("produces limitReason when source temperature target is unattainable", () => {
    // Trying to heat bath to 80°C with source flow at 80°C and 3 K min approach
    // Max attainable is 77°C
    const res = computePlanner(
      tankInput({
        startTemperature: 20,
        finishTemperature: 80,
        sourceFlowTemperature: 80,
        minimumApproach: 3,
        recoveryMode: "available",
        availableDuty: 100,
      }),
    );

    expect(Number.isFinite(res.recoveryMinutes)).toBe(false);
    expect(res.limitReason).toContain("cannot be reached");
  });
});

describe("10. Displayed effective duties and PDF report agree with calculations", () => {
  it("verifies effective duties at start and target and ensures HTML report matches", () => {
    const input = tankInput({
      startTemperature: 16,
      finishTemperature: 60,
      availableDuty: 120,
      designDeltaT: 20,
      sourceFlowTemperature: 80,
      minimumApproach: 3,
      flowOverridden: false,
      projectReference: "TEST-REF-10",
    });

    const result = computePlanner(input);
    const html = buildReportHtml(input, result);

    expect(html).toContain("TEST-REF-10");
    expect(html).toContain(`${result.duty.toFixed(1)} kW`);
    expect(html).toContain(`${result.effectiveDutyAtStart.toFixed(1)} kW`);
    expect(html).toContain(`${result.effectiveDutyAtTarget.toFixed(1)} kW`);
    expect(html).toContain(`${result.circulationM3h.toFixed(2)} m³/h`);
  });
});

describe("11. Existing geometry, construction, shell-mass, and manual overrides remain intact", () => {
  it("calculates rectangular and cylindrical geometries correctly", () => {
    const rect = computePlanner(
      tankInput({
        shape: "rectangular",
        length: 2,
        width: 3,
        depth: 1,
        measuredVolume: 0,
      }),
    );
    expect(rect.volumeLitres).toBeCloseTo(6000, 1);
    expect(rect.topArea).toBeCloseTo(6, 2);
    expect(rect.sideArea).toBeCloseTo(10, 2);

    const cyl = computePlanner(
      tankInput({
        shape: "cylindrical",
        diameter: 2,
        depth: 2,
        measuredVolume: 0,
      }),
    );
    expect(cyl.topArea).toBeCloseTo(Math.PI, 2);
    expect(cyl.volumeLitres).toBeCloseTo(Math.PI * 2000, 0);
  });

  it("includes steel mass thermal capacity (0.5 kJ/kg·K)", () => {
    const withoutSteel = computePlanner(tankInput({ steelMass: 0 }));
    const withSteel = computePlanner(tankInput({ steelMass: 1000 }));
    // 1000 kg steel * 0.5 kJ/kg·K = 500 kJ/K
    expect(withSteel.thermalCapacity - withoutSteel.thermalCapacity).toBeCloseTo(500, 1);
  });

  it("preserves manual fluid property overrides and fluidLocation separation", () => {
    const separated = computePlanner(
      tankInput({
        glycolPercent: 25,
        fluidLocation: "circuit-only",
        fluidOverridden: false,
      }),
    );
    // Bath is water at mean temp
    expect(separated.density).toBeCloseTo(waterDensity(38), 1);
    expect(separated.specificHeat).toBeCloseTo(waterSpecificHeat(38), 2);
    // Circuit is glycol mix
    const mix = glycolMixProperties(25, 38);
    expect(separated.circuitDensity).toBeCloseTo(mix.density, 1);
    expect(separated.circuitSpecificHeat).toBeCloseTo(mix.specificHeat, 2);

    const overridden = computePlanner(
      tankInput({
        fluidOverridden: true,
        density: 1050,
        specificHeat: 3.65,
      }),
    );
    expect(overridden.density).toBe(1050);
    expect(overridden.specificHeat).toBe(3.65);
    expect(overridden.circuitDensity).toBe(1050);
    expect(overridden.circuitSpecificHeat).toBe(3.65);
  });
});

describe("12. Test against the reference example", () => {
  it("evaluates reference case: 5000 L, 16°C to 60°C, 120 kW, 20 K design ΔT, 80°C source, 3 K min approach, open top with agitation, 1.1 W/m²K walls, exposed base, 16°C ambient, 55% RH, no shell mass, insulated pipework 20 m at 76.1 mm OD and 0.8 W/m²K", () => {
    const input: Inputs = {
      ...DEFAULTS,
      application: "tank",
      shape: "rectangular",
      length: 2.5,
      width: 2.5,
      depth: 0.8,
      measuredVolume: 5000,
      construction: "twin-50",
      wallU: 1.1,
      baseExposed: true,
      topType: "open",
      ambient: 16,
      humidity: 55,
      startTemperature: 16,
      finishTemperature: 60,
      airCase: "agitated",
      evaporationFactor: 100,
      recoveryMode: "available",
      availableDuty: 120,
      desiredMinutes: 120,
      flowUnit: "m3h",
      sourceFlowTemperature: 80,
      minimumApproach: 3,
      designDeltaT: 20,
      additionalLoad: 0,
      steelMass: 0,
      glycolPercent: 0,
      fluidLocation: "both",
      fluidOverridden: false,
      flowOverridden: false,
      lossOverrideEnabled: false,
      lossOverrideKw: 0,
      includePipework: true,
      pipeLength: 20,
      pipeDiameterMm: 76.1,
      pipeU: 0.8,
      projectReference: "Reference Case 5000L",
    };

    const res = computePlanner(input);

    // Document and verify key values:
    // Mean temperature = (16 + 60) / 2 = 38 °C
    expect(res.density).toBeCloseTo(992.97, 1); // ~993.0 kg/m³
    expect(res.specificHeat).toBeCloseTo(4.175, 3); // ~4.175 kJ/kg·K
    expect(res.fluidMass).toBeCloseTo(4964.8, 0); // 5000 L * 0.99297 = ~4965 kg
    expect(res.thermalCapacity).toBeCloseTo(20730, -1); // ~20,730 kJ/K
    expect(res.sensibleEnergyKWh).toBeCloseTo(253.4, 1); // ~253.4 kWh

    // Circulation:
    // flow = 3600 * 120 / (992.97 * 4.175 * 20) = ~5.21 m³/h (~1.45 l/s)
    expect(res.calculatedFlowM3h).toBeCloseTo(5.21, 1);
    expect(res.circulationM3h).toBeCloseTo(5.21, 1);

    // Effective duties:
    // Start (16°C): source approach capacity = (5.21/3.6) * 0.99297 * 4.175 * (80 - 3 - 16) = 6.00 * 61 = ~366 kW -> capped at 120 kW
    expect(res.effectiveDutyAtStart).toBeCloseTo(120, 0);

    // Target (60°C): available delta = 80 - 3 - 60 = 17 K < design ΔT (20 K).
    // Effective duty at target = (5.21/3.6) * 0.99297 * 4.175 * 17 = 6.00 * 17 = ~102 kW!
    expect(res.effectiveDutyAtTarget).toBeCloseTo(102.0, 1);
    expect(res.approachLimitedAtTarget).toBe(true);

    // Heat up times:
    expect(res.noLossMinutes).toBeGreaterThan(120);
    expect(res.noLossMinutes).toBeLessThan(145);
    expect(res.recoveryMinutes).toBeGreaterThan(135);
    expect(res.recoveryMinutes).toBeLessThan(180);

    // Losses at target:
    expect(res.selectedBreakdown.evaporation).toBeGreaterThan(10);
    expect(res.selectedBreakdown.total).toBeGreaterThan(15);
  });
});
