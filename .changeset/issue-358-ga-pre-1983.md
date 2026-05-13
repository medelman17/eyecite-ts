---
"eyecite-ts": patch
---

feat: Georgia pre-1983 Code (`Code Ann. § 26-2101`, `Code § 27-2501`) (#358)

Georgia replaced its old "Code" / "Code of Georgia Annotated" with
OCGA in 1983. Modern Georgia opinions still cite the pre-1983 code
for statutory history. Bare `Code Ann.` (no state prefix) and bare
`Code` are unambiguously Georgia — other states use prefixed forms
(`Md. Code Ann.`, `Ind. Code Ann.`) which are handled by the
`named-code` / `abbreviated-code` patterns.

### Fix

New `ga-pre-1983` tokenizer pattern + dedicated `extractGaPre1983`
extractor. The TWO-part hyphenated section format (`\d+-\d+` with
negative lookahead `(?![\d-])` so 3-part OCGA-style sections like
`15-11-26` don't partial-match) serves as the disambiguator. Listed
AFTER `abbreviated-code` so prefixed forms (`Ark. Code Ann.`,
`Idaho Code`, etc.) win span dedup.

Emits `code: "Code"` or `"Code Ann."`, `jurisdiction: "GA"`, and
the two-part section.

### Scope notes

The following pieces of #358 are intentionally deferred:

- **Code parenthetical history** (`Code Ann. § 67-1316 (Ga. L.
  1958, p. 655; as amended)`) — the inner `(Ga. L. ...)`
  session-law parenthetical needs separate parsing.
- **`Ga. L. YYYY, p. NNN` session laws** — pending unified
  `sessionLaw` citation type.
- **CPA parenthetical cross-references** (`CPA § 17(a) (Code Ann.
  § 81A-117(a))`) — same family.

### Tests

6 new tests under `Georgia pre-1983 Code (#358)` in
`tests/extract/extractStatute.test.ts`:

- `Code Ann. § 26-2101` (bare with Ann.)
- `Code § 27-2501` (bare, no Ann.)
- `Code § 110-501` (longer title)
- Regression: Maryland `Md. Code Ann. § 10-105` (still MD)
- Regression: modern OCGA `OCGA § 15-11-26(b)` (3-part, no
  partial match)
- Regression: `Ga. Code Ann. § 16-5-1` (3-part, exactly one
  citation — named-code wins via span dedup)

Full 2694-test suite passes; no regressions.

### Related

The bare-pattern approach mirrors the NY bare named-code form
(#386) but with a more constrained section-format disambiguator.
The 2-part vs. 3-part hyphenated-section distinction (`26-2101`
vs. `15-11-26`) is the same disambiguator used by the NM
bare-section pattern (#382) but in the opposite direction —
Georgia uses 2-part while NM uses 3-part.
