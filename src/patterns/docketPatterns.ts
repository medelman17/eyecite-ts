/**
 * Docket-Number Citation Patterns
 *
 * Patterns for case citations identified by docket / slip-opinion number
 * rather than a traditional reporter assignment. Common shapes:
 *
 *   - NY Court of Appeals slip ops: `Party v. Party, No. 51 (N.Y. 2023)`
 *   - Federal district court pre-reporter: `Smith v. Jones, No. 12-3456 (S.D.N.Y. 2024)`
 *
 * Disambiguation: a bare `No. 51 (N.Y. 2023)` is too generic to extract
 * without strong context. The pattern matches the `No. <docket> (<court> <year>)`
 * core; the extractor enforces a case-name anchor and only emits a citation
 * when a `Party v. Party,` (or `In re Party,`) prefix is found.
 */

import type { Pattern } from "./casePatterns"

export const docketPatterns: Pattern[] = [
  {
    id: "docket-paren-court-year",
    // Match: "[<prefix>] No. <docket-number> (<court...> <year>)"
    //   prefix (optional): `C.A.`, `Civ.`, `Civil [Action]`, `Case`,
    //     `Adv.`, `Docket` — common docket-type modifiers across
    //     Delaware Chancery (C.A.), federal civil/bankruptcy (Civ./
    //     Civil Action/Adv.), and state trial/appellate court systems
    //     (Docket / Case). See tests/fixtures/docket-citations.json
    //     for the corpus survey.
    //   docket-number: alphanumeric, optionally hyphenated. Real docket
    //     numbers include `2023-0522-KSJM`, `CV-01-0508597` (CT trial
    //     court), `A08A0646` (GA), `22-cv-1234` (federal civil), and
    //     numeric-only `286528` (MI appellate).
    //   parenthetical: anything (lazy) ending with a 4-digit year
    // The `\bNo\.` anchor + space-separated paren keep this narrow without a
    // case-name lookbehind — case-name validation lives in the extractor.
    regex:
      /\b(?:(?:C\.A\.|Civ\.|Civil(?:\s+Action)?|Case|Adv\.|Docket)\s+)?No\.\s+([A-Za-z\d]+(?:[-\s][A-Za-z\d]+)*)\s+\(([^)]+\s(\d{4}))\)/g,
    description:
      'Docket-number citation: "Party v. Party, [C.A./Civ./Civil/Case/Adv./Docket] No. <docket> (<court> <year>)"',
    type: "docket",
  },
]
