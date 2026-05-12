/**
 * California bare statute code abbreviations (#296).
 *
 * In single-jurisdiction California practice, counsel and courts establish
 * the California jurisdiction at the top of a document and then drop to
 * bare-code abbreviations for the rest — `Pen. Code § 148`,
 * `Code Civ. Proc., § 1021.5`, `Veh. Code § 23550.5`. The fully-qualified
 * `Cal. Penal Code § 148` form is handled by the existing `named-code`
 * tokenizer pattern; this file supports the bare-code variant via a
 * closed alternation so non-citation prose like "Insurance Law applies"
 * cannot accidentally match.
 *
 * Each entry's canonical form is the string returned in the
 * `StatuteCitation.code` field. The `regexAlternative` is what the
 * tokenizer matches in source text — periods are optional/spaces flexible
 * to handle typographic variation.
 */

export interface CaBareCodeEntry {
  /** Canonical code name returned in `StatuteCitation.code` */
  canonical: string
  /** Regex fragment for tokenizer alternation (periods/whitespace flexible) */
  regexFragment: string
}

/**
 * Order matters: list longest-first so PEG-style ordered choice picks the
 * most specific match before any shorter prefix. Example: `Code Civ. Proc.`
 * must come before any rule that could match just `Code` or `Civ. Code`.
 */
export const caBareCodeEntries: CaBareCodeEntry[] = [
  // Multi-word "Code <Subject> Proc." forms come first — longest prefixes
  { canonical: "Code Civ. Proc.", regexFragment: "Code\\s+Civ\\.?\\s+Proc\\.?" },
  { canonical: "Code Crim. Proc.", regexFragment: "Code\\s+Crim\\.?\\s+Proc\\.?" },

  // Two-word "<Subject> & <Subject> Code" / "<Subject> Code" forms
  { canonical: "Bus. & Prof. Code", regexFragment: "Bus\\.?\\s*&\\s*Prof\\.?\\s+Code" },
  { canonical: "Welf. & Inst. Code", regexFragment: "Welf\\.?\\s*&\\s*Inst\\.?\\s+Code" },
  { canonical: "Health & Safety Code", regexFragment: "Health\\s*&\\s*Safety\\s+Code" },
  { canonical: "Fish & Game Code", regexFragment: "Fish\\s*&\\s*Game\\s+Code" },
  { canonical: "Food & Agric. Code", regexFragment: "Food\\s*&\\s*Agric\\.?\\s+Code" },
  { canonical: "Harb. & Nav. Code", regexFragment: "Harb\\.?\\s*&\\s*Nav\\.?\\s+Code" },
  { canonical: "Mil. & Vet. Code", regexFragment: "Mil\\.?\\s*&\\s*Vet\\.?\\s+Code" },
  { canonical: "Rev. & Tax. Code", regexFragment: "Rev\\.?\\s*&\\s*Tax\\.?\\s+Code" },
  { canonical: "Sts. & Hy. Code", regexFragment: "Sts\\.?\\s*&\\s*Hy\\.?\\s+Code" },

  // Two-word abbreviated "<Subject>. <Type>. Code"
  { canonical: "Pub. Util. Code", regexFragment: "Pub\\.?\\s+Util\\.?\\s+Code" },
  { canonical: "Pub. Cont. Code", regexFragment: "Pub\\.?\\s+Cont\\.?\\s+Code" },
  { canonical: "Pub. Resources Code", regexFragment: "Pub\\.?\\s+Resources\\s+Code" },
  { canonical: "Unemp. Ins. Code", regexFragment: "Unemp\\.?\\s+Ins\\.?\\s+Code" },

  // Single-subject "<Subject>. Code" forms — alphabetical
  { canonical: "Civ. Code", regexFragment: "Civ\\.?\\s+Code" },
  { canonical: "Corp. Code", regexFragment: "Corp\\.?\\s+Code" },
  { canonical: "Educ. Code", regexFragment: "Educ\\.?\\s+Code" },
  { canonical: "Elec. Code", regexFragment: "Elec\\.?\\s+Code" },
  { canonical: "Evid. Code", regexFragment: "Evid\\.?\\s+Code" },
  { canonical: "Fam. Code", regexFragment: "Fam\\.?\\s+Code" },
  { canonical: "Gov. Code", regexFragment: "Gov\\.?\\s+Code" },
  { canonical: "Ins. Code", regexFragment: "Ins\\.?\\s+Code" },
  { canonical: "Lab. Code", regexFragment: "Lab\\.?\\s+Code" },
  { canonical: "Pen. Code", regexFragment: "Pen\\.?\\s+Code" },
  { canonical: "Prob. Code", regexFragment: "Prob\\.?\\s+Code" },
  { canonical: "Veh. Code", regexFragment: "Veh\\.?\\s+Code" },
  { canonical: "Water Code", regexFragment: "Water\\s+Code" },
]

/**
 * Build the bare-code tokenizer regex from the alternation above.
 *
 * Capture groups:
 *   (1) bare code name (matched alternative)
 *   (2) section body (digits + optional alphanumeric / subsections / et seq.)
 *
 * Alternation is sorted by regex length descending so longer-prefix codes
 * (`Code Civ. Proc.`, `Welf. & Inst. Code`) match before shorter ones.
 */
export function buildCaBareCodeRegex(): RegExp {
  const fragments = [...caBareCodeEntries]
    .sort((a, b) => b.regexFragment.length - a.regexFragment.length)
    .map((e) => e.regexFragment)
  const alternation = fragments.join("|")
  return new RegExp(
    `\\b(${alternation})\\s*,?\\s*§§?\\s*(\\d+(?:[A-Za-z0-9:/-]|\\.(?=[A-Za-z0-9]))*(?:\\([^)]*\\))*(?:\\s*et\\s+seq\\.?)?)`,
    "g",
  )
}

/**
 * Find the canonical CA bare-code name from a raw token match.
 * Normalizes whitespace/period variation back to the canonical string
 * so the StatuteCitation `code` field is stable across input variations.
 */
export function findCaBareCode(rawText: string): string | undefined {
  const normalized = rawText.replace(/\s+/g, " ").trim()
  for (const entry of caBareCodeEntries) {
    const fragmentRe = new RegExp(`^${entry.regexFragment}$`, "i")
    if (fragmentRe.test(normalized)) return entry.canonical
  }
  return undefined
}
