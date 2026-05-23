---
"eyecite-ts": patch
---

fix(clean): strip ™ ® ℠ © before NFKC normalization (#693)

Resolves part 1 of #693. NFKC normalization decomposed `™` → "TM",
`®` → "(R)", `℠` → "SM" inline, which corrupted party names
(`Smith™ v. Jones®` produced caseName=`SmithTM v. Jones`) and broke
case-name backscan.

| input | before | after |
|---|---|---|
| `Smith™ v. Jones, 100 F.2d 1` | caseName=`SmithTM v. Jones` | `Smith v. Jones` ✓ |
| `Smith v. Jones®, 100 F.2d 1` | caseName=`Smith v. Jones(R)` | `Smith v. Jones` ✓ |
| `Acme℠ v. Beta, 100 F.2d 1` | caseName=`AcmeSM v. Beta` | `Acme v. Beta` ✓ |
| `Smith v. Jones, 100 F.2d 1` | unchanged | unchanged ✓ |

Fix: in `normalizeUnicode`, strip the four mark symbols (`™ ® ℠ ©`)
BEFORE applying NFKC. They are decorative and never affect canonical
citation text.

Em-dash separators, ellipses, and zero-width-space-as-separator
(other parts of #693) have different root causes and remain open.

6 regression tests in `tests/extract/issueTrademarkSymbols.test.ts`.
