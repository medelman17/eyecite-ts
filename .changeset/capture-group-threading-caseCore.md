---
"eyecite-ts": patch
---

Internal: `parseCaseCitationCore` now reads the named capture groups threaded onto the token by the tokenizer (#844) instead of re-running a second volume-reporter-page regex. Behavior-preserving — identical volume/reporter/page/nominative/blank-page output and component spans, verified against the real-opinion corpus plus a dedicated characterization suite. First extractor migrated under the capture-group-threading design; the duplicate "twin" regex (a source of the #881 tokenizer/extractor drift) is gone for case citations.
