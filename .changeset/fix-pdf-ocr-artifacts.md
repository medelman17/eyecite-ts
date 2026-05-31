---
"eyecite-ts": patch
---

Handle PDF/OCR artifacts: soft hyphens and page-break markers (#676)

- Soft hyphen (U+00AD) is now stripped during Unicode normalization, so a
  reporter split across a PDF line break (`100 F.­2d 123`) extracts cleanly.
- Page-break marker lines — a number fenced by dashes on its own line
  (`100\n— 14 —\nF.2d 123`) — are removed by a new `stripPageBreakMarkers`
  cleaner so the citation rejoins across the artifact. Conservative: the
  number must be dash-fenced AND line-bounded, so ordinary dashed prose is
  untouched.

Paragraph pincites (`¶ 12`) were already captured in `pinciteInfo.paragraph`
(#204); a URL-safety invariant (`https://…/100/U.S./123` extracts nothing) now
has explicit regression coverage.
