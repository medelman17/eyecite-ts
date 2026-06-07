---
"eyecite-ts": minor
---

feat(extract): structured `parentheticalNode` on short-form citations (#869)

Short-form citations (`Id.`, `supra`, short-form case) now expose a structured `parentheticalNode` alongside their flat `parenthetical` string — the same `Parenthetical` shape full-case citations carry, with a classified `type`, a `span`, and any nested child citations in `citations`. So `Id. at 5 (quoting Doe v. City, 100 F.2d 1)` links the nested `Doe v. City` onto `id.parentheticalNode.citations`, completing the parenthetical-nesting work started for full-case citations in #867.

Additive and non-breaking: the nested cite stays a top-level result by default (Bluebook Rule 10.9(a)), and `excludeParentheticalChildren` removes it the same way it does for full-case parentheticals. `Id.`/`supra` resolution is unchanged — they still bind only to the host authority, never a paren-child (Rule 4.1/4.2). The flat `parenthetical` string is retained unchanged.
