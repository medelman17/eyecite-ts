---
"eyecite-ts": minor
---

Link parallel citations into groups and add full-span annotation mode

- Detect comma-separated case citations sharing a parenthetical as parallel citations
- `groupId` field identifies citation groups, `parallelCitations` array on primary citation references secondaries
- All citations still returned individually for backward compatibility
- `useFullSpan` annotation option to annotate from case name through closing parenthetical
- Golden test corpus with 28 real-world samples for regression testing
- All new fields optional — zero breaking changes for existing consumers
