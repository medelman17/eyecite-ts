/**
 * State statute abbreviation table — single source of truth for the
 * abbreviated-code tokenizer pattern and the knownCodes lookup registry.
 */

export interface StateStatuteEntry {
  /** Two-letter jurisdiction code (e.g., "AK", "AZ") */
  jurisdiction: string
  /** All recognized abbreviation forms — used for lookup by findAbbreviatedCode */
  abbreviations: string[]
  /**
   * Regex fragment for tokenizer alternation. If omitted, auto-generated
   * from abbreviations via escapeForRegex. Provide explicitly when the
   * pattern needs optional components (e.g., "Stat(?:utes)?").
   */
  regexFragment?: string
}

/**
 * Convert a plain abbreviation string into a regex fragment.
 *
 * Rules:
 * - Periods followed by a letter (e.g., "T.C.") → optional period + optional space
 * - Periods followed by a space (e.g., "Stat. Ann.") → optional period + flexible space
 * - Trailing periods → optional period
 * - Spaces → flexible whitespace (\s+)
 * - Regex-special characters are escaped
 */
export function escapeForRegex(abbreviation: string): string {
  return (
    abbreviation
      // Escape regex-special chars (except period and space, handled below)
      .replace(/[\\^$*+?{}[\]|()]/g, "\\$&")
      // Period followed by letter: "T.C" → "T\.?\s*C"
      .replace(/\.(?=[A-Za-z])/g, "\\.?\\s*")
      // Period followed by space: "Stat. Ann" → "Stat\.?\s+Ann"
      .replace(/\.\s+/g, "\\.?\\s+")
      // Trailing period: "Ann." → "Ann\.?"
      .replace(/\.$/g, "\\.?")
      // Remaining spaces → flexible whitespace
      .replace(/ +/g, "\\s+")
  )
}

/**
 * Build the abbreviated-code tokenizer regex from stateStatuteEntries.
 *
 * Produces the same capture group structure as the original hardcoded regex:
 *   (1) optional leading title number
 *   (2) abbreviation text
 *   (3) section + subsections + et seq.
 *
 * Fragments are sorted longest-first for PEG-style ordered choice.
 */
export function buildAbbreviatedCodeRegex(): RegExp {
  const allFragments: string[] = []

  for (const entry of stateStatuteEntries) {
    if (entry.regexFragment) {
      allFragments.push(entry.regexFragment)
    } else {
      for (const abbrev of entry.abbreviations) {
        allFragments.push(escapeForRegex(abbrev))
      }
    }
  }

  // Sort longest-first so more specific patterns match before shorter ones
  allFragments.sort((a, b) => b.length - a.length)

  const alternation = allFragments.join("|")

  return new RegExp(
    // Section body: digits prefix, then alphanumeric/colon/slash/hyphen OR
    // period-followed-by-alphanumeric (lookahead) OR comma-followed-by-digit
    // (Kansas comma-section format `NN-N,NNN` like `K.S.A. 23-9,101`, #367).
    // Period and comma guards prevent sentence punctuation from being
    // absorbed into the section.
    //
    // Section connector: `§`, `§§`, or the spelled-out word `section(s)` /
    // `Section(s)` (#348). Arizona and several other state corpora cite as
    // `A.R.S. section 14-2804(A)` interchangeably with `A.R.S. § 14-2804(A)`.
    // Optional comma between code name and connector (`Idaho Code, § N`) is
    // common in Idaho practice (#360) and harmless elsewhere.
    // Trailing subscript groups accept either parens or brackets — MSA uses
    // `[N]` for subdivisions (`MSA 23.710[252]`) #370.
    `\\b(?:(\\d+)\\s+)?(${alternation})\\s*,?\\s*(?:§§?|[Ss]ections?)?\\s*(\\d+(?:[A-Za-z0-9:/-]|\\.(?=[A-Za-z0-9])|,(?=\\d))*(?:\\([^)]*\\)|\\[[^\\]]*\\])*(?:\\s*et\\s+seq\\.?)?)`,
    "g",
  )
}

