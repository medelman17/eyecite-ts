---
"eyecite-ts": minor
---

Add a built-in `stripMarkdownEmphasis` cleaner and an `additionalCleaners` option (#835). Markdown legal text — e.g. LLM-drafted briefs with emphasized case names like `*Leon v. Martinez*` — now has a ready-made, opt-in cleaner that strips `*`/`**`/`***` emphasis while preserving star-pagination pincites (`at *3`) and underscores (blank locators like `[____]`). The new `additionalCleaners` option appends cleaners to the default chain, so adding one no longer silently disables the defaults — unlike `cleaners`, which replaces them.
