---
"eyecite-ts": minor
---

fix(resolve): Id. clusters with immediately preceding citation per Bluebook Rule 4.1, even when predecessor is an unresolved short-form

Three coordinated fixes resolve a class of bugs where `Id.` referred to the wrong authority when the immediately preceding short-form had no extractable full-citation antecedent (typically because the author introduced the case name in prose rather than as a structured citation).

**Behavior changes:**

- **`Id.` now clusters with the immediately preceding citation regardless of resolution state** (Bluebook Rule 4.1 / Indigo Book R6.2.2). Previously, `Id.` would chase past an unresolved short-form to the previous full citation — wrong authority. The bug surfaced in passages like `Leach v. Anderl, 218 N.J. Super. 18 (1987). In Yellen v. Kassin, ... Yellen, 416 N.J. Super. at 590-91, 3 A.3d at 590-91. ... Id. at 590.` where `Id. at 590` now correctly clusters with the Yellen short-form (whose case name was inferred from the prose mention) rather than resolving to Leach.
- **Short-form citations now carry `inferredCaseName`** when their case name was found in preceding prose (within ~400 chars) and their vol+reporter has no full-citation match in the array. The short-form remains formally unresolved (`resolvedTo` undefined), but consumers can render the case name via `caseName ?? inferredCaseName ?? partyName`.
- **Quote-zone detection is more robust** for mid-document text inputs. The previous greedy ASCII-quote pairing mistook orphan close-quotes (from snippets starting mid-sentence) for opens, creating phantom zones that broke `Id.` resolution. The new context-based classifier handles both typographic (`"` `"`) and ASCII (`"`) quotes correctly.

**New optional fields:**

- `ResolutionResult.antecedentIndex?: number` — chain pointer to the immediately preceding cited authority, regardless of resolution state. Same shape as the existing `ShortFormCaseCitation.pinciteInheritedFrom` from 0.19.0. Walk transitively for the chain's originator.
- `ShortFormCaseCitation.inferredCaseName?: string` — case name recovered from preceding prose when vol+reporter lookup fails.
- `ShortFormCaseCitation.inferredPlaintiff?: string`, `inferredDefendant?: string`, `inferredCaseNameSpan?: Span` — supporting fields for the inferred name.
- Same four `inferred*` fields on `SupraCitation`.

**Migration:**

- No breaking changes. All new fields are optional; `resolvedTo` semantics unchanged.
- Consumers wanting to follow the new chain pointer use `let cur = id.resolution.antecedentIndex; while (cur !== undefined) { /* inspect cites[cur]; advance cur = cites[cur].resolution?.antecedentIndex */ }`.
- Consumers rendering case names should fall back: `caseName ?? inferredCaseName ?? partyName`.
- The `Id.` resolution outcome for the unresolved-short-form-predecessor scenario changes from "resolves to previous full cite" (incorrect) to "antecedentIndex set, resolvedTo undefined" (Bluebook-correct). If any test was relying on the previous behavior, update it to use `antecedentIndex` for the chain walk.

See `docs/superpowers/specs/2026-05-19-id-resolves-past-unresolved-shortform-design.md` for the full design and `docs/research/2026-05-19-id-unresolved-antecedent.md` for the Bluebook + Python eyecite + CSL/citeproc reference validation.
