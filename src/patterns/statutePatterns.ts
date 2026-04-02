/**
 * Statute Citation Regex Patterns
 *
 * Patterns for federal (USC, CFR), state, and prose-form statute citations.
 * Intentionally broad for tokenization — extraction layer validates and
 * routes to jurisdiction-specific extractors.
 *
 * Pattern families (spec Section 2):
 * - Federal: usc, cfr (enhanced with subsections, et seq., §§)
 * - Prose: "section X of title Y"
 * - Illinois: chapter-act (ILCS chapter/act/section format)
 */

import type { Pattern } from "./casePatterns"

export const statutePatterns: Pattern[] = [
  {
    id: "usc",
    regex:
      /\b(\d+)\s+(?:U\.S\.C\.?|USC)\s*§§?\s*(\d+[A-Za-z0-9-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      'U.S. Code citations with optional subsections and et seq. (e.g., "42 U.S.C. § 1983(a)(1) et seq.")',
    type: "statute",
  },
  {
    id: "cfr",
    regex:
      /\b(\d+)\s+C\.?F\.?R\.?\s*(?:(?:Part|pt\.)\s+|§§?\s*)(\d+(?:\.\d+)?[A-Za-z0-9-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      'Code of Federal Regulations with Part or §, subsections, et seq. (e.g., "12 C.F.R. Part 226", "40 C.F.R. § 122.26(b)(14)")',
    type: "statute",
  },
  {
    id: "prose",
    regex: /\b[Ss]ection\s+(\d+[A-Za-z0-9-]*(?:\([^)]*\))*)\s+of\s+title\s+(\d+)\b/g,
    description:
      'Prose-form federal citations (e.g., "section 1983 of title 42"). Note: MD-style "section X of the Y Article" deferred to PR 3.',
    type: "statute",
  },
  {
    id: "named-code",
    // Matches: [State abbrev]. [Code/Law Name] § [section]
    // Captures: (1) jurisdiction prefix, (2) code name text, (3) section+subsections+et seq
    regex:
      /\b(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|Va\.?|Ala(?:bama)?\.?)\s+((?:[A-Za-z.&',\s]+?))\s*§§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Named-code state citations (NY, CA, TX, MD, VA, AL) with jurisdiction prefix + code name + §",
    type: "statute",
  },
  {
    id: "mass-chapter",
    // Matches: Mass. Gen. Laws ch. X, § Y / M.G.L.A. c. X, § Y / G.L. c. X, § Y / A.L.M. c. X, § Y
    regex:
      /\b(Mass\.?\s*Gen\.?\s*Laws|M\.?G\.?L\.?A?\.?|A\.?L\.?M\.?|G\.?\s*L\.?)\s+(?:ch\.?|c\.?)\s*(\w+),?\s*§\s*([\w./-]+(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description: 'Massachusetts chapter-based citations (e.g., "Mass. Gen. Laws ch. 93A, § 2")',
    type: "statute",
  },
  {
    id: "chapter-act",
    // IL: "735 ILCS 5/2-1001" or "735 Ill. Comp. Stat. 5/2-1001"
    // Captures: (1) chapter, (2) act, (3) section+subsections+et seq
    regex:
      /\b(\d+)\s+(?:ILCS|Ill\.?\s*Comp\.?\s*Stat\.?)\s*(?:Ann\.?\s+)?(\d+)\/([^\s(]+(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description: 'Illinois Compiled Statutes chapter-act citations (e.g., "735 ILCS 5/2-1001")',
    type: "statute",
  },
  {
    id: "abbreviated-code",
    // Alternation order: longer/more-specific patterns first within each state to avoid partial matches.
    // The \b anchor prevents cross-boundary matches (e.g., "N.C.G.S." won't match "G.S." at position 4).
    regex:
      /\b(?:(\d+)\s+)?(Fla\.?\s*Stat(?:utes)?\.?(?:\s*Ann\.?)?|F\.?S\.?|R\.?C\.?|O\.?R\.?C\.?|Ohio\s+Rev\.?\s+Code(?:\s+Ann\.?)?|MCL[AS]?|M\.?C\.?L\.?|Mich\.?\s+Comp\.?\s+Laws(?:\s+(?:Ann|Serv)\.?)?|Utah\s+Code(?:\s+Ann\.?)?|U\.?C\.?A\.?|C\.?R\.?S\.?|Colo\.?\s+Rev\.?\s+Stat\.?(?:\s+Ann\.?)?|RCW|Wash\.?\s+Rev\.?\s+Code(?:\s+Ann\.?)?|G\.?S\.?|N\.?C\.?\s*Gen\.?\s*Stat\.?(?:\s+Ann\.?)?|N\.?C\.?G\.?S\.?|O\.?C\.?G\.?A\.?|Ga\.?\s+Code(?:\s+Ann\.?)?|Pa\.?\s*C\.?S\.?A?\.?|Pa\.?\s+Cons\.?\s+Stat\.?|P\.?S\.?|Ind(?:iana)?\.?\s+Code(?:\s+Ann\.?)?|Burns\s+Ind\.?\s+Code(?:\s+Ann\.?)?|I\.?C\.?|N\.?J\.?\s*S(?:tat)?\.?\s*A?\.?|Del\.?\s*(?:Code(?:\s+Ann\.?)?|C\.?))\s*§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Abbreviated state code citations for 12 jurisdictions (FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE)",
    type: "statute",
  },
]
