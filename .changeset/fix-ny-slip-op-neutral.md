---
"eyecite-ts": patch
---

Recognize NY Slip Op citations as neutral, not case (#692)

`2024 NY Slip Op 51234` — and the `(U)`/`(UV)`/`[U]` unpublished and `N.Y. Slip Op.` period variants — now extract as `type: "neutral"` with `database: "NY Slip Op"` and a `documentNumber`, instead of being mis-typed as `case` (with `reporter`/`page`). The `(U)`/`[U]` marker sets `unpublished: true`, and a trailing `(court year)` parenthetical still populates `court`/`year`. Case-name attachment is preserved.

Also fixes neutral case-name extraction to keep the `In re` / `In the Matter of` prefix instead of stripping the leading `In` as a signal word.
