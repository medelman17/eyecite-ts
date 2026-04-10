---
"eyecite-ts": patch
---

Fix case name extraction still capturing sentence context in two scenarios: sentence-initial pronouns like "This" bypassing the trimming guard, and "In" prefix not being stripped from caseName after extractPartyNames removes it from plaintiff.
