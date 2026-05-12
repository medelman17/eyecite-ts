---
"eyecite-ts": patch
---

fix: named-code statute tokenizer no longer absorbs intervening prose into `matchedText` (#328)

When a sentence contained a stray earlier jurisdictional prefix
(`California`) followed by lowercase prose and then a real citation
(`California Penal Code § 549`), the named-code tokenizer matched the
**first** `California` and absorbed the entire intervening clause into
the `code` field and `matchedText`:

```
matchedText: "California for solicitation, acceptance or referral of
              fraudulent insurance claims, in violation of California
              Penal Code § 549"
```

This violated the `matchedText.length === span.originalEnd -
span.originalStart` invariant and broke annotation, highlighting, and
round-trip operations.

### Root cause

The code-name capture group in the `named-code` tokenizer pattern
(`src/patterns/statutePatterns.ts`) was `[A-Za-z.&',\s]+?` — accepting
both upper- and lowercase letters. Real code names are title-case
(`Penal Code`, `Civ. Prac. & Rem. Code Ann.`, `Insurance Law`) but the
permissive class let prose like `for solicitation, acceptance ...`
flow through. The lazy quantifier kept extending until it found
`\s*§§?\s*\d+`, which happened only at the SECOND `California`.

### Fix

Changed the code-name capture from `[A-Za-z.&',\s]+?` to:

```
[A-Z][A-Za-z.&']*(?:(?:\s+|,\s+)(?:&|[A-Z][A-Za-z.&']*))*
```

- Must start with a capital letter
- Each subsequent word is also capital-letter-led (or a standalone `&`)
- Separator between words is either whitespace or `,\s+` so Maryland's
  `Code Ann., Crim. Law` and `Code, Ins.` shapes still parse

The lowercase prose words `for`, `or`, `of`, `in`, `to` no longer
match — the regex skips the first `California` and lands on the
real citation context.

### Tests

4 new tests under `named-code does not absorb intervening prose (#328)`
in `tests/extract/extractStatute.test.ts`:

- Catastrophic case: `California ... in violation of California Penal Code
  § 549` → `matchedText: "California Penal Code § 549"` (no prose),
  plus span-invariant check
- Regression: `Md. Code Ann., Crim. Law § 3-202` (comma inside name)
- Regression: `Md. Code, Ins. § 27-101` (comma + abbrev)
- Regression: `Tex. Civ. Prac. & Rem. Code Ann. § 17.42` (ampersand +
  multi-word)

Full 2472-test suite passes; no regressions.
