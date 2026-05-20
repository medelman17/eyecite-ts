---
"eyecite-ts": patch
---

Insert a token-boundary space when stripping HTML tags between adjacent word characters (#542).

`stripHtmlTags` previously deleted tags with no replacement, so HTML like `100 F.3d 200<footnote label="3">200 F.3d 300</footnote>` collapsed to `100 F.3d 200200 F.3d 300`. The tokenizer then read the fused digit run as a single malformed citation (`100 F.3d 200200`), and the second reporter cite was lost entirely.

When a tag (or run of adjacent tags) sits between two word characters, the cleaner now inserts a single space in its place. Tags between non-word neighbors (spaces, punctuation, start/end of string) are still removed with no insertion, preserving existing behavior for the common case (`Smith v. <b>Doe</b>, 500 F.2d 123`).

The position-mapping algorithm handles inserted spaces correctly via its existing insertion branch — no additional adjustments needed.
