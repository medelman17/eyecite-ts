---
"eyecite-ts": patch
---

fix: multi-word neutral court designations (IL App, OK CIV APP, OK CR) now extract (#230)

The existing `state-vendor-neutral` court group was `[A-Z]{2}(?:\s+App\.?)?` — only single-word state codes with an optional `App.` suffix. Two real-world formats fell through:

- **Illinois Rule 23 appellate form** — `2011 IL App (1st) 101234`, `2020 IL App (2d) 190123-U`. The district parenthetical `(1st)/(2d)/(3d)/(4th)/(5th)` was treated as the start of a court parenthetical, so the document number got misbound and the citation silently extracted as zero matches.
- **Oklahoma multi-word courts** — `2020 OK CIV APP 67` (Civil Court of Appeals), `2019 OK CR 1` (Court of Criminal Appeals), `2024 OK AG 5` (Attorney General opinions). These surfaced as weak `case` matches with no court/year/documentNumber populated.

Additionally, Illinois Rule 23 unpublished decisions carry a `-U` suffix on the document number (e.g., `190123-U`). Previously this was not handled at all.

### Three coordinated changes

1. **`state-vendor-neutral` regex** extended with two new alternatives ordered before the existing single-word fallback:
   ```regex
   \b(\d{4})\s+(
     IL\s+App\s+\(\d+(?:st|nd|rd|th|d)\)
     |OK\s+(?:CIV\s+APP|CR|AG)
     |[A-Z]{2}(?:\s+App\.?)?
   )\s+(\d+(?:-U)?)\b
   ```
2. **`extractNeutral.ts`** consumes the `-U` suffix into a new `unpublished` flag and strips it from `documentNumber`.
3. **`NeutralCitation` interface** gains an `unpublished?: boolean` field. Only set to `true` for citations with the `-U` suffix; absent or `false` otherwise.

Adds 15 corpus-shaped regression tests in `tests/extract/extractNeutralMultiWord.test.ts`: 6 IL App district variants (1st/2d/3d/4th/5th plus the `-U` unpublished case), 4 OK forms (CIV APP, CR, AG, plus bare OK as fallback), and 5 regression controls (bare IL, UT, WI, Ohio hyphenated from #233, U.S. App. LEXIS from #228).
