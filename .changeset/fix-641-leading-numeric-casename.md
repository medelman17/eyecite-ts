---
"eyecite-ts": patch
---

fix(extract): preserve leading numeric prefix in case-name extraction — #641 (partial)

`V_CASE_NAME_REGEX` required the plaintiff capture to begin with `[A-Z]`,
so address-derived party names that lead with a digit prefix lost it:

- `2312-2316 Realty Corp. v. Font` → was `Realty Corp. v. Font` (numeric prefix dropped)
- `235 East 73rd Street, Inc. v. Smith` → was `East 73rd Street, Inc. v. Smith`
- `125 Broadway Associates v. NYC` → was `Broadway Associates v. NYC`

Common in NY real-property and tax cases where the legal name is the
street address. Extended the leading character class to admit an optional
`\d[\d-]*\s+` prefix before the required `[A-Z]` proper-noun head.

5 new tests in `tests/extract/issue641LeadingNumericCaseName.test.ts`
cover hyphenated address ranges, intermediate digits in addresses, and
regression guards for the existing citation-boundary detection and
ordinary alphabetic case names.

Scope note: #641 originally bundled three sub-issues. Only the
leading-numeric trim is addressed here. Two siblings remain open as
follow-ups:
- Parallel-cite caseName propagation without a closing `(YYYY)` paren
  (`Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.`)
- Puerto Rico DPR / JTS reporter coverage (the reporters themselves
  aren't in reporters-db so the case extractor doesn't tokenize them)
