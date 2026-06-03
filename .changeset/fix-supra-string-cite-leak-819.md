---
"eyecite-ts": patch
---

fix(resolve): `supra` no longer leaks into string-cite parenthetical members (#819)

`computeBracketScopes` treated the `;` separator in a `(citing A; B; C)` string
cite as a clause boundary even while the outer `(` was still open, resetting its
bounded bracket stack so 2nd-and-later members read depth 0 (and
`balanceOk=false`) and escaped the #799 parenthetical-aside filter — `resolveSupra`
could then accept a string-cite-internal authority as a named antecedent. A `;`
inside an open paren is now treated as a string-cite separator, not a clause
boundary, so every member reads the enclosing paren depth and is excluded like the
first. The `.`/newline reset that confines genuinely-dangling parens (#809) is
unchanged. This also de-pollutes the `balanceOk` structure-trust signal.
