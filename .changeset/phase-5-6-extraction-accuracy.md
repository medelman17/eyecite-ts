---
"eyecite-ts": minor
---

Add full citation span, case name extraction, complex parenthetical parsing, and blank page support

- Extract case names via backward search for "v." pattern and procedural prefixes (In re, Ex parte, Matter of)
- Calculate `fullSpan` field covering case name through closing parenthetical, including chained parens and subsequent history
- Unified parenthetical parser supporting court+year, full dates (abbreviated/full month/numeric), and year-only formats
- Structured `date` field with ISO string and parsed `{ year, month?, day? }` object
- `disposition` field for "en banc" and "per curiam" from chained parentheticals
- Blank page placeholder recognition (`___`, `---`) with `hasBlankPage` flag and confidence 0.8
- All new fields optional — zero breaking changes for existing consumers
