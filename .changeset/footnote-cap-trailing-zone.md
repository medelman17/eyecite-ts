---
"eyecite-ts": patch
---

Cap final plain-text footnote zone at next post-footnote boundary (#539).

`detectTextFootnotes` previously bounded the last footnote zone at `text.length`, so post-footnote body content (e.g., a "GOVERNMENT BRIEF" section that follows the numbered notes) was swallowed into the trailing footnote. Any citation appearing after the footnote section was misannotated `inFootnote: true`, and footnote-scoped resolution refused to link it to body antecedents.

The detector now scans past the final marker for the earliest of: another separator line (5+ dashes/underscores), or a blank line followed by an ALL-CAPS heading line. The zone stops at that boundary. End-of-text remains the fallback when no such boundary exists.
