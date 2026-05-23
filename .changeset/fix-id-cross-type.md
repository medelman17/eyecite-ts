---
"eyecite-ts": patch
---

fix(resolve): bare `Id.` attaches to immediately preceding cite of any type (#721)

Resolves #721. Per Bluebook Rule 4.1, bare `Id.` (no pincite)
attaches to the immediately preceding cited authority of any type.
The resolver's case-family-preference filter overrode positional
priority — `42 U.S.C. § 1983. Id.` resolved to an earlier case if
one was in scope.

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id.` | Smith (case) | statute ✓ |
| `42 U.S.C. § 1983. Id.` (statute only) | statute | unchanged ✓ |
| `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. at 5.` (page pincite, case family) | Smith | unchanged ✓ |
| `Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. § 7.` (section pincite, statute family) | statute | unchanged ✓ |
| `42 U.S.C. § 1983. Smith, 100 F.2d 1. Id.` (case is most recent) | Smith | unchanged ✓ |

`resolveId` now skips family preference when Id. has NO pincite AND
NO trailing `§ N` section marker — the bare form is unambiguously
positional. Id. WITH an explicit pincite still uses family
preference (the pincite shape disambiguates: `Id. § 5` → statute
family; `Id. at 27` → case family).

Two existing tests (issue480_idAntecedent.test.ts:217, integration/
resolution.test.ts:239) asserted the old behavior — both updated to
match the corrected positional rule.

5 regression tests in `tests/extract/issueIdCrossType.test.ts`.
