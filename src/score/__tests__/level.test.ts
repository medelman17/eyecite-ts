import { describe, expect, it } from "vitest"
import { deriveLevel } from "@/score/level"

describe("deriveLevel", () => {
  it("≥0.95 → certain", () => {
    expect(deriveLevel(0.95)).toBe("certain")
    expect(deriveLevel(1.0)).toBe("certain")
  })
  it("≥0.80 and <0.95 → high", () => {
    expect(deriveLevel(0.8)).toBe("high")
    expect(deriveLevel(0.94)).toBe("high")
  })
  it("≥0.50 and <0.80 → medium", () => {
    expect(deriveLevel(0.5)).toBe("medium")
    expect(deriveLevel(0.79)).toBe("medium")
  })
  it("<0.50 → low", () => {
    expect(deriveLevel(0.49)).toBe("low")
    expect(deriveLevel(0)).toBe("low")
  })
})
