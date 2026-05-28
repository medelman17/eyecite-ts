---
"eyecite-ts": patch
---

docs: update `subsequentHistoryEntries` JSDoc for post-#527 contract (#619)

Resolves #619. The JSDoc still said "Only populated on the parent
(original) citation" — that was true before PR #617's #527 rewrite,
which changed the field to populate on every chain link that received
a history clause from the scanner. The minor version bump (0.22.0)
flagged the contract change but the JSDoc was not updated.

Replaced with text documenting the new contract:
> Populated on every chain link that received a history clause from
> the scanner — not just the chain's root. For `Smith, aff'd, X,
> cert. denied, Y`, both Smith and X populate this field.

No code changes. Doc-only patch.
