---
"eyecite-ts": patch
---

fix: scale position mapping lookahead to handle long HTML tags (#154)

The `rebuildPositionMaps` function used a fixed 20-character lookahead to match
characters between before/after text during cleaning. HTML tags with attributes
(e.g., `<span class="citation" data-id="1">` at 35+ chars) exceeded this
window, causing the algorithm to fall back to 1:1 replacement mapping. This
produced corrupted position maps where many clean-text positions collapsed to
the same original position, resulting in zero-length original spans on
extracted citations.

The fix scales the lookahead dynamically based on the length difference between
before and after text, with a floor of 40 characters.
