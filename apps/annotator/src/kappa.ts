// apps/annotator/src/kappa.ts
// Pure functions for computing Cohen's kappa (κ) — no DB dependency.
import type { Label } from "./contract.js"

/**
 * Canonical category string for a label decision — the unit of agreement.
 *   antecedent → "antecedent:<citationId>"
 *   ambiguous  → "ambiguous:<citationIds sorted and comma-joined>"
 *   abstain    → "abstain"
 *   flag       → "flag"
 */
export function canonicalCategory(decision: Label["decision"]): string {
  switch (decision.type) {
    case "antecedent":
      return `antecedent:${decision.citationId}`
    case "ambiguous":
      return `ambiguous:${[...decision.citationIds].sort().join(",")}`
    case "abstain":
      return "abstain"
    case "flag":
      return "flag"
  }
}

/**
 * Cohen's kappa over aligned (annotatorA, annotatorB) category pairs.
 *
 * po = observed agreement = (# pairs where a === b) / n
 * pe = expected agreement = sum over categories k of P(A=k) * P(B=k)
 * kappa = (po - pe) / (1 - pe)
 *
 * Edge cases:
 *   n === 0 → { kappa: null, po: 0, pe: 0, n: 0 }
 *   1 - pe === 0 (degenerate: both annotators used only one identical category)
 *     → if po === 1 then kappa = 1, else kappa = null
 */
export function cohenKappa(pairs: Array<[string, string]>): {
  kappa: number | null
  po: number
  pe: number
  n: number
} {
  const n = pairs.length
  if (n === 0) {
    return { kappa: null, po: 0, pe: 0, n: 0 }
  }

  // Count agreements and marginal frequencies.
  let agreements = 0
  const aFreq = new Map<string, number>()
  const bFreq = new Map<string, number>()

  for (const [a, b] of pairs) {
    if (a === b) agreements++
    aFreq.set(a, (aFreq.get(a) ?? 0) + 1)
    bFreq.set(b, (bFreq.get(b) ?? 0) + 1)
  }

  const po = agreements / n

  // Collect all categories across both annotators.
  const categories = new Set<string>([...aFreq.keys(), ...bFreq.keys()])

  // pe = sum_k P(A=k) * P(B=k)
  let pe = 0
  for (const k of categories) {
    pe += ((aFreq.get(k) ?? 0) / n) * ((bFreq.get(k) ?? 0) / n)
  }

  const denominator = 1 - pe
  if (denominator === 0) {
    // Degenerate case: both annotators used a single identical category.
    const kappa = po === 1 ? 1 : null
    return { kappa, po, pe, n }
  }

  const kappa = (po - pe) / denominator
  return { kappa, po, pe, n }
}
