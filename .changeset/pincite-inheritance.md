---
"eyecite-ts": minor
---

fix(resolve): inherit pincite from immediate same-authority predecessor (Bluebook Rule 4.1)

`Id.`, `supra`, and short-form-case citations now inherit their pincite from the **immediately preceding same-authority citation** — including from intermediate `Id. at X` or `supra, at X` predecessors — rather than only from the terminal full citation. This matches Bluebook Rule 4.1 / Indigo Book R6.2.2 and fixes a real bug.

**Behavior changes:**

- `Smith → Id. at 115 → bare Id.` now produces `pincite = 115` on the bare `Id.` (previously `55`, chasing past the intermediate to Smith's pincite).
- `Smith → Other → Smith, supra, at 50 → bare Id.` now produces `pincite = 50` (previously `undefined`).
- `Smith, at 100 → Id. at 115 → Id. → Id.` — all three trailing citations now correctly inherit `115`.
- `Supra` and `ShortFormCaseCitation` gain pincite inheritance for the first time. Previously only `Id.` inherited.

**New optional fields on `IdCitation`, `SupraCitation`, `ShortFormCaseCitation`:**

- `pinciteInherited?: boolean` — true when `pincite` was inherited per Rule 4.1.
- `pinciteInheritedFrom?: number` — array index (in `extractCitations(...).citations`) of the immediate predecessor that supplied the pincite. Follow transitively for the chain's originator.

**Migration:** No code changes required for consumers reading `pincite`. The inherited value is semantically equivalent to one extracted directly (Rule 4.1 makes them identical). Consumers wanting to distinguish "explicit in text" from "inherited per rule" should branch on `pinciteInherited`.

**Non-goals (future work):** statute-chain inheritance (blocked by the type system today — short-form pincite is `number` only); `MAX_OPINION_PAGE_COUNT`-style range validation on inherited pincites; expanding case-name inheritance to `Supra` and `ShortFormCaseCitation`.

See `docs/superpowers/specs/2026-05-19-pincite-inheritance-design.md` for the full design and `docs/research/2026-05-19-pincite-inheritance.md` for the Bluebook + Indigo Book + Python eyecite reference validation.
