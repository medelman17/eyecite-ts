/**
 * Federal Rules of Procedure Citation Patterns (#576)
 *
 * Matches the four primary federal rule sets — Civil, Criminal, Evidence,
 * Appellate — plus Bankruptcy. Both the abbreviated Bluebook form
 * (`Fed. R. Civ. P. 56`) and the spelled-out form
 * (`Federal Rule of Civil Procedure 56`) are tokenized to the same
 * `federalRule` token type; the extractor disambiguates the rule set
 * from the matched text.
 *
 * Pattern ordering rationale: federal rule patterns must be inserted with
 * higher priority than `casePatterns` because the broad state-reporter
 * regex matches `Fed.R.Civ.P. 56` (and the year-prefixed false-positive
 * shape `1983 Fed.R.Civ.P. 17(b)` — #582) as a phantom case citation.
 * Putting these patterns earlier in `allPatterns` ensures the federal-rule
 * token wins the overlap-dedup pass.
 */

import type { Pattern } from "./casePatterns"

export const federalRulePatterns: Pattern[] = [
  {
    // Abbreviated form: `Fed. R. Civ. P. 56`, `Fed. R. Crim. P. 12(b)(6)`,
    // `Fed. R. Evid. 401`, `Fed. R. App. P. 4(a)`, `Fed. R. Bankr. P. 7001`.
    //
    // Whitespace between tokens is OPTIONAL — both the canonical
    // `Fed. R. Civ. P. 56` and the compact `Fed.R.Civ.P. 56` (common in
    // OCR'd opinions and footnote shorthand) tokenize.
    //
    // Evidence rules have NO trailing `P.` after `Evid.`; the alternation
    // accommodates that asymmetry.
    //
    // Subsection chain `(a)(1)(B)(i)` is captured greedily after the rule
    // number; the extractor splits it from the bare rule.
    // The `R.` token also accepts the older long-form `Rule`/`Rules`, and
    // each `P.`-suffixed set also accepts the long-form `Proc.`, so
    // `Fed. Rule Bankr. P. 3001` and `Fed. Rule Crim. Proc. 46(b)` tokenize
    // alongside the canonical abbreviations (#295).
    id: "fed-rule-abbreviated",
    regex:
      /\bFed\.\s?(?:R\.|Rules?)\s?(Civ\.\s?(?:P\.|Proc\.)|Crim\.\s?(?:P\.|Proc\.)|Evid\.|App\.\s?(?:P\.|Proc\.)|Bankr\.\s?(?:P\.|Proc\.))\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description:
      'Abbreviated federal rules: "Fed. R. Civ. P. 56", "Fed. Rule Crim. Proc. 46(b)", "Fed.R.Bankr.P. 7001" — #576, #295',
    type: "federalRule",
  },
  {
    // Spelled-out form. Bluebook-aware: accepts both singular `Rule` and
    // plural `Rules`, optional `the` before the rule-set name, and the
    // five rule-set names. The trailing rule number is required.
    //
    // The body anchor `Federal Rule(s)? of` is specific enough that it
    // never collides with prose; no negative lookbehind needed.
    id: "fed-rule-spelled",
    regex:
      /\bFederal\s+Rules?\s+of\s+(?:the\s+)?(Civil\s+Procedure|Criminal\s+Procedure|Evidence|Appellate\s+Procedure|Bankruptcy\s+Procedure)\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/gi,
    description:
      'Spelled-out federal rules: "Federal Rule of Civil Procedure 56", "Federal Rules of Evidence 401" — #576',
    type: "federalRule",
  },
  {
    // Acronym form: `FRCP 12(b)(6)`, `FRE 401`, `FRAP 4(a)`, `FRCrP 11`,
    // `FRBP 7001`, plus dotted variants `F.R.C.P.`, `F.R.E.`, etc.
    // Common in casual writing, court orders, and briefs. #696.
    id: "fed-rule-acronym",
    regex:
      /\b(FRCP|FRE|FRAP|FRCrP|FRBP|F\.\s?R\.\s?C\.\s?P\.|F\.\s?R\.\s?E\.|F\.\s?R\.\s?A\.\s?P\.|F\.\s?R\.\s?Cr\.\s?P\.|F\.\s?R\.\s?B\.\s?P\.)\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description:
      'Acronym federal rules: "FRCP 12(b)(6)", "FRE 401", "F.R.C.P. 12" — #696',
    type: "federalRule",
  },
]
