---
"eyecite-ts": patch
---

fix(resolve): recognise `(quoting …)` / `(citing …)` asides even when the opening parenthesis is dropped (#798)

The `Id.` parenthetical-child guard (#214) relied solely on a running `(`/`)` depth counter, so OCR/PDF text with an unbalanced or dropped opening paren caused `Id.` to resolve to the quoted-within authority instead of the citing one. A new shared, trigger-anchored signal (`triggerAnchoredAsideOwner`, with a named `PARENTHETICAL_TRIGGER_WORDS` vocabulary) now recognises the aside from its trigger word, bounded to the same clause, so the relationship survives a missing paren. The signal feeds both `Id.` and `supra` (via `isParentheticalAside`) and is exported for reuse by the citation graph (#801).
