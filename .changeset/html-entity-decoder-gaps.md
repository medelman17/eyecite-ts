---
"eyecite-ts": patch
---

fix(clean): close three HTML-entity decoder gaps in `decodeHtmlEntities` (#562)

Three bugs:

- `&ndash;` and `&mdash;` were not in the named-entity table. Both are common in legal text (page-range pincites like `100&ndash;105` and stylistic dashes in court opinions like `as such&mdash;a court of equity`). Both are now decoded to the corresponding Unicode dashes; downstream `normalizeDashes` then rewrites them to ASCII hyphens (or the blank-page `---` placeholder for standalone em-dashes).
- The hex numeric-entity regex required a lowercase `x` (`&#x167;`), but `x` is case-insensitive in the HTML numeric form — `&#X167;` should decode identically. The regex now uses the `i` flag.
- `String.fromCharCode` silently truncates code points above `0xFFFF` (it expects a UTF-16 code unit, not a code point). `&#128512;` for U+1F600 GRINNING FACE produced an empty string. The decoder now uses `String.fromCodePoint` with a bounds check so out-of-range values (> 0x10FFFF) fall back to the original entity instead of throwing `RangeError`.
