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

import { buildCaBareCodeRegex } from "@/data/caBareCodes"
import { buildAbbreviatedCodeRegex } from "@/data/stateStatutes"
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
    //
    // Code-name body (#328): each word must be capitalized — real code names
    // are title-case sequences like `Penal Code`, `Civ. Prac. & Rem. Code Ann.`,
    // `Insurance Law`. The previous broad `[A-Za-z.&',\s]+?` accepted lowercase
    // prose, so when the input had a stray earlier `California` followed by
    // sentence prose then `California Penal Code § 549`, the regex absorbed
    // the entire intervening clause into the code-name span.
    //
    // Section body: period only allowed when followed by alphanumeric, so a
    // trailing sentence period is not absorbed (#283).
    regex:
      /\b(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|(?<!W\.?\s?)Va\.?|Ala(?:bama)?\.?)\s+([A-Z][A-Za-z.&']*(?:(?:\s+|,\s+)(?:&|[A-Z][A-Za-z.&']*))*)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Named-code state citations (NY, CA, TX, MD, VA, AL) with jurisdiction prefix + code name + §",
    type: "statute",
  },
  {
    id: "mass-chapter",
    // Matches: Mass. Gen. Laws ch. X, § Y / M.G.L.A. c. X, § Y / G.L. c. X, § Y / A.L.M. c. X, § Y
    // Section body: period only allowed when followed by alphanumeric, so a
    // trailing sentence period is not absorbed (#283).
    regex:
      /\b(Mass\.?\s*Gen\.?\s*Laws|M\.?G\.?L\.?A?\.?|A\.?L\.?M\.?|G\.?\s*L\.?)\s+(?:ch\.?|c\.?)\s*(\w+),?\s*§\s*(\w+(?:[\w/-]|\.(?=\w))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
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
    regex: buildAbbreviatedCodeRegex(),
    description: "Abbreviated state code citations for all US jurisdictions",
    type: "statute",
  },
  {
    id: "ca-bare-code",
    regex: buildCaBareCodeRegex(),
    description:
      'California bare-code citations (#296) — `Pen. Code § 148`, `Code Civ. Proc., § 1021.5`, `Bus. & Prof. Code § 17200` (no "Cal." prefix; common in single-jurisdiction California practice).',
    type: "statute",
  },
]
