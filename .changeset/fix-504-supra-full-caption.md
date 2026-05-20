---
"eyecite-ts": patch
---

fix(resolve): supra resolution handles `Plaintiff v. Defendant` captions (#504)

`extractSupra` captures the full caption (`"Fitzgerald v. Cleveland"` for
`Fitzgerald v. Cleveland, supra`), but the BK-tree is indexed under the
*individual* normalized plaintiff/defendant names. Querying the combined
caption against per-name keys produced Levenshtein distances above the
threshold-derived `maxDistance`, so resolution silently failed for every
`"X v. Y, supra"` form — ~59% of supra citations in the CAP corpus.

`resolveSupra` now splits on ` v. ` / ` vs. ` and queries each half
independently in addition to the combined caption, picking the highest-
similarity in-scope match. Single-name supras (`Smith, supra`) and
non-caption forms (`Walker & Horwich, supra`) are unaffected.
