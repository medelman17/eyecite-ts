---
"eyecite-ts": patch
---

fix(resolve): recognize prior-/subsequent-history subordinators in the trigger lexicon (#821)

The resolver-shared parenthetical-aside detector recognized only `quoting` /
`citing` / `quoted in` / `cited in`. Under a dropped or garbled opening paren
(OCR/PDF), a citation introduced by a history subordinator (`overruled by`,
`abrogated by`, `superseded by`, `cited with approval in`, `as recognized in`) was
not seen as an aside, so the #214/#799 exclusion never fired and recency
mis-resolved `Id.`/`supra` to the subordinated cite. These tokens are now in the
lexicon. It is a **soft** signal: it only changes resolution on dropped/garbled-paren
input (balanced asides are already caught by bracket depth), and the regex stays
ReDoS-safe (flat alternation, `\s+`-joined multi-word tokens).
