---
"eyecite-ts": patch
---

fix: procedural prefix expansion — Commonwealth ex rel., In the Interest of, Adoption of, etc. (#242)

`PROCEDURAL_PREFIX_REGEX` and the parallel `proceduralPrefixes` array in
`extractPartyNames` recognized only 9 procedural prefixes (`In re`,
`Ex parte`, `Matter of`, `Estate of`, etc.). Several common family/probate
and state-practice prefixes were missing, causing captions like `In re
Marriage of Smith` to lose the `Marriage of` segment, `On Petition of
P.Q.` to lose the leading `On`, and `Adoption of J.K.` / `Conservatorship
of L.M.` / `Guardianship of N.O.` to fall through to the broad single-party
fallback with no `proceduralPrefix` field set.

Adds 7 prefixes (longer forms ordered before shorter ones so alternation
prefers the longer match):

- `Commonwealth ex rel.` (PA practice)
- `In the Interest of` (juvenile / family — handles initials-only parties like A.B., J.K.)
- `In re Marriage of` (CA family — must beat `In re`)
- `Adoption of`
- `Conservatorship of` (CA probate)
- `Guardianship of`
- `On Petition of` (older form — must beat `Petition of`)

Adds 10 regression tests covering the 7 new prefixes plus 3 existing-prefix
controls (`In re`, `Petition of`, `Estate of`).
