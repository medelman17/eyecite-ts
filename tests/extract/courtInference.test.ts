import { describe, expect, it } from "vitest"
import { inferCourtFromReporter } from "@/extract/courtInference"

describe("inferCourtFromReporter", () => {
  describe("federal supreme", () => {
    it.each(["U.S.", "S. Ct.", "L. Ed.", "L. Ed. 2d"])(
      "infers supreme/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "supreme",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("federal appellate", () => {
    it.each(["F.", "F.2d", "F.3d", "F.4th", "F. App'x"])(
      "infers appellate/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "appellate",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("federal trial", () => {
    it.each(["F. Supp.", "F. Supp. 2d", "F. Supp. 3d", "F.R.D.", "B.R."])(
      "infers trial/federal for %s",
      (reporter) => {
        const result = inferCourtFromReporter(reporter)
        expect(result).toEqual({
          level: "trial",
          jurisdiction: "federal",
          confidence: 1.0,
        })
      },
    )
  })

  describe("state-specific", () => {
    it("infers appellate/state/CA for Cal.App.5th", () => {
      expect(inferCourtFromReporter("Cal.App.5th")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "CA",
        confidence: 1.0,
      })
    })

    it("infers trial/state/NY for Misc.3d", () => {
      expect(inferCourtFromReporter("Misc.3d")).toEqual({
        level: "trial",
        jurisdiction: "state",
        state: "NY",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/NY for A.D.3d", () => {
      expect(inferCourtFromReporter("A.D.3d")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "NY",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/IL for Ill.App.3d", () => {
      expect(inferCourtFromReporter("Ill.App.3d")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "IL",
        confidence: 1.0,
      })
    })
  })

  describe("regional multi-state", () => {
    it.each([
      "A.2d",
      "A.3d",
      "S.E.2d",
      "N.E.2d",
      "N.E.3d",
      "N.W.2d",
      "S.W.3d",
      "So.2d",
      "So.3d",
      "P.2d",
      "P.3d",
    ])("infers appellate/state with 0.7 confidence for %s (no state)", (reporter) => {
      const result = inferCourtFromReporter(reporter)
      expect(result).toBeDefined()
      expect(result?.jurisdiction).toBe("state")
      expect(result?.confidence).toBe(0.7)
      expect(result?.state).toBeUndefined()
    })
  })

  describe("unknown reporters", () => {
    it("returns undefined for unknown reporter", () => {
      expect(inferCourtFromReporter("Xyz.Rptr.")).toBeUndefined()
    })

    it("returns undefined for empty string", () => {
      expect(inferCourtFromReporter("")).toBeUndefined()
    })
  })
})
