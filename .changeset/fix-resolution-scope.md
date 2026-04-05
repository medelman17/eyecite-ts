---
"eyecite-ts": minor
---

Change default resolution scope strategy from `"paragraph"` to `"none"` (#131). The paragraph scope (`\n\n+` boundaries) was too restrictive for real court opinions where HTML stripping produces frequent double-newlines, blocking 87% of Id. and short-form resolutions. Resolution accuracy improves from 13% to ~97%. Users can still opt into paragraph scope via `resolutionOptions: { scopeStrategy: "paragraph" }`.
