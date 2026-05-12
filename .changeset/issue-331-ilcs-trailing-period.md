---
"eyecite-ts": patch
---

fix: ILCS trailing sentence period no longer absorbed into section (#331)

Modern Illinois Compiled Statutes (ILCS) citations that end a sentence
were leaving the period attached to the `section` field:

```
"See 5 ILCS 100/1-1." → section: "1-1."   (was; should be "1-1")
"See 225 ILCS 60/22." → section: "22."    (was; should be "22")
```

This is the same anti-pattern fixed for other section bodies in #283,
applied to the `chapter-act` family.

### Fix

Both the tokenizer pattern (`chapter-act` in
`src/patterns/statutePatterns.ts`) and the extractor's anchored re-match
regex (`CHAPTER_ACT_RE` in `src/extract/statutes/extractChapterAct.ts`)
now use the period-followed-by-alphanumeric guard for the section body:

```
\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?
```

A period is consumed only when followed by an alphanumeric (preserving
internal decimal sections such as `1-1.5`); a trailing sentence period
is left for the surrounding prose.

### Field mapping clarification

The issue also reported that "chapter is lost." It is not — the chapter
has always been emitted on the `title` field on the extracted
`StatuteCitation` (e.g., `750 ILCS 36/305(b)` → `title: 750`,
`code: "36"`, `section: "305"`, `subsection: "(b)"`). The act number
sits in `code`. These field names predate the issue and are kept for
backward compatibility.

### Tests

6 new tests under `ILCS trailing-period absorption (#331)` in
`tests/extract/extractStatute.test.ts`:

- `5 ILCS 100/1-1.` — trailing period stripped from hyphenated section
- `225 ILCS 60/22.` — trailing period stripped from bare-numeric section
- `735 ILCS 5/2-1001.` — trailing period stripped from canonical-shape section
- `750 ILCS 36/305(b).` — subsection preserved, trailing period stripped
- `820 ILCS 405/1100 et seq.` — `hasEtSeq` set, trailing period not absorbed
- `5 ILCS 100/1-1.5` — internal decimal period preserved (regression guard)

Full 2485-test suite passes; no regressions.
