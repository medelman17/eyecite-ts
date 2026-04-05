---
"eyecite-ts": minor
---

Add standalone supra citation extraction (#132). Previously, supra required a preceding party name, missing common footnote patterns like `supra note 12`, `supra at 15`, and `supra § 3`. New STANDALONE_SUPRA_PATTERN matches these with confidence 0.8. The `partyName` field on `SupraCitation` is now optional to support standalone references.
