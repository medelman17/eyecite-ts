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

    it.each(["U. S.", "S.Ct.", "L.Ed.", "L.Ed.2d", "L.Ed. 2d", "L. Ed.2d"])(
      "infers supreme/federal for spacing variant %s",
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
    it.each(["F. Supp.", "F. Supp. 2d", "F. Supp. 3d", "F. Supp. 4th", "F.R.D.", "B.R."])(
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

  describe("california", () => {
    it.each(["Cal.", "Cal.2d", "Cal.3d", "Cal.4th", "Cal.5th"])(
      "infers supreme/state/CA for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "supreme",
          jurisdiction: "state",
          state: "CA",
          confidence: 1.0,
        })
      },
    )

    it.each(["Cal.App.", "Cal.App.2d", "Cal.App.3d", "Cal.App.4th", "Cal.App.5th"])(
      "infers appellate/state/CA for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "appellate",
          jurisdiction: "state",
          state: "CA",
          confidence: 1.0,
        })
      },
    )

    it.each(["Cal.Rptr.", "Cal.Rptr.2d", "Cal.Rptr.3d"])(
      "infers unknown/state/CA for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "unknown",
          jurisdiction: "state",
          state: "CA",
          confidence: 1.0,
        })
      },
    )
  })

  describe("new york", () => {
    it.each(["N.Y.", "N.Y.2d", "N.Y.3d"])(
      "infers supreme/state/NY for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "supreme",
          jurisdiction: "state",
          state: "NY",
          confidence: 1.0,
        })
      },
    )

    it.each(["A.D.", "A.D.2d", "A.D.3d"])(
      "infers appellate/state/NY for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "appellate",
          jurisdiction: "state",
          state: "NY",
          confidence: 1.0,
        })
      },
    )

    it.each(["Misc.", "Misc.2d", "Misc.3d"])(
      "infers trial/state/NY for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "trial",
          jurisdiction: "state",
          state: "NY",
          confidence: 1.0,
        })
      },
    )

    it.each(["N.Y.S.", "N.Y.S.2d", "N.Y.S.3d"])(
      "infers unknown/state/NY for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "unknown",
          jurisdiction: "state",
          state: "NY",
          confidence: 1.0,
        })
      },
    )
  })

  describe("illinois", () => {
    it.each(["Ill.", "Ill.2d"])("infers supreme/state/IL for %s", (reporter) => {
      expect(inferCourtFromReporter(reporter)).toEqual({
        level: "supreme",
        jurisdiction: "state",
        state: "IL",
        confidence: 1.0,
      })
    })

    it.each(["Ill.App.", "Ill.App.2d", "Ill.App.3d"])(
      "infers appellate/state/IL for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "appellate",
          jurisdiction: "state",
          state: "IL",
          confidence: 1.0,
        })
      },
    )

    it("infers unknown/state/IL for Ill.Dec.", () => {
      expect(inferCourtFromReporter("Ill.Dec.")).toEqual({
        level: "unknown",
        jurisdiction: "state",
        state: "IL",
        confidence: 1.0,
      })
    })
  })

  describe("ohio", () => {
    it.each(["Ohio St.", "Ohio St.2d", "Ohio St.3d"])(
      "infers supreme/state/OH for %s",
      (reporter) => {
        expect(inferCourtFromReporter(reporter)).toEqual({
          level: "supreme",
          jurisdiction: "state",
          state: "OH",
          confidence: 1.0,
        })
      },
    )

    it("infers appellate/state/OH for Ohio App.3d", () => {
      expect(inferCourtFromReporter("Ohio App.3d")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "OH",
        confidence: 1.0,
      })
    })
  })

  describe("pennsylvania", () => {
    it("infers supreme/state/PA for Pa.", () => {
      expect(inferCourtFromReporter("Pa.")).toEqual({
        level: "supreme",
        jurisdiction: "state",
        state: "PA",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/PA for Pa. Super.", () => {
      expect(inferCourtFromReporter("Pa. Super.")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "PA",
        confidence: 1.0,
      })
    })
  })

  describe("other states", () => {
    it("infers supreme/state/TX for Tex.", () => {
      expect(inferCourtFromReporter("Tex.")).toEqual({
        level: "supreme",
        jurisdiction: "state",
        state: "TX",
        confidence: 1.0,
      })
    })

    it("infers supreme/state/FL for Fla.", () => {
      expect(inferCourtFromReporter("Fla.")).toEqual({
        level: "supreme",
        jurisdiction: "state",
        state: "FL",
        confidence: 1.0,
      })
    })

    it("infers supreme/state/MA for Mass.", () => {
      expect(inferCourtFromReporter("Mass.")).toEqual({
        level: "supreme",
        jurisdiction: "state",
        state: "MA",
        confidence: 1.0,
      })
    })

    it("infers appellate/state/MA for Mass. App. Ct.", () => {
      expect(inferCourtFromReporter("Mass. App. Ct.")).toEqual({
        level: "appellate",
        jurisdiction: "state",
        state: "MA",
        confidence: 1.0,
      })
    })
  })

  describe("regional multi-state", () => {
    it.each([
      "A.",
      "A.2d",
      "A.3d",
      "S.E.",
      "S.E.2d",
      "S.E.3d",
      "S.W.",
      "S.W.2d",
      "S.W.3d",
      "N.E.",
      "N.E.2d",
      "N.E.3d",
      "N.W.",
      "N.W.2d",
      "N.W.3d",
      "So.",
      "So.2d",
      "So.3d",
      "P.",
      "P.2d",
      "P.3d",
    ])("infers unknown/state with 0.7 confidence for %s (no state)", (reporter) => {
      const result = inferCourtFromReporter(reporter)
      expect(result).toBeDefined()
      expect(result?.level).toBe("unknown")
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
