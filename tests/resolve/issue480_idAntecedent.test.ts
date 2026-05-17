/**
 * Issue #480: Id./short-form antecedent resolution for complex documents.
 *
 * The current resolver picks the most-recent non-parenthetical-child full
 * citation as Id.'s antecedent regardless of:
 *   - signal phrases (see/see also/cf./but cf./compare/see generally)
 *   - block-quote zones (citations inside `>` blockquotes shouldn't compete)
 *   - the citation type "family" implied by Id.'s pincite shape (a page-style
 *     pincite means a case is intended; a section-style pincite means a
 *     statute is intended)
 *   - a case name mentioned in the prose immediately before Id. (the
 *     case-name window heuristic — if the window names a case that doesn't
 *     match the picked antecedent, surface ambiguity)
 *
 * These tests encode the desired behavior. They fail under the pre-fix
 * resolver and pass after the targeted DocumentResolver changes.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #480: Id./short-form antecedent resolution", () => {
  // Criterion 1: simple case → Id. — no regression.
  describe("simple case → Id. (no regression)", () => {
    it("resolves Id. to the only preceding case", () => {
      const text = "Smith v. Jones, 100 F.2d 123 (2d Cir. 1990). Id. at 125."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const smith = citations.find((c) => c.type === "case")!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    })

    it("resolves Id. to the most-recent of two unsignaled cases", () => {
      const text =
        "People v. Resek, 3 N.Y.3d 385 (2004). " +
        "People v. Henderson, 28 N.Y.3d 63 (2016). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })
  })

  // Criterion 3: signal-phrase awareness — see / see also / cf. / but cf. /
  // compare / see generally are "asides" and should not become Id. antecedents
  // when a more-recent non-signaled case is in scope.
  describe("signal-phrase awareness", () => {
    it("Id. skips over a 'see also' intervening case", () => {
      const text =
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016). " +
        "See also People v. Molineux, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. skips over a 'cf.' intervening case", () => {
      const text =
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016). " +
        "Cf. People v. Molineux, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. skips over a 'see' intervening case", () => {
      const text =
        "Henderson v. State, 28 N.Y.3d 63, 70 (2016). " +
        "See Adams v. Brown, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. skips over a 'but cf.' intervening case", () => {
      const text =
        "Henderson v. State, 28 N.Y.3d 63, 70 (2016). " +
        "But cf. Adams v. Brown, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. skips over a 'compare' intervening case", () => {
      const text =
        "Henderson v. State, 28 N.Y.3d 63, 70 (2016). " +
        "Compare Adams v. Brown, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. skips over a 'see generally' intervening case", () => {
      const text =
        "Henderson v. State, 28 N.Y.3d 63, 70 (2016). " +
        "See generally Adams v. Brown, 168 N.Y. 264 (1901). Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. resolves to a weakly-signaled case when no strong case is in scope", () => {
      // Only weakly-signaled candidates exist; fall back to most recent.
      const text =
        "See People v. Resek, 3 N.Y.3d 385 (2004). " +
        "See also People v. Molineux, 168 N.Y. 264 (1901). Id. at 270."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const molineux = citations.find((c) => c.type === "case" && c.volume === 168)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(molineux))
    })

    it("Id. does not skip a string-cite group when its members share a leading signal", () => {
      // Existing behavior preserved: "See A; B" is a single string-cite group;
      // Id. resolves to B (the most-recent member of the group).
      const text =
        "See Smith v. Jones, 100 F.2d 123 (2d Cir. 1990); " +
        "Doe v. Roe, 200 F.3d 456 (3d Cir. 2000). Id. at 458."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const doe = citations.find((c) => c.type === "case" && c.volume === 200)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(doe))
    })
  })

  // Criterion 2: quote-boundary respect — citations inside a block quote or
  // inline quote don't compete; Id. immediately after the quote refers to the
  // case that introduced the quote.
  describe("quote-boundary respect", () => {
    it("Id. after a markdown blockquote skips citations inside the quote", () => {
      const text =
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016) held the following:\n\n" +
        '> "We have long required courts to give a limiting instruction. People v.\n' +
        '> Williams, 50 N.Y.2d 996 (1980); People v. Beam, 57 N.Y.2d 241 (1982)."\n\n' +
        "Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })

    it("Id. after an inline quoted passage skips citations inside the quote", () => {
      // The Id. follows a closing quote that wraps the intervening case.
      const text =
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016) noted, " +
        '"the rule traces back to People v. Williams, 50 N.Y.2d 996 (1980)." ' +
        "Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
    })
  })

  // Criterion 4: case-name window check — when the prose immediately before
  // Id. mentions a case name that doesn't match the picked antecedent, the
  // resolution is marked as ambiguous (lower confidence + warning) rather
  // than committed silently.
  describe("case-name window check", () => {
    it("matching window name → high confidence, no ambiguity warning", () => {
      const text =
        "People v. Resek, 3 N.Y.3d 385 (2004). " +
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016). " +
        "As Henderson held, the rule is settled. Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const henderson = citations.find((c) => c.type === "case" && c.volume === 28)!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(henderson))
      expect(id.confidence.axes.resolution!).toBeGreaterThanOrEqual(0.95)
      const hasAmbiguity = id.resolution?.warnings?.some((w: string) => /ambig/i.test(w)) ?? false
      expect(hasAmbiguity).toBe(false)
    })

    it("non-matching window name → ambiguity warning + downgraded confidence", () => {
      // "As Resek held" precedes Id. but Henderson is the most-recent candidate.
      // The resolver still commits to Henderson (recency wins) but flags
      // ambiguity so consumers can review.
      const text =
        "People v. Resek, 3 N.Y.3d 385, 388 (2004). " +
        "People v. Henderson, 28 N.Y.3d 63, 70 (2016). " +
        "As Resek held, the rule is settled. Id. at 70."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const id = citations.find((c) => c.type === "id")!
      // Still resolved (we don't refuse to commit), but with lower confidence
      // and an ambiguity warning.
      expect(id.resolution?.resolvedTo).not.toBeUndefined()
      expect(id.confidence.axes.resolution!).toBeLessThan(1.0)
      const hasAmbiguity = id.resolution?.warnings?.some((w: string) => /ambig/i.test(w)) ?? false
      expect(hasAmbiguity).toBe(true)
    })
  })

  // Criterion 5: non-case citations don't compete with case citations for
  // Id.'s antecedent when Id.'s pincite shape suggests a case (the default).
  // A statute is only a valid Id. antecedent when no case is in scope OR when
  // Id. carries a section-style pincite (e.g., `Id. § 1983(c)`).
  describe("non-case citations don't compete", () => {
    it("case → statute → Id. (page pincite) skips the statute", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (2020). 42 U.S.C. § 1983. Id. at 125."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const smith = citations.find((c) => c.type === "case")!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    })

    it("case → statute → Id. (no pincite) skips the statute", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (2020). 42 U.S.C. § 1983. Id."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const smith = citations.find((c) => c.type === "case")!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    })

    it("statute-only context: Id. still resolves to the statute (only option)", () => {
      const text = "42 U.S.C. § 1983. Id."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const statute = citations.find((c) => c.type === "statute")!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
    })

    it("section-style trailing pincite (`Id. § 1983(c)`) keeps statute antecedent", () => {
      // Id. is followed by a `§` token in the surrounding text, signaling the
      // writer intends a statute antecedent. Resolve to the most-recent
      // statute (the statute, not the case).
      const text = "Smith v. Jones, 500 F.2d 123 (2020). 42 U.S.C. § 1983. Id. § 1983(c)."
      const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
      const statute = citations.find((c) => c.type === "statute")!
      const id = citations.find((c) => c.type === "id")!
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
    })
  })
})
