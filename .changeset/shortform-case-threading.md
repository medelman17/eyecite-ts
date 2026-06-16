---
"eyecite-ts": patch
---

Internal: `extractShortFormCase` now reads the named capture groups (party/volume/reporter/pincite) threaded onto the token by the tokenizer (#844) instead of re-running a second short-form-case regex. Behavior-preserving — identical volume/reporter/pincite/partyName output, confidence scoring, and the pincite component span, verified against the real-opinion corpus plus a dedicated characterization suite. Second extractor migrated under the capture-group-threading design; the duplicate "twin" regex (a source of the #881 tokenizer/extractor drift) is gone for short-form case citations. The out-of-token lookaheads (additional pincites, trailing parenthetical, section pincite) are unchanged.
