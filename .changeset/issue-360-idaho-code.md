---
"eyecite-ts": patch
---

feat: extract Idaho Code variants — `Idaho Code, § N`, postfix `Section N, Idaho Code`, and `I.C.` / `I. C.` abbreviations (#360)

Idaho courts cite the Idaho Code in five interchangeable forms within a
single opinion. Only the canonical `Idaho Code § N` and the universal
`Idaho Code section N` (#348) variants were extracted. A 50-opinion
Idaho sample produced 20+ Idaho Code misses — the dominant statutory
citation form.

### Fixes

- **Comma form** (`Idaho Code, § 19-4906(c)`) — added optional comma
  between code name and section connector in the `abbreviated-code`
  tokenizer regex (`buildAbbreviatedCodeRegex` in
  `src/data/stateStatutes.ts`) and the mirroring extractor regex
  (`ABBREVIATED_RE` in `src/extract/statutes/extractAbbreviated.ts`).
  Universal change; harmless to other states.
- **Postfix form** (`Section 23-908(4), Idaho Code`) — new
  `idaho-postfix` tokenizer pattern (sibling to `florida-postfix`),
  routed to dedicated `extractIdahoPostfix` extractor. Emits
  `code: "Idaho Code"`, `jurisdiction: "ID"`.
- **`I.C. § N`** / **`I. C. § N`** — Idaho regex fragment now admits
  `I\.?\s*C\.?` (canonical dotted + inter-letter spacing variants).
  The stripped-form fallback in `findAbbreviatedCode` resolves
  spacing variants to the canonical `I.C.` abbreviation.

### Indiana / Idaho disambiguation

Bare `I.C.` (with dots) is the Idaho abbreviation; Indiana opinions
use the dotless `IC` or the spelled-out `Ind. Code` forms instead.
The Indiana regex fragment in `src/data/stateStatutes.ts` was
tightened from `I\.?C\.?` (which matched both `IC` and `I.C.`) to
literal `IC`, freeing the dotted form for Idaho. Indiana coverage of
`IC`, `Ind. Code`, `Indiana Code`, and `Burns Ind. Code Ann.` is
unchanged.

### Scope notes

The following pieces of #360 are intentionally deferred:

- **Multi-section lists** (`I.C. §§ 61-624, 61-629`,
  `Idaho Code §§ 19-4904 and 19-852`) — deferred across all states
  pending a unified multi-section data-model decision.
- **Section ranges** (`I.C. §§ 16-1605-1607`) — ambiguous parse
  (range vs. weird single section); deferred with the multi-section
  work.

### Tests

8 new tests under `Idaho Code variants (#360)` in
`tests/extract/extractStatute.test.ts`:

- `Idaho Code section 15-5-209`
- `Idaho Code section 19-2715(5)` with subsection
- `Idaho Code, § 19-4906(c)` (comma form)
- `Section 23-908(4), Idaho Code` (postfix form)
- `I.C. § 61-623` (canonical dotted)
- `I. C. § 61-623` (spaced)
- Regression: `IC 35-42-1-1` still routes to Indiana
- Regression: `Ind. Code § 35-42-1-1` still routes to Indiana

Full 2583-test suite passes; no regressions.

### Related

Sibling to #356 (Florida postfix), #348 (universal word-section
connector), and #349 (Arkansas inter-letter spacing). Every state
with a dotted-abbreviation code (A.R.S., C.R.S., I.C., etc.) needs
both spacing tolerance and an audit against neighboring states that
might collide on the stripped form.
