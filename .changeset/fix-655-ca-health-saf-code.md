---
"eyecite-ts": patch
---

fix(extract): accept abbreviated `Health & Saf. Code` form — #655 (partial)

CA appellate practice uses `Health & Saf. Code` (with `Saf.` abbreviated)
as the dominant style; the parser only accepted `Health & Safety Code`
(unabbreviated `Safety`). Added the abbreviated regex fragment alongside
the unabbreviated one; both canonicalize to `Health & Saf. Code`.

Documented examples:
- `Health & Saf. Code, § 1375.4` → `code: "Health & Saf. Code"`, `section: "1375.4"`
- `Health & Saf. Code, § 1375.4, subd. (b)(4)` → with subdivision
- `Cal. Health & Saf. Code § 1375.4` → with explicit `Cal.` prefix

The dominant bare-section follow-on pattern (`Pen. Code § 148. Then § 149.`)
already works via existing inheritance — multiple bare-section cites in
CA opinions correctly inherit the upstream `Pen. Code` (or other bare-code
canonical).

**Scope note**: #655 also identified bare `§ 1347.15, subd. (a)` cites
(CA-shape section numbers `digits.digits`) that no tokenizer currently
captures. Tracked as a separate follow-up — requires either extending the
`nm-bare-section` shape to admit CA-shape numbers, or adding a new
`ca-bare-section` pattern. Deferred from this PR to keep the surface area
small.

Also updates one pre-existing extractStatute test and the caBareCodes
self-match invariant test to handle the new "multiple input fragments →
one canonical" mapping.
