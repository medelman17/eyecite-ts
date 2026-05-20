---
"eyecite-ts": patch
---

fix(extract): accept hyphenated-year parens like `(1965-1966)` on journal
citations (#553)

Case citations already handle the hyphenated-year paren correctly because
they route the parenthetical through `parseDate`, which falls through to
the year-only matcher and returns the first 4-digit year. The journal
extractor used a tighter custom regex (`/\((?:.*?\s)?(\d{4})\)/`) that
required the year to abut the closing paren, so `(1965-1966)` and the
shorthand `(1965-66)` returned `year=undefined`.

The fix extends the regex to absorb an optional trailing `[-–—]\d{2,4}`
range:

    /\((?:.*?\s)?(\d{4})(?:[-–—]\d{2,4})?\)/d

Only the leading 4-digit year is exported (matching the case-cite
semantics). Hyphen, en-dash, and em-dash separators are all accepted —
typographic dashes show up in journal volume runs.

Component spans still point at the captured group 1 (the first year), so
position information remains consistent with the case-cite path.
