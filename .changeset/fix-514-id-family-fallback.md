---
"eyecite-ts": patch
---

fix(resolve): Id. family preference falls back to any in-scope authority (#514)

`getIdPreferredFamily` defaults to `"case"` for any `Id.` not followed by
`§` — including `Id.`, `Id. at N`, and `Id. ¶ N`. In documents whose only
prior authority is a statute (~8% of `Id.` citations per the audit), the
scorer's `+1000` family-match boost left the candidate set's first entry
as the winner only by accident (no preferred-family member to override
it). A future scorer refactor could easily regress this.

`resolveId` now selects the antecedent via an explicit two-step rule:
prefer the most recent candidate of the preferred family, otherwise the
most recent candidate of any family. The behavior matches the previous
implementation but the intent is now obvious in the code, and regression
tests pin the statute-only context for both `Id.`, `Id. at N`, and the
`Id. ¶ N` "complaint paragraph N" idiom the audit flagged.
