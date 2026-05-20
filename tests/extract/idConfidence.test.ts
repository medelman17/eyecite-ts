import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("Id. citation confidence scoring (issue #129)", () => {
  function getIdConfidence(text: string): number | undefined {
    const cits = extractCitations(text)
    const id = cits.find((c) => c.type === "id")
    return id?.confidence
  }

  describe("standard form — confidence 1.0", () => {
    it("bare Id.", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id.")).toBe(1.0)
    })

    it("Id. at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id. at 253")).toBe(1.0)
    })

    it("after semicolon (string citation)", () => {
      expect(getIdConfidence("500 F.2d 100; Id. at 105")).toBe(1.0)
    })

    it("after close parenthetical", () => {
      expect(getIdConfidence("(2d Cir. 1974) Id. at 5")).toBe(1.0)
    })
  })

  describe("comma variant — confidence 0.9", () => {
    it("Id., at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id., at 28")).toBe(0.9)
    })

    it("Id., at range", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id., at 108-109")).toBe(0.9)
    })
  })

  describe("lowercase — confidence 0.85", () => {
    it("bare id.", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id.")).toBe(0.85)
    })

    it("id. at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id. at 5")).toBe(0.85)
    })

    it("id., at pincite (lowercase + comma)", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id., at 10")).toBe(0.85)
    })
  })

  describe("context validation — non-citation contexts penalized", () => {
    it("mid-sentence 'The Id. card' gets low confidence", () => {
      const conf = getIdConfidence("The Id. card was invalid.")
      expect(conf).toBeLessThanOrEqual(0.4)
    })

    it("mid-sentence 'His Id.' gets low confidence", () => {
      const conf = getIdConfidence("His Id. showed his age.")
      expect(conf).toBeLessThanOrEqual(0.4)
    })
  })

  // #557 — Bluebook signal phrases preceding `id.` were getting the
  // mid-sentence-prose penalty because they end on alphabetic chars or
  // a comma, not the `[.;)\]—:]` set. Signals are canonical citation
  // introducers and should keep the variant's base confidence (1.0 for
  // canonical `Id.`, 0.85 for lowercase `id.`).
  describe("citation signal context (#557) — signal-prefixed id keeps high confidence", () => {
    describe("Id. (canonical) after a signal — confidence 1.0", () => {
      it("'See Id.'", () => {
        expect(getIdConfidence("See Id.")).toBe(1.0)
      })

      it("'See also Id.'", () => {
        expect(getIdConfidence("See also Id.")).toBe(1.0)
      })

      it("'Cf. Id.'", () => {
        expect(getIdConfidence("Cf. Id.")).toBe(1.0)
      })

      it("'But see Id.'", () => {
        expect(getIdConfidence("But see Id.")).toBe(1.0)
      })

      it("'But cf. Id.'", () => {
        expect(getIdConfidence("But cf. Id.")).toBe(1.0)
      })

      it("'Compare Id.'", () => {
        expect(getIdConfidence("Compare Id.")).toBe(1.0)
      })

      it("'Accord Id.'", () => {
        expect(getIdConfidence("Accord Id.")).toBe(1.0)
      })

      it("'Contra Id.'", () => {
        expect(getIdConfidence("Contra Id.")).toBe(1.0)
      })

      it("'See generally Id.'", () => {
        expect(getIdConfidence("See generally Id.")).toBe(1.0)
      })

      it("'See, e.g., Id.'", () => {
        expect(getIdConfidence("See, e.g., Id.")).toBe(1.0)
      })

      it("'E.g., Id.'", () => {
        expect(getIdConfidence("E.g., Id.")).toBe(1.0)
      })
    })

    describe("id. (lowercase) after a signal — confidence 0.85", () => {
      it("'See id.'", () => {
        expect(getIdConfidence("See id.")).toBe(0.85)
      })

      it("'See also id.'", () => {
        expect(getIdConfidence("See also id.")).toBe(0.85)
      })

      it("'Cf. id.'", () => {
        expect(getIdConfidence("Cf. id.")).toBe(0.85)
      })

      it("'But see id.'", () => {
        expect(getIdConfidence("But see id.")).toBe(0.85)
      })

      it("'Compare id.'", () => {
        expect(getIdConfidence("Compare id.")).toBe(0.85)
      })

      it("'See, e.g., id.'", () => {
        expect(getIdConfidence("See, e.g., id.")).toBe(0.85)
      })

      it("'E.g., id.'", () => {
        expect(getIdConfidence("E.g., id.")).toBe(0.85)
      })
    })

    describe("signal preceded by a full citation — confidence preserved", () => {
      it("'... (1974). See id.' keeps lowercase 0.85", () => {
        expect(getIdConfidence("See Smith v. Jones, 500 F.2d 100 (1974). See id.")).toBe(0.85)
      })

      it("'... (1974). See Id.' keeps canonical 1.0", () => {
        expect(getIdConfidence("See Smith v. Jones, 500 F.2d 100 (1974). See Id.")).toBe(1.0)
      })
    })
  })
})
