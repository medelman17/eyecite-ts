---
"eyecite-ts": patch
---

fix(extract): reject literal `Id.` / `Ibid.` as caseName (#517)

The older parallel-reporter form `Id., NN <reporter> NN` (e.g.,
`physical injury. Id., 584 N.Y.S.2d 744`) isn't matched by ID_PATTERN
(which requires `Id. at <pincite>`), so the tokenizer falls through to
the case extractor and the backward case-name scan picks up the bare
`Id.` (or `Id`) as a single-party caption — yielding case citations
with `caseName="Id."`.

Refuse short-form citation markers (`Id`, `Id.`, `Ibid`, `Ibid.`,
`supra`) as captured captions in the single-party fallback. The case
citation still surfaces (so the resolver can attach it to the Id.
antecedent's parallel reporter); it just doesn't carry a phantom
`caseName`.
