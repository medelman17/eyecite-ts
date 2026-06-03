/**
 * #810 — Bracket-survival measurement harness.
 *
 * The hard-vs-soft scope-filter decision rests on one empirical unknown: when
 * PDF→markdown extraction drops/garbles a `(quoting …)` delimiter, does scope
 * resolution still get the right answer, or at least *know* it can't trust the
 * structure? A real OCR'd-PDF corpus is needed to measure raw bracket survival;
 * the in-repo fixtures are curated native text (≈9 such parentheticals, 0 OCR),
 * too few/clean to decide. So this harness measures the next-best thing on data
 * we control: the **robustness of the shipped substrate** (#798 trigger-anchoring
 * + #809 `balanceOk`) to *simulated* bracket damage.
 *
 * Run:  pnpm exec tsx scripts/measure-bracket-survival.ts [corpusGlob]
 *
 * Reports, over a set of canonical `Outer (quoting Inner). Id.` nestings:
 *   - RECOVERY: with the opening `(` dropped, does `Id.` still resolve to the
 *     OUTER authority (trigger-anchoring, #798) rather than the quoted-within one?
 *   - DETECTION: does #809's `balanceOk` flag the damaged clause as untrustworthy?
 * Together these decide whether a *hard* structural filter is safe (high recovery)
 * or scope must *degrade-to-soft on balance failure* (rely on `balanceOk`).
 */

import { readFileSync } from "node:fs"
import { extractCitations } from "../src/index"
import { computeBracketScopes } from "../src/utils/parentheticalScope"

interface Nesting {
  outer: string // outer authority lead-in (the citing cite)
  inner: string // inner authority introduced by the trigger
  trigger: string
}

// Canonical nestings across container types (the shapes #798/#801/#809 target).
const NESTINGS: Nesting[] = [
  { outer: "Foo v. Goo, 500 U.S. 100", inner: "Bar v. Baz, 200 U.S. 50", trigger: "quoting" },
  { outer: "Foo, 2020 IL 12345", inner: "Bar v. Baz, 100 N.E.3d 200", trigger: "quoting" },
  { outer: "Smith v. Jones, 100 F.2d 1", inner: "Doe v. Roe, 200 F.3d 2", trigger: "citing" },
  { outer: "Hogue v. State, 12 A.3d 34", inner: "Corsello v. Verizon, 56 N.E.2d 7", trigger: "quoting" },
  { outer: "ACME Corp. v. Widget Co., 9 F. Supp. 3d 10", inner: "Roe v. Wade, 410 U.S. 113", trigger: "citing" },
]

const idResolvedTo = (text: string): number | undefined => {
  const cites = extractCitations(text, { resolve: true }) as Array<{
    type: string
    resolution?: { resolvedTo?: number }
  }>
  return cites.find((c) => c.type === "id")?.resolution?.resolvedTo
}

function measure(damage: "none" | "drop-open"): { recovered: number; detected: number; total: number } {
  let recovered = 0
  let detected = 0
  for (const n of NESTINGS) {
    const aside = damage === "drop-open" ? `${n.trigger} ${n.inner})` : `(${n.trigger} ${n.inner})`
    const text = `${n.outer} ${aside}. Id.`
    // RECOVERY: Id. must resolve to the OUTER cite (index 0), not the inner (1).
    if (idResolvedTo(text) === 0) recovered++
    // DETECTION: balanceOk false somewhere ⇒ the broken structure is flagged.
    const scopes = computeBracketScopes(text, extractCitations(text) as never[])
    if (scopes.some((s) => !s.balanceOk)) detected++
  }
  return { recovered, detected, total: NESTINGS.length }
}

function corpusScan(): { paren: number } {
  // Native-text baseline from the repo fixtures, counted in JSON *string values*
  // (expected to be tiny — proves the data gap rather than a survival number).
  const re = /\(\s*(?:quoting|citing|quoted in|cited in)\b/gi
  let paren = 0
  const walk = (v: unknown): void => {
    if (typeof v === "string") paren += (v.match(re) ?? []).length
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === "object") Object.values(v).forEach(walk)
  }
  for (const f of [
    "tests/fixtures/thorny-corpus.json",
    "tests/fixtures/real-world-citations-2026-05-11.json",
    "tests/fixtures/expanded-corpus.json",
  ]) {
    try {
      walk(JSON.parse(readFileSync(f, "utf8")))
    } catch {
      /* fixtures optional */
    }
  }
  return { paren }
}

console.log("#810 bracket-survival measurement\n")
const { paren } = corpusScan()
console.log(`In-repo corpus: ${paren} (quoting|citing …) parentheticals (native text; 0 OCR/PDF).`)
console.log("→ insufficient for a raw OCR-survival rate; measuring substrate robustness instead.\n")

const baseline = measure("none")
const damaged = measure("drop-open")
const pct = (x: number, t: number) => `${x}/${t} (${Math.round((100 * x) / t)}%)`
console.log("Canonical Outer-(quoting Inner)-Id. nestings:", NESTINGS.length)
console.log(`  balanced     → Id.→outer recovered: ${pct(baseline.recovered, baseline.total)}`)
console.log(`  dropped '('  → Id.→outer recovered: ${pct(damaged.recovered, damaged.total)}  [#798 trigger-anchoring]`)
console.log(`  dropped '('  → balanceOk flagged:   ${pct(damaged.detected, damaged.total)}  [#809 balanceOk]`)
