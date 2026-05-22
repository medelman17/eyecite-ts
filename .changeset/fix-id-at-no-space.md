---
"eyecite-ts": patch
---

fix(extract): `Id.at 5` (no space before `at`) captures pincite

Resolves #683. The Id./Ibid. pincite-capture regexes required at least
one whitespace character between the closing period/comma and the `at`
keyword. OCR / compressed text frequently omits this space, producing
`Id.at 5` which silently dropped the pincite:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1. Id.at 5.` | matchedText=`Id.`, pincite=undefined | matchedText=`Id.at 5`, pincite=5 ✓ |
| `Smith, 100 F.2d 1. Ibid.at 5.` | similar | pincite=5 ✓ |

Changed `\s+at` to `\s*at` in three regexes: `ID_PATTERN` and
`IBID_PATTERN` (tokenizer) and the inline `idRegex` in `extractId`
(extractor). Canonical `Id. at 5` and bare `Id.` continue to work.

5 regression tests in `tests/extract/issueIdAtNoSpace.test.ts`.
