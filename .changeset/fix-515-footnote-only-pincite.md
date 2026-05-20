---
"eyecite-ts": patch
---

fix(extract): footnote-only pincite (`, n. 7`) no longer silently dropped (#515)

`PINCITE_REGEX` / `LOOKAHEAD_PINCITE_REGEX` previously made page digits
mandatory, so a footnote-only reference (`16 Mass. 299, n. 7.`) — used when
the cited material is on the citation's start page and the author only
references the footnote — dropped the pincite entirely. `parsePincite` now
recognizes a footnote-only branch (`nn?\.\s*\d+(?:[-–—~]\d+)?` plus `note`,
`fn`, `fns` variants), and `LOOKAHEAD_PINCITE_REGEX` adds a matching
alternation that captures the bare footnote suffix. The structured result
surfaces with `footnote=N` / `footnoteEnd=M` and `page=undefined`.

Now extracts:

- `16 Mass. 299, n. 7.` → `footnote: 7`
- `2 Hoffman's Ch. Pr. 95, n. 3` → `footnote: 3`
- `16 Mass. 299, note 7.` → `footnote: 7`
