---
"eyecite-ts": minor
---

feat(extract): emit each amendment in coordinated lists — #657

`the Fifth and Sixth Amendment`, `Fourth, Fifth, and Fourteenth
Amendments`, `his Fifth and Sixth Amendment rights` previously only
emitted a citation for the LAST amendment in the chain — the
`bare-amendment-word` pattern (#534) requires `<ordinal>\s+Amendment`
adjacently, and leading ordinals (Fifth, Fourth) have no trailing
`Amendment` word.

New `bare-amendment-coord` tokenizer pattern matches each leading
ordinal in a coordinated list using a lookahead that requires the
chain to terminate in `<ordinal>\s+Amendments?`. Each match emits a
separate amendment citation; the trailing `<ordinal> Amendment`
continues to be captured by `bare-amendment-word`.

Documented examples (each emits an amendment citation per number):
- `the Fifth and Sixth Amendment` → 5, 6
- `the Fifth and Sixth Amendments` → 5, 6
- `his Fifth and Sixth Amendment rights` → 5, 6
- `Fourth and Fourteenth Amendments` → 4, 14
- `the Fifth, Sixth, and Fourteenth Amendments` → 5, 6, 14
- `First, Fourth, Fifth, and Fourteenth Amendments` → 1, 4, 5, 14
- `5th and 6th Amendments` → 5, 6

Confidence matches `bare-amendment-word` (0.5) since both are
bare-prose matches without a `Const.` anchor. Single-amendment forms
(`the Fifth Amendment`, `U.S. Const. amend. V`) are unchanged.

11 new tests in `tests/extract/issue657MultiAmendmentList.test.ts`
cover two/three/four-amendment lists, ordinal-abbreviation forms,
regression guards for singular forms, and a false-positive guard for
prose that mentions ordinals without the `Amendment` word.

One pre-existing thorny-corpus fixture entry (death-penalty brief with
`the Eighth and Fourteenth Amendments`) was updated to expect the
additional Eighth Amendment citation that now emits.
