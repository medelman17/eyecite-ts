---
"eyecite-ts": patch
---

fix(extract): detect parallel citations across pincite-between gaps (Bluebook canonical)

`detectParallel` now accepts the **Bluebook-canonical pincite-between form** per Indigo Book R12.3, where the primary's pincite sits between the two parallel cites:

```
374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005)
```

Previously, `MAX_PROXIMITY = 5` chars after the comma rejected this form, so eyecite-ts only detected the less-common no-pincite variant (`186 N.J. 78, 891 A.2d 1202`). The fix delegates to the existing `parsePincite` helper as single source of truth for "what counts as a pincite," automatically covering all forms (page, range, star, paragraph, footnote, etc.).

**Behavior changes:**

- Parallel citations across pincite-between gaps are now grouped via `groupId` and `parallelCitations[]`. Consumers calling `groupByCase()` will see fewer logical case groups for inputs containing this form (parallel pairs now collapse from two groups into one — correct behavior).
- `detectStringCites` now skips parallel-secondary cites when building string-citation groups. This fixes a related defect where a parallel secondary could be mis-grouped via `stringCitationGroupId` with an unrelated primary across a `;` separator (e.g., the secondary of an affirmance's parallel cite ending up in the same group as a `see also` cite for a different case).

**No API changes.** Existing `groupId`, `parallelCitations[]`, `stringCitationGroupId`, and `groupByCase()` work as before; they just get populated correctly for more inputs.

See `docs/superpowers/specs/2026-05-19-parallel-cites-pincite-between-design.md` for the full design and `docs/research/2026-05-19-parallel-citation-detection.md` for the Bluebook + Python eyecite + industry reference validation.
