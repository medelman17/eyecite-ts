---
"eyecite-ts": minor
---

feat(extract): nest citations inside explanatory parentheticals as child citations (#851)

A citation nested inside an explanatory parenthetical — e.g. the `Doe v. City, 100 F.2d 1` in `Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1)` — is now linked onto its host parenthetical's new `Parenthetical.citations` array as a child citation, keyed by its own stable `CitationId` (the `in-parenthetical-of` edge). Per Bluebook Rule 1.5(b) such a cite is a subordinate component of the citing authority, not a separate authority.

This is **additive and non-breaking by default**: the nested cite is also kept as a top-level result, so a later case short form can still resolve to a case first cited in a parenthetical (Bluebook Rule 10.9(a)). A new `excludeParentheticalChildren` option opts into the strict subordinate model — `extractCitations(text, { excludeParentheticalChildren: true })` removes the nested cite from the top-level array, leaving it reachable only via its host's `parentheticals[].citations`, and hidden from the cross-citation groupers and the resolver. Children land on the smallest enclosing parenthetical, so genuinely nested asides like `(citing B (quoting C))` build a correct tree.

Either mode preserves the existing, doctrinally-correct resolver behavior: `Id.`/`supra` never bind to a parenthetical-nested citation (Bluebook Rule 4.1/4.2) — only the host authority.
