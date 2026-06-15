---
"eyecite-ts": minor
---

Thread regex capture groups from tokenize→extract, and raise the Node floor to >=22.

**BREAKING (runtime floor):** the minimum supported Node is now 22 (was 18); the CI matrix is 22/24/26. This unlocks ES2025 duplicate named capturing groups, which the extraction refactor relies on.

Internally, `Token` now carries optional `groups`/`groupSpans` (the named capture groups of the matching pattern) so extractors can read structured terminals instead of re-running a second regex. This PR is the additive substrate; it changes no extraction output.
