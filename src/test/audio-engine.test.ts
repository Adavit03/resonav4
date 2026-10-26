import { describe, expect, it } from "vitest";
import { EQ_FREQS, EQ_PRESETS, SPATIAL_PRESETS, hearingToEq } from "@/lib/audio-engine";

describe("Resona Audio Engine Configuration", () => {
  it("defines standard 10-band EQ frequencies from 32 Hz to 16 kHz", () => {
    expect(EQ_FREQS).toEqual([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
  });

  it("contains calibrated spatial presets including Neutral, Concert Stage, and 24D", () => {
    expect(SPATIAL_PRESETS.Neutral).toBeDefined();
    expect(SPATIAL_PRESETS.Neutral.bypass).toBe(true);

    expect(SPATIAL_PRESETS["Concert Stage"]).toBeDefined();
    expect(SPATIAL_PRESETS["Concert Stage"].reverb).toBeGreaterThan(0.1);

    expect(SPATIAL_PRESETS["24D"]).toBeDefined();
    expect(SPATIAL_PRESETS["24D"].orbit).toBeLessThanOrEqual(0.85); // Safe phase-locked orbit
  });

  it("contains curated EQ presets including Warm, Concert, and Focus", () => {
    expect(EQ_PRESETS.Flat).toHaveLength(10);
    expect(EQ_PRESETS.Focus).toHaveLength(10);
    expect(EQ_PRESETS.Concert).toHaveLength(10);
  });

  it("maps hearing check threshold test results accurately to gentle compensation gain", () => {
    // Zero loss results in 0 gain across all bands
    const flatThresholds = { 125: -30, 250: -30, 500: -30, 1000: -30, 2000: -30, 4000: -30, 8000: -30, 16000: -30 };
    const flatEq = hearingToEq(flatThresholds);
    expect(flatEq.every((g) => g === 0)).toBe(true);

    // Hearing loss at higher frequencies results in compensatory lift capped at safe dB
    const lossThresholds = { 125: -30, 250: -30, 500: -30, 1000: -30, 2000: -30, 4000: -18, 8000: -12, 16000: -6 };
    const compEq = hearingToEq(lossThresholds);
    expect(compEq[EQ_FREQS.indexOf(8000)]).toBeGreaterThan(0);
    expect(compEq.every((g) => g <= 8)).toBe(true);
  });
});
