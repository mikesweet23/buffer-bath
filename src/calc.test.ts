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

function tankInput(overrides: Partial<Inputs> = {}): Inputs {
  return {
    ...DEFAULTS,
    construction: "twin-50",
    ...overrides,
  };
}

describe("glycol mix properties", () => {
  it("returns water-like properties at 0% glycol", () => {
    const mix = glycolMixProperties(0, 20);
    expect(mix.density).toBeCloseTo(waterDensity(20), 0);
    expect(mix.specificHeat).toBeCloseTo(waterSpecificHeat(20), 2);
    expect(mix.density).toBeGreaterThan(995);
    expect(mix.density).toBeLessThan(1000);
    expect(mix.specificHeat).toBeGreaterThan(4.15);
    expect(mix.specificHeat).toBeLessThan(4.22);
  });

  it("reduces specific heat and increases density from 0% to 30% glycol", () => {
    const water = glycolMixProperties(0, 20);
    const ten = glycolMixProperties(10, 20);
    const thirty = glycolMixProperties(30, 20);
    expect(ten.specificHeat).toBeLessThan(water.specificHeat);
    expect(thirty.specificHeat).toBeLessThan(ten.specificHeat);
    expect(ten.density).toBeGreaterThan(water.density);
    expect(thirty.density).toBeGreaterThan(ten.density);
    expect(thirty.specificHeat).toBeGreaterThan(3.55);
    expect(thirty.specificHeat).toBeLessThan(4.0);
    expect(thirty.density).toBeGreaterThan(1025);
    expect(thirty.density).toBeLessThan(1055);
  });

  it("clamps glycol above 30%", () => {
    const thirty = glycolMixProperties(30, 20);
    const high = glycolMixProperties(80, 20);
    expect(high.density).toBeCloseTo(thirty.density, 6);
    expect(high.specificHeat).toBeCloseTo(thirty.specificHeat, 6);
  });

  it("feeds planner Cp from glycol unless fluid properties are overridden", () => {
    const auto = computePlanner(tankInput({ glycolPercent: 20, fluidOverridden: false }));
    const mix = glycolMixProperties(20, (16 + 60) / 2);
    expect(auto.specificHeat).toBeCloseTo(mix.specificHeat, 6);
    expect(auto.density).toBeCloseTo(mix.density, 6);

    const overridden = computePlanner(
      tankInput({
        glycolPercent: 20,
        fluidOverridden: true,
        density: 1000,
        specificHeat: 4.186,
      }),
    );
    expect(overridden.specificHeat).toBeCloseTo(4.186, 6);
    expect(overridden.density).toBeCloseTo(1000, 6);
  });
});

describe("duty, flow and override limiting kW", () => {
  it("calculates circulation from kW and ΔT", () => {
    const density = 998;
    const cp = 4.182;
    const duty = 120;
    const deltaT = 10;
    const flow = flowM3hFromDuty(duty, density, cp, deltaT);
    expect(dutyFromFlowM3h(flow, density, cp, deltaT)).toBeCloseTo(duty, 6);
    const result = computePlanner(
      tankInput({
        availableDuty: duty,
        designDeltaT: deltaT,
        flowOverridden: false,
        glycolPercent: 0,
        fluidOverridden: true,
        density,
        specificHeat: cp,
      }),
    );
    expect(result.calculatedFlowM3h).toBeCloseTo(flow, 6);
    expect(result.circulationM3h).toBeCloseTo(flow, 6);
    expect(result.duty).toBeCloseTo(duty, 6);
  });

  it("limits usable kW when flow is overridden below the calculated circulation", () => {
    const density = 998;
    const cp = 4.182;
    const duty = 120;
    const deltaT = 10;
    const fullFlow = flowM3hFromDuty(duty, density, cp, deltaT);
    const halfFlow = fullFlow / 2;
    const limited = computePlanner(
      tankInput({
        availableDuty: duty,
        designDeltaT: deltaT,
        flowOverridden: true,
        circulation: halfFlow,
        glycolPercent: 0,
        fluidOverridden: true,
        density,
        specificHeat: cp,
        sourceFlowTemperature: 90,
        minimumApproach: 0,
      }),
    );
    expect(limited.duty).toBeCloseTo(duty / 2, 5);
    expect(limited.duty).toBeLessThan(duty);
    expect(limited.enteredDuty).toBeCloseTo(duty, 6);
  });

  it("does not raise kW above the entered duty when flow is overridden high", () => {
    const result = computePlanner(
      tankInput({
        availableDuty: 80,
        designDeltaT: 10,
        flowOverridden: true,
        circulation: 200,
        sourceFlowTemperature: 90,
        minimumApproach: 0,
      }),
    );
    expect(result.duty).toBeLessThanOrEqual(80.001);
  });
});

describe("heat-up with and without losses", () => {
  it("reports a longer heat-up with losses than with no losses", () => {
    const result = computePlanner(
      tankInput({
        availableDuty: 120,
        designDeltaT: 10,
        flowOverridden: false,
        topType: "closed-insulated",
        wallU: 1.1,
        startTemperature: 16,
        finishTemperature: 60,
        sourceFlowTemperature: 85,
        minimumApproach: 3,
      }),
    );
    expect(result.noLossMinutes).toBeGreaterThan(0);
    expect(result.recoveryMinutes).toBeGreaterThan(result.noLossMinutes);
    expect(Number.isFinite(result.recoveryMinutes)).toBe(true);
  });

  it("uses overridden insulation losses in the with-losses heat-up", () => {
    const base = computePlanner(
      tankInput({
        availableDuty: 80,
        designDeltaT: 10,
        flowOverridden: false,
        topType: "closed-insulated",
        lossOverrideEnabled: false,
        sourceFlowTemperature: 85,
      }),
    );
    const highLoss = computePlanner(
      tankInput({
        availableDuty: 80,
        designDeltaT: 10,
        flowOverridden: false,
        topType: "closed-insulated",
        lossOverrideEnabled: true,
        lossOverrideKw: 40,
        sourceFlowTemperature: 85,
      }),
    );
    const noLossOverride = computePlanner(
      tankInput({
        availableDuty: 80,
        designDeltaT: 10,
        flowOverridden: false,
        topType: "closed-insulated",
        lossOverrideEnabled: true,
        lossOverrideKw: 0,
        sourceFlowTemperature: 85,
      }),
    );
    expect(highLoss.recoveryMinutes).toBeGreaterThan(base.recoveryMinutes);
    expect(noLossOverride.recoveryMinutes).toBeCloseTo(base.noLossMinutes, 0);
    expect(highLoss.selectedBreakdown.overridden).toBe(true);
    expect(highLoss.noLossMinutes).toBeCloseTo(base.noLossMinutes, 0);
  });

  it("gates live results until tank construction is selected", () => {
    const waiting = computePlanner({ ...DEFAULTS, construction: "" });
    const ready = computePlanner(tankInput());
    expect(waiting.resultsReady).toBe(false);
    expect(ready.resultsReady).toBe(true);
    expect(computePlanner({ ...DEFAULTS, application: "lphw" }).resultsReady).toBe(true);
  });
});
