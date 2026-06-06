/**
 * Issue #830: with a length-changing `cleaner` active, `Id.` resolves to a
 * citation nested inside another cite's `(quoting …)` explanatory parenthetical
 * instead of the citation-sentence's main case.
 *
 * Root cause: the resolution subsystem assumes clean-text offsets == original-
 * text offsets and reads `this.text` (the ORIGINAL text) using citation
 * `cleanStart`/`cleanEnd` offsets for its bracket-scope / trigger-anchor
 * analysis. A cleaner that *shrinks* the text (e.g. markdown-emphasis stripping)
 * makes those offsets diverge, and the divergence grows with the amount of
 * removed preceding content — so the parenthetical-child detection reads the
 * wrong region and the trailing `Id.` binds to the quoted child.
 *
 * The invariant: resolving text via a length-changing cleaner must produce the
 * SAME antecedent as resolving the already-stripped (original == clean) text.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { resolveCitations } from "@/resolve"
import type { ResolvedCitation } from "@/resolve/types"

/** A length-changing markdown-emphasis stripper (the reported trigger). */
const stripMarkdownEmphasis = (t: string): string =>
  t
    .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/(?<![\\*])\*([^\s*][\s\S]*?[^\s*])\*(?![*\d])/g, "$1")

interface MaybePincite {
  pincite?: number | string
}
interface MaybeCaseName {
  caseName?: string
}
interface MaybeInferred {
  inferredCaseName?: string
  inferredCaseNameSpan?: {
    cleanStart: number
    cleanEnd: number
    originalStart: number
    originalEnd: number
  }
}

/**
 * Resolve `text` and return the caseName the `Id.` whose pincite includes
 * `pinciteNeedle` binds to. `viaCleaner` chooses the markdown-stripping cleaner
 * path vs. feeding already-stripped (original == clean) text.
 */
const idAntecedentCaseName = (
  text: string,
  pinciteNeedle: string,
  viaCleaner: boolean,
): string | undefined => {
  const cites = (
    viaCleaner
      ? extractCitations(text, { resolve: true, cleaners: [stripMarkdownEmphasis] })
      : extractCitations(stripMarkdownEmphasis(text), { resolve: true })
  ) as ResolvedCitation[]
  const id = cites.find(
    (c) =>
      c.type === "id" &&
      String((c as unknown as MaybePincite).pincite ?? "").includes(pinciteNeedle),
  )
  const to = id?.resolution?.resolvedTo
  return to != null ? (cites[to] as unknown as MaybeCaseName).caseName : undefined
}

// The reported document (Section II accumulates the context that triggers the
// drift; Section III holds the misbinding `Id. at 58–59`).
const SECTION_II_III = `II. THE THIRD CAUSE OF ACTION FOR UNJUST ENRICHMENT MUST BE DISMISSED.

"The existence of a valid and enforceable written contract governing a particular subject matter ordinarily precludes recovery in quasi contract for events arising out of the same subject matter." *Singh v. T-Mobile*, 232 A.D.3d 662, 662 (2d Dep't 2024) (quoting *Barker v. Time Warner Cable, Inc.*, 83 A.D.3d 750, 752); accord *Polaris Venture Partners VI L.P. v. AD-Venture Capital Partners L.P.*, 179 A.D.3d 548, 548 (1st Dep't 2020) ("the existence of an express contract governing the subject matter precludes plaintiffs claim for unjust enrichment") (citing *Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co.*, 70 N.Y.2d 382, 388 (1987)); *DirecTV, LLC v. Nexstar Broadcasting, Inc.*, 2024 NY Slip Op 04225 (1st Dep't 2024) (unjust enrichment claim precluded and properly dismissed where parties executed a valid written contract governing the subject matter); *Bronx-Lebanon Hosp. Ctr. v. New York State Catholic Health Plan, Inc.*, 2025 NY Slip Op 01161 (1st Dep't 2025) (dismissing quasi-contract claims where "all aspects of the dispute" were governed by the written agreements at issue).

III. THE FOURTH CAUSE OF ACTION MUST BE DISMISSED BECAUSE INJUNCTIVE RELIEF IS A REMEDY, NOT AN INDEPENDENT CAUSE OF ACTION.

As the courts have repeatedly held, "[a]n injunction is a remedy, a form of relief that may be granted against a defendant when its proponent establishes the merits of its substantive cause of action against that defendant." *Weinreb v. 37 Apartments Corp.*, 97 A.D.3d 54, 59 (1st Dep't 2012). "Although it is permissible to plead a cause of action for a permanent injunction, . . . permanent injunctive relief is, at its core, a remedy that is dependent on the merits of the substantive claims asserted." *Id.* (quoting *Corsello v. Verizon N.Y., Inc.*, 77 A.D.3d 344, 368 (1st Dep't 2010)). Consequently, "injunctive relief is simply not available when the plaintiff does not have any remaining substantive cause of action." *Id.* at 58–59; accord *Klein v. Catholic Health Sys. of Long Is., Inc.*, 231 A.D.3d 797, 797 (2d Dep't 2024); *Pickard v. Campbell*, 207 A.D.3d 1105, 1110 (4th Dep't 2022) (request for an injunction dismissed "despite being styled as a separate cause of action"); *Fenton v. Floce Holdings, LLC*, 2024 NY Slip Op 04063, at *3 (2d Dep't 2024); *Hogue v. Village of Dering Harbor*, 199 A.D.3d 900, 903 (2d Dep't 2021).`

