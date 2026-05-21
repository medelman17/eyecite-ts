---
"eyecite-ts": minor
---

feat(extract): recognize NY acronymized code citations (RPAPL, RPL, BCL, EPTL, SCPA, DRL, LLCL, VTL) — #640

Documented examples:
- `RPAPL 711 [5]` — Real Property Actions and Proceedings Law, bracket subdivision
- `RPAPL 741 [4]`, `RPAPL 1304`
- `N.Y. RPAPL 711 [5]` (with N.Y. prefix)
- `EPTL § 5-1.1` — Estates Powers and Trusts Law
- `BCL § 1104-a` — Business Corporation Law
- `SCPA 1410` — Surrogate's Court Procedure Act
- `DRL § 240` — Domestic Relations Law
- `LLCL § 702` — Limited Liability Company Law
- `VTL § 1192` — Vehicle and Traffic Law
- `RPL § 5-703` — Real Property Law (distinct from RPAPL)

Previously the entire family of NY acronymized codes was invisible to the
tokenizer — only `CPLR` had a dedicated pattern (`ny-cplr-bare`, #592).
This added a sibling pattern (`ny-acronym-bare`) using the same shape:
closed alternation over a curated acronym list with mandatory trailing
digits, so bare-acronym mentions in prose (`The RPAPL governs.`) still do
not match.

Subsection chaining accepts both bracket (`[5]`) and paren (`(5)`) groups
and any mix (`RPAPL 711 [5] (a)` → `subsection: "[5](a)"`). The
underlying `parseBody` already accepted both delimiters (#370); this PR
just adds the missing tokenizer coverage.

Each match emits `code: "N.Y. <ACRONYM>"` (canonical prefix) and
`jurisdiction: "NY"` regardless of input shape.
