import { describe, expect, it } from "vitest"
import { calibrate, getCalibrationTable } from "@/score/calibrate"

describe("calibrate", () => {
  it("returns raw score unchanged for unknown pattern (identity fallback)", () => {
    expect(calibrate(0.42, "nonexistent-pattern")).toBe(0.42)
    expect(calibrate(1.0, "nonexistent-pattern")).toBe(1.0)
    expect(calibrate(0, "nonexistent-pattern")).toBe(0)
  })

  it("getCalibrationTable returns empty calibrators in Phase 1", () => {
    const t = getCalibrationTable()
    expect(t.scorerVersion).toBe("1.0")
    expect(t.calibrators).toEqual({})
  })

  it("respects calibration table when set", () => {
    // Inject a fake calibrator via internal helper
    const t = getCalibrationTable()
    t.calibrators["federal-reporter"] = {
      kind: "histogram",
      bins: [
        { min: 0, max: 0.5, calibrated: 0.4 },
        { min: 0.5, max: 1.0, calibrated: 0.9 },
      ],
    }
    expect(calibrate(0.3, "federal-reporter")).toBe(0.4)
    expect(calibrate(0.7, "federal-reporter")).toBe(0.9)
    // cleanup
    delete t.calibrators["federal-reporter"]
  })

  it("clamps to [0, 1] always", () => {
    expect(calibrate(1.5, "x")).toBe(1.0)
    expect(calibrate(-0.5, "x")).toBe(0)
  })
})
