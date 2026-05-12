---
"eyecite-ts": patch
---

fix: preserve `v` punctuation fidelity in `caseName` — NY-style `v` (no period) and `vs.` variant (#326)

`Rocovich v Consolidated Edison Co., 78 N.Y.2d 509` previously produced
`caseName: "Rocovich v. Consolidated Edison Co."` — the extractor was
silently adding a period to the NY-court `v` separator. The same
happened to `Romano v Hotel Carlyle Owners Corp.`. New York courts use
`v` without a period as the canonical form; rewriting it as `v.` breaks
round-trip fidelity and NY court records search compatibility.

### Fix

Two changes in `src/extract/extractCase.ts`:

1. **`extractCaseName` (`v.` capture site, line 1335)** — replaced the
   hardcoded `${plaintiff} v. ${defendantText}` with a captured
   separator from the regex match:

   ```
   const sepMatch = /\bvs?\.?(?=\s)/.exec(vMatch[0])
   const sep = sepMatch?.[0] ?? "v."
   ```

   The matched separator (`v`, `v.`, `vs`, or `vs.`) is whichever form
   appeared in the source.

2. **`extractCase`'s caseName rebuild site (line ~2688)** — when
   `extractPartyNames` modifies the plaintiff (signal-strip, transition-
   word-strip, etc.), the rebuilt caseName now preserves whichever `v`
   form was already in the existing caseName, detected via
   `/\s+(vs?\.?)\s+/.exec(caseName)`.

### Companion fix — internal `vRegex` consistency

The `extractPartyNames` internal regex for splitting plaintiff/defendant
on `v` (`/\s+v\.?\s+/i`) didn't accept the `vs?` variant. Before #326,
the case-name rebuild always normalized to `v.`, so the inconsistency
was masked. With `vs.` and `v` now preserved in `caseName`, the
internal regex needed updating to match the same alternation
(`/\s+vs?\.?\s+/i`). Applied to all five internal regex sites in the
file. Without this, `Smith vs. Jones, 500 F.2d 123` would extract
`caseName: "Smith vs. Jones"` correctly but leave `plaintiff` and
`defendant` undefined.

### Tests

5 new tests under `\`v\` punctuation fidelity in caseName (#326)` in
`tests/extract/extractCase.test.ts`:

- `Rocovich v Consolidated Edison Co.` → NY `v` preserved
- `Romano v Hotel Carlyle Owners Corp.` → NY `v` preserved
- `Smith v. Jones` → federal `v.` preserved
- `Smith vs. Jones` → `vs.` preserved; plaintiff/defendant captured
- `In re K.F.` → no `v` at all, unchanged

Full 2468-test suite passes; no regressions.