/**
 * Abbreviations are ordered longest-first within each entry. The last element
 * is used as the canonical short abbreviation in knownCodes.ts.
 */
export const stateStatuteEntries: StateStatuteEntry[] = [
  // ── Florida ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "FL",
    abbreviations: ["Fla. Stat. Ann.", "Fla. Stat.", "Fla Stat", "F.S.", "FS"],
    regexFragment: "Fla\\.?\\s*Stat(?:utes)?\\.?(?:\\s*Ann\\.?)?|F\\.?S\\.?",
  },
  // ── Ohio ───────────────────────────────────────────────────────────────────
  // Inter-letter spacing tolerance — `R. C. 713.15` (with space) is the
  // dominant Ohio court-published style, more common than the no-space
  // `R.C. 713.15`. The federal Internal Revenue Code (`I.R.C.`) has its
  // own dedicated pattern (#376) so the `I.` prefix won't trigger Ohio.
  // Canonical abbreviation is `R.C.` (Bluebook); ordered last so the
  // stripped-form fallback normalizes spaced/dotless variants to it. #388
  {
    jurisdiction: "OH",
    abbreviations: ["Ohio Rev. Code Ann.", "Ohio Rev. Code", "O.R.C.", "ORC", "RC", "R.C."],
    regexFragment:
      "Ohio\\s+Rev\\.?\\s+Code(?:\\s+Ann\\.?)?|O\\.?\\s*R\\.?\\s*C\\.?|R\\.?\\s*C\\.?",
  },
  // ── Michigan ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "MI",
    abbreviations: [
      "Mich. Comp. Laws Ann.",
      "Mich. Comp. Laws Serv.",
      "Mich. Comp. Laws",
      "M.C.L.",
      "MCLA",
      "MCLS",
      "MCL",
    ],
    regexFragment: "Mich\\.?\\s+Comp\\.?\\s+Laws(?:\\s+(?:Ann|Serv)\\.?)?|M\\.?C\\.?L\\.?|MCL[AS]?",
  },
  // Michigan Statutes Annotated (MSA) — historical Callaghan-published
  // companion to MCL. Bare `MSA` (no dots) is Michigan; the dotted `M.S.A.`
  // is reserved for Minnesota Statutes Annotated (Bluebook standard).
  // Separate entry from MCL so the canonical `code` field stays `MSA` rather
  // than being normalized to `MCL`. #370
  {
    jurisdiction: "MI",
    abbreviations: ["Mich. Stat. Ann.", "MSA"],
    regexFragment: "Mich\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|MSA",
  },
  // ── Utah ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "UT",
    abbreviations: ["Utah Code Ann.", "Utah Code", "U.C.A.", "UCA"],
    regexFragment: "Utah\\s+Code(?:\\s+Ann\\.?)?|U\\.?C\\.?A\\.?",
  },
  // ── Colorado ───────────────────────────────────────────────────────────────
  // Colorado has two compilations: pre-1973 (`C.R.S. 1963`) and modern
  // (`C.R.S.` / `C.R.S. 1973`). The year suffix is part of the code name,
  // not an edition parenthetical — without absorbing it into the
  // abbreviation capture the section body would swallow the year (`C.R.S.
  // 1963 § 148-21-34` → section="1963"; #352). The optional `\s+19\d{2}`
  // tail attaches `1963` / `1973` / etc. to the code, and the canonical
  // year-suffixed forms are added to the abbreviations array so
  // `findAbbreviatedCode` resolves them via exact match.
  {
    jurisdiction: "CO",
    abbreviations: [
      "Colorado Revised Statutes Annotated",
      "Colo. Rev. Stat. Ann.",
      "Colorado Revised Statutes 1963",
      "Colorado Revised Statutes 1973",
      "Colorado Revised Statutes",
      "Colo. Rev. Stat.",
      "C.R.S. 1963",
      "C.R.S. 1973",
      "C.R.S.",
      "CRS",
    ],
    regexFragment:
      "Colo(?:rado)?\\.?\\s+Rev(?:ised)?\\.?\\s+Stat(?:utes)?\\.?(?:\\s+Ann(?:otated)?\\.?)?(?:\\s+19\\d{2})?|C\\.?R\\.?S\\.?(?:\\s+19\\d{2})?",
  },
  // ── Washington ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "WA",
    abbreviations: ["Wash. Rev. Code Ann.", "Wash. Rev. Code", "RCW"],
    regexFragment: "Wash\\.?\\s+Rev\\.?\\s+Code(?:\\s+Ann\\.?)?|RCW",
  },
  // ── North Carolina ─────────────────────────────────────────────────────────
  {
    jurisdiction: "NC",
    abbreviations: ["N.C. Gen. Stat. Ann.", "N.C. Gen. Stat.", "N.C.G.S.", "NCGS", "G.S.", "GS"],
    regexFragment:
      "N\\.?C\\.?\\s*Gen\\.?\\s*Stat\\.?(?:\\s+Ann\\.?)?|N\\.?C\\.?G\\.?S\\.?|G\\.?S\\.?",
  },
  // ── Georgia ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "GA",
    abbreviations: ["Ga. Code Ann.", "Ga. Code", "O.C.G.A.", "OCGA"],
    regexFragment: "Ga\\.?\\s+Code(?:\\s+Ann\\.?)?|O\\.?C\\.?G\\.?A\\.?",
  },
  // ── Pennsylvania (consolidated) ────────────────────────────────────────────
  {
    jurisdiction: "PA",
    abbreviations: ["Pa. Cons. Stat.", "Pa.C.S.A.", "Pa.C.S.", "Pa. C.S.A.", "Pa. C.S."],
    regexFragment: "Pa\\.?\\s*C\\.?S\\.?A?\\.?|Pa\\.?\\s+Cons\\.?\\s+Stat\\.?",
  },
  // ── Pennsylvania (unconsolidated) ──────────────────────────────────────────
  {
    jurisdiction: "PA",
    abbreviations: ["P.S.", "PS"],
    regexFragment: "P\\.?S\\.?",
  },
  // ── Indiana ────────────────────────────────────────────────────────────────
  // The bare dotted `I.C.` form is reserved for Idaho (#360) — Indiana
  // opinions use either the spelled-out `Ind. Code` / `Indiana Code` or the
  // dotless `IC` shorthand. Restricting Indiana to the dotless `IC` lets
  // Idaho own `I.C.` / `I. C.` without losing Indiana coverage.
  // `IND. CODE` (uppercase) is also accepted — Indiana case captions and
  // some treatises use the all-caps form (#363).
  {
    jurisdiction: "IN",
    abbreviations: [
      "Burns Ind. Code Ann.",
      "Burns Ind. Code",
      "Indiana Code Ann.",
      "Indiana Code",
      "Ind. Code Ann.",
      "Ind. Code",
      "IC",
    ],
    regexFragment:
      "Burns\\s+Ind\\.?\\s+Code(?:\\s+Ann\\.?)?|Ind(?:iana)?\\.?\\s+Code(?:\\s+Ann\\.?)?|IND\\.?\\s+CODE|IC",
  },
  // Pre-1976 Burns Indiana Statutes Annotated — modern Indiana opinions
  // still cite this when referencing pre-1976 statutory text (#363).
  // Examples: `Burns Ind. Stat. Ann., § 10-3401 (1956 Repl.)`,
  // `Ind. Stat. Ann. § 28-1710 (Burns 1971)`, `Burns' Indiana Statutes
  // Annotated § 48-702`, `Ind. Ann. Stat. § 10-4709`.
  {
    jurisdiction: "IN",
    abbreviations: [
      "Burns Indiana Statutes Annotated",
      "Burns Ind. Stat. Ann.",
      "Ind. Stat. Ann.",
      "Ind. Ann. Stat.",
    ],
    regexFragment:
      "Burns(?:'s|')?\\s+Ind(?:iana)?\\.?\\s+Stat(?:utes)?\\.?(?:\\s+Ann(?:otated)?\\.?)?|Ind(?:iana)?\\.?\\s+Stat\\.?\\s+Ann\\.?|Ind(?:iana)?\\.?\\s+Ann\\.?\\s+Stat\\.?",
  },
  // ── New Jersey ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "NJ",
    abbreviations: ["N.J.S.A.", "NJSA", "N.J.S.", "NJS"],
    regexFragment: "N\\.?J\\.?\\s*S(?:tat)?\\.?\\s*A?\\.?",
  },
  // ── Delaware ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "DE",
    abbreviations: ["Del. Code Ann.", "Del. Code", "Del. C.", "Del C"],
    regexFragment: "Del\\.?\\s*(?:Code(?:\\s+Ann\\.?)?|C\\.?)",
  },
  // ── Alaska ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "AK",
    abbreviations: ["Alaska Stat. Ann.", "Alaska Stat.", "AS"],
    regexFragment: "Alaska\\s+Stat\\.?(?:\\s+Ann\\.?)?|A\\.?S\\.?",
  },
  // ── Arizona ───────────────────────────────────────────────────────────────
  // A.R.S. fragment admits inter-letter spaces (`A. R.S.`, OCR `AR.S.`) and
  // no-dots (`ARS`) — see #348. The extractor normalizes all variants to the
  // canonical `A.R.S.` via the stripped-form fallback in `findAbbreviatedCode`.
  {
    jurisdiction: "AZ",
    abbreviations: ["Ariz. Rev. Stat. Ann.", "Ariz. Rev. Stat.", "A.R.S."],
    regexFragment: "Ariz\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|A\\.?\\s*R\\.?\\s*S\\.?",
  },
  // ── Arkansas ──────────────────────────────────────────────────────────────
  // Modern Arkansas Code Annotated (post-1987). Fragment accepts both the
  // abbreviated `Ann.` form and the spelled-out `Annotated` form (#349).
  {
    jurisdiction: "AR",
    abbreviations: [
      "Arkansas Code Annotated",
      "Ark. Code Ann.",
      "Arkansas Code",
      "A.C.A.",
    ],
    regexFragment:
      "Ark(?:ansas)?\\.?\\s+Code(?:\\s+Ann(?:otated)?\\.?)?|A\\.?C\\.?A\\.?",
  },
  // Pre-1987 Arkansas Statutes Annotated. Modern Arkansas opinions still cite
  // this when referencing pre-1987 statutory text (#349).
  {
    jurisdiction: "AR",
    abbreviations: ["Arkansas Statutes Annotated", "Ark. Stat. Ann.", "Ark. Stat."],
    regexFragment:
      "Ark(?:ansas)?\\.?\\s+Stat(?:utes)?\\.?(?:\\s+Ann(?:otated)?\\.?)?",
  },
  // ── Connecticut ───────────────────────────────────────────────────────────
  {
    jurisdiction: "CT",
    abbreviations: ["Conn. Gen. Stat. Ann.", "Conn. Gen. Stat.", "C.G.S."],
    regexFragment: "Conn\\.?\\s+Gen\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|C\\.?G\\.?S\\.?",
  },
  // ── District of Columbia ──────────────────────────────────────────────────
  {
    jurisdiction: "DC",
    abbreviations: ["D.C. Official Code", "D.C. Code Ann.", "D.C. Code"],
    regexFragment: "D\\.?C\\.?\\s+(?:Official\\s+)?Code(?:\\s+Ann\\.?)?",
  },
  // ── Hawaii ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "HI",
    abbreviations: ["Haw. Rev. Stat. Ann.", "Haw. Rev. Stat.", "HRS"],
    regexFragment: "Haw\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|HRS",
  },
  // ── Iowa ──────────────────────────────────────────────────────────────────
  {
    jurisdiction: "IA",
    abbreviations: ["Iowa Code Ann.", "Iowa Code", "I.C.A."],
    regexFragment: "Iowa\\s+Code(?:\\s+Ann\\.?)?|I\\.?C\\.?A\\.?",
  },
  // ── Idaho ─────────────────────────────────────────────────────────────────
  // Idaho fragment admits the dotted `I.C.` abbreviation plus inter-letter
  // spacing variants (`I. C.`, OCR `I.  C.`) and the no-dots form (`IC` is
  // owned by Indiana via array order). The extractor normalizes all variants
  // to the canonical `Idaho Code` via the stripped-form fallback in
  // `findAbbreviatedCode`. #360
  {
    jurisdiction: "ID",
    abbreviations: ["Idaho Code Ann.", "Idaho Code", "I.C."],
    regexFragment: "Idaho\\s+Code(?:\\s+Ann\\.?)?|I\\.?\\s*C\\.?",
  },
  // ── Kansas ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "KS",
    abbreviations: ["Kan. Stat. Ann.", "K.S.A."],
    regexFragment: "Kan\\.?\\s+Stat\\.?\\s+Ann\\.?|K\\.?S\\.?A\\.?",
  },
  // ── Kentucky ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "KY",
    abbreviations: ["Ky. Rev. Stat. Ann.", "Ky. Rev. Stat.", "KRS"],
    regexFragment: "Ky\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|KRS",
  },
  // ── Louisiana ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "LA",
    abbreviations: ["La. Rev. Stat. Ann.", "La. R.S.", "LSA-R.S."],
    regexFragment:
      "La\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|La\\.?\\s+R\\.?S\\.?|LSA-R\\.?S\\.?",
  },
  // ── Maine ─────────────────────────────────────────────────────────────────
  {
    jurisdiction: "ME",
    abbreviations: ["Me. Rev. Stat. Ann.", "Me. Rev. Stat.", "M.R.S.A.", "M.R.S."],
    regexFragment: "Me\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|M\\.?R\\.?S\\.?A?\\.?",
  },
  // ── Minnesota ─────────────────────────────────────────────────────────────
  // The dotted `M.S.A.` form (literal dots required) routes to Minnesota
  // Statutes Annotated; the dotless `MSA` belongs to Michigan (Mich. Stat.
  // Ann.) via array order — see Michigan entry above. #370
  // The short form `Minn. St.` (without the `at`) is the canonical Minnesota
  // court style — distinct from the federal Bluebook's `Minn. Stat.` (#371).
  // `Minnesota Statutes` (spelled out) is the official short title used in
  // postfix prose forms.
  {
    jurisdiction: "MN",
    abbreviations: ["Minnesota Statutes", "Minn. Stat. Ann.", "Minn. Stat.", "Minn. St.", "M.S.A."],
    regexFragment:
      "Minnesota\\s+Statutes(?:\\s+Ann(?:otated)?\\.?)?|Minn\\.?\\s+(?:Stat|St)\\.?(?:\\s+Ann\\.?)?|M\\.S\\.A\\.",
  },
  // ── Mississippi ───────────────────────────────────────────────────────────
  {
    jurisdiction: "MS",
    abbreviations: ["Miss. Code Ann.", "Mississippi Code", "MS Code"],
    regexFragment: "Miss(?:issippi)?\\.?\\s+Code(?:\\s+Ann\\.?)?|MS\\s+Code",
  },
  // ── Missouri ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "MO",
    abbreviations: ["Mo. Ann. Stat.", "Mo. Rev. Stat.", "V.A.M.S.", "RSMo"],
    regexFragment: "Mo\\.?\\s+(?:Ann\\.?\\s+|Rev\\.?\\s+)Stat\\.?|V\\.?A\\.?M\\.?S\\.?|RSMo",
  },
  // ── Montana ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "MT",
    abbreviations: ["Mont. Code Ann.", "MCA"],
    regexFragment: "Mont\\.?\\s+Code(?:\\s+Ann\\.?)?|MCA",
  },
  // ── North Dakota ──────────────────────────────────────────────────────────
  {
    jurisdiction: "ND",
    abbreviations: ["N.D. Cent. Code", "N.D.C.C."],
    regexFragment: "N\\.?D\\.?\\s+Cent\\.?\\s+Code|N\\.?D\\.?C\\.?C\\.?",
  },
  // ── Nebraska ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "NE",
    abbreviations: ["Neb. Rev. Stat.", "R.R.S. Neb.", "R.R.S."],
    regexFragment: "Neb\\.?\\s+Rev\\.?\\s+Stat\\.?|R\\.?R\\.?S\\.?(?:\\s+Neb\\.?)?",
  },
  // ── New Hampshire ─────────────────────────────────────────────────────────
  {
    jurisdiction: "NH",
    abbreviations: ["N.H. Rev. Stat. Ann.", "N.H. RSA", "RSA"],
    regexFragment: "N\\.?H\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|N\\.?H\\.?\\s+RSA|RSA",
  },
  // ── New Mexico ────────────────────────────────────────────────────────────
  {
    jurisdiction: "NM",
    abbreviations: ["N.M. Stat. Ann.", "NMSA 1978", "NMSA"],
    regexFragment: "N\\.?M\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|NMSA(?:\\s+1978)?",
  },
  // ── Nevada ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "NV",
    abbreviations: ["Nev. Rev. Stat. Ann.", "Nev. Rev. Stat.", "NRS"],
    regexFragment: "Nev\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|NRS",
  },
  // ── Oklahoma ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "OK",
    abbreviations: ["Okla. Stat. Ann.", "Okla. Stat.", "O.S."],
    regexFragment: "Okla\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|O\\.?S\\.?",
  },
  // ── Oregon ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "OR",
    abbreviations: ["Or. Rev. Stat. Ann.", "Or. Rev. Stat.", "ORS"],
    regexFragment: "Or\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|ORS",
  },
  // ── Rhode Island ──────────────────────────────────────────────────────────
  {
    jurisdiction: "RI",
    abbreviations: ["R.I. Gen. Laws", "R.I.G.L."],
    regexFragment: "R\\.?I\\.?\\s+Gen\\.?\\s+Laws|R\\.?I\\.?G\\.?L\\.?",
  },
  // ── South Carolina ────────────────────────────────────────────────────────
  {
    jurisdiction: "SC",
    abbreviations: ["S.C. Code Ann.", "S.C. Code"],
    regexFragment: "S\\.?C\\.?\\s+Code(?:\\s+Ann\\.?)?",
  },
  // ── South Dakota ──────────────────────────────────────────────────────────
  {
    jurisdiction: "SD",
    abbreviations: ["S.D. Codified Laws", "S.D.C.L.", "SDCL"],
    regexFragment: "S\\.?D\\.?\\s+Codified\\s+Laws|S\\.?D\\.?C\\.?L\\.?|SDCL",
  },
  // ── Tennessee ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "TN",
    abbreviations: ["Tenn. Code Ann.", "Tennessee Code", "T.C.A.", "TN Code"],
    regexFragment: "Tenn(?:essee)?\\.?\\s+Code(?:\\s+Ann\\.?)?|T\\.?C\\.?A\\.?|TN\\s+Code",
  },
  // ── Vermont ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "VT",
    abbreviations: ["Vt. Stat. Ann.", "V.S.A."],
    regexFragment: "Vt\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|V\\.?S\\.?A\\.?",
  },
  // ── Wisconsin ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "WI",
    abbreviations: ["Wis. Stat. Ann.", "Wis. Stat.", "W.S.A."],
    regexFragment: "Wis\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|W\\.?S\\.?A\\.?",
  },
  // ── West Virginia ─────────────────────────────────────────────────────────
  {
    jurisdiction: "WV",
    abbreviations: ["W. Va. Code Ann.", "W. Va. Code", "WV Code"],
    regexFragment: "W\\.?\\s*Va\\.?\\s+Code(?:\\s+Ann\\.?)?|WV\\s+Code",
  },
  // ── Wyoming ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "WY",
    abbreviations: ["Wyo. Stat. Ann.", "Wyo. Stat.", "W.S."],
    regexFragment: "Wyo\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|W\\.?S\\.?",
  },
]
