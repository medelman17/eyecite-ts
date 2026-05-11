---
"eyecite-ts": patch
---

fix: structured justice-attribution parentheticals + en-banc false-positive fix (#235)

`parseParenthetical` previously recognized only `en banc` and `per curiam` as metadata-dispositions, so the very common justice-attribution form `(Brennan, J., dissenting)` landed as an unstructured "other" parenthetical. Three coordinated changes plus an en-banc false-positive fix:

1. **`FullCaseCitation`** gains two new fields:
   - `justices?: string[]` — surnames captured from `(Brennan, J., dissenting)` or `(Brennan and Marshall, JJ., dissenting)`.
   - `scope?: string` — qualifier value (`in_judgment`, `in_part`, `from_denial`).
2. **`parseParenthetical`** detects the justice-attribution pattern (`<Surname>(, <Surname>)*(?:,? and <Surname>)?,? (C\.J\.|J\.|JJ\.),? <role>`) and classifies the role into:
   - `disposition`: `"dissent"`, `"concurrence"`, `"mixed"` (concurring in part and dissenting in part), `"majority"` (joining).
   - `scope`: `"in_judgment"`, `"in_part"`, or `"from_denial"`.
3. **Non-justice disposition parens** newly recognized: `(plurality opinion)`, `(mem.)`, `(unpublished table decision)`.
4. **En-banc false-positive fix:** the `\ben banc\b` check is now anchored at the trimmed content end (`/\\ben banc\\b\\s*$/`) so a parenthetical like `(Cabranes, J., dissenting from denial of rehearing en banc)` no longer mistakenly sets `disposition = "en banc"`.

Example output for `(Roberts, C.J., concurring in part and dissenting in part)`:

```ts
{
  disposition: "mixed",
  justices: ["Roberts"],
  scope: "in_part",
}
```

Adds 9 regression tests covering: single-justice dissent/concurrence, scope qualifiers (in_judgment / in_part / from_denial), `(plurality opinion)` / `(mem.)`, and 2 regression controls confirming `(en banc)` and `(per curiam)` still extract.
