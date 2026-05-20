---
"eyecite-ts": patch
---

fix(extract): bare `§ N` after a full statute is a short-form reference (#567)

Cross-reference forms like `42 U.S.C. § 1983; see also § 1985` previously
produced only one citation — the bare `§ 1985` was dropped because no
tokenizer pattern fires without a code identifier. Adds
`detectBareSectionShortForms` that walks each full statute citation and
scans up to 300 chars forward (capped at the next statute) for bare
`§ N` shapes. Each match emits an inherited StatuteCitation carrying the
antecedent's `title`, `code`, and `jurisdiction`.

Guards:
- Antecedent must have a code identifier; bare-section antecedents owned
  by the NM dispatcher (NMSA 1978) are skipped.
- Three-hyphen state-section shapes (`32A-2-7`) remain owned by the NM
  pipeline.
- The pass respects existing citation spans (no overlap re-emission).