// A reduced reproducer (~5 cites vs. the 14-cite report). Verified to FAIL on
// the pre-fix resolver: three emphasis-wrapped prefix cites accumulate enough
// cleaner drift that the trailing `Id. at 58` mis-binds to the quoted child
// ("Child v. Quoted") instead of the citing authority ("Main Co. v. Lead Corp.").
const SYNTH = `*Aaa Co. v. Bbb Inc.*, 100 N.E.3d 1, 5 (2020) (quoting *Ccc v. Ddd*, 10 N.E.2d 2, 3); *Eee Co. v. Fff LLC*, 200 N.E.3d 4, 8 (2021) (citing *Ggg v. Hhh*, 20 N.E.2d 5, 6); *Iii v. Jjj*, 2024 NY Slip Op 04225 (2024). *Main Co. v. Lead Corp.*, 97 A.D.3d 54, 59 (2012). *Id.* (quoting *Child v. Quoted*, 77 A.D.3d 344, 368 (2010)). *Id.* at 58.`

describe("Issue #830: cleaner clean/original coordinate desync in Id. resolution", () => {
  it("full doc: Id. at 58–59 resolves to the citing case (Weinreb), not the quoted child (Corsello)", () => {
    expect(idAntecedentCaseName(SECTION_II_III, "58", true)).toBe("Weinreb v. 37 Apartments Corp.")
  })

  it("regression: the first Id. (pincite 59, before the quoting aside) still resolves to Weinreb via the cleaner", () => {
    // This Id. resolved correctly even before the fix (it precedes the
    // (quoting Corsello) aside); guard that the coordinate change didn't break it.
    expect(idAntecedentCaseName(SECTION_II_III, "59", true)).toBe("Weinreb v. 37 Apartments Corp.")
  })

  it("invariant: resolving via a length-changing cleaner equals resolving pre-stripped text", () => {
    const viaCleaner = idAntecedentCaseName(SECTION_II_III, "58", true)
    const preStripped = idAntecedentCaseName(SECTION_II_III, "58", false)
    expect(viaCleaner).toBe(preStripped)
  })

  it("regression: the pre-stripped (original == clean) path already resolves to Weinreb", () => {
    expect(idAntecedentCaseName(SECTION_II_III, "58", false)).toBe("Weinreb v. 37 Apartments Corp.")
  })

  it("reduced reproducer: Id. at 58 binds to the citing authority (Main), not the quoted child", () => {
    // Verified to fail on the pre-fix resolver (last Id. -> "Child v. Quoted" /
    // an earlier prefix cite). With the fix it binds to the citing authority.
    const viaCleaner = idAntecedentCaseName(SYNTH, "58", true)
    const preStripped = idAntecedentCaseName(SYNTH, "58", false)
    expect(viaCleaner).toBe("Main Co. v. Lead Corp.")
    expect(viaCleaner).toBe(preStripped)
  })

  it("short-form prose inference under a cleaner: inferred name + its ORIGINAL-text span map correctly", () => {
    // Exercises extractInferredCaseName's window read (now on cleaned text) and
    // the clean->original span mapping. The cleaner strips emphasis, so the
    // inferred-name span must map back to the ORIGINAL (emphasized) text — not
    // the clean offset, which would land in the wrong place.
    const original =
      "*Smith v. Jones*, 100 F.2d 50, 55 (1990). In *Yellen v. Kassin*, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(original, {
      resolve: true,
      cleaners: [stripMarkdownEmphasis],
    }) as ResolvedCitation[]
    const short = cites.find((c) => c.type === "shortFormCase") as unknown as MaybeInferred | undefined
    expect(short?.inferredCaseName).toBe("Yellen v. Kassin")
    const span = short?.inferredCaseNameSpan
    expect(span).toBeDefined()
    if (span) {
      const cleaned = stripMarkdownEmphasis(original)
      // cleanStart must land on the name in the CLEANED text. Before the fix the
      // window was scanned against the original text, so cleanStart held an
      // ORIGINAL offset — wrong against the cleaned text. (This is the assertion
      // that fails on the pre-fix resolver.)
      expect(cleaned.startsWith("Yellen v. Kassin", span.cleanStart)).toBe(true)
      // originalStart must land on the name in the ORIGINAL (emphasized) text —
      // the clean→original mapping. (The end maps just past the stripped closing
      // `*`, so assert the start position rather than an exact slice.)
      expect(original.startsWith("Yellen v. Kassin", span.originalStart)).toBe(true)
    }
  })

  it("backward-compat: resolveCitations() with no clean context (clean == original) still infers prose names", () => {
    // Calls the public resolver directly without the clean context, exercising
    // the clean==original fallback (no cleaned text, no transformation map) —
    // the path external callers hit, and the ternary's no-map branch.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). In Yellen v. Kassin, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text)
    const resolved: ResolvedCitation[] = resolveCitations(cites, text)
    const short = resolved.find((c) => c.type === "shortFormCase") as unknown as
      | MaybeInferred
      | undefined
    expect(short?.inferredCaseName).toBe("Yellen v. Kassin")
    const span = short?.inferredCaseNameSpan
    expect(span).toBeDefined()
    if (span) {
      // No transformation map → clean == original; the span still locates the name.
      expect(text.startsWith("Yellen v. Kassin", span.originalStart)).toBe(true)
    }
  })
})
