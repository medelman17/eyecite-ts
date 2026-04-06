/**
 * State statute abbreviation table — single source of truth for the
 * abbreviated-code tokenizer pattern and the knownCodes lookup registry.
 */

export interface StateStatuteEntry {
  /** Two-letter jurisdiction code (e.g., "AK", "AZ") */
  jurisdiction: string;
  /** All recognized abbreviation forms — used for lookup by findAbbreviatedCode */
  abbreviations: string[];
  /**
   * Regex fragment for tokenizer alternation. If omitted, auto-generated
   * from abbreviations via escapeForRegex. Provide explicitly when the
   * pattern needs optional components (e.g., "Stat(?:utes)?").
   */
  regexFragment?: string;
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
  );
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
  const allFragments: string[] = [];

  for (const entry of stateStatuteEntries) {
    if (entry.regexFragment) {
      allFragments.push(entry.regexFragment);
    } else {
      for (const abbrev of entry.abbreviations) {
        allFragments.push(escapeForRegex(abbrev));
      }
    }
  }

  // Sort longest-first so more specific patterns match before shorter ones
  allFragments.sort((a, b) => b.length - a.length);

  const alternation = allFragments.join("|");

  return new RegExp(
    `\\b(?:(\\d+)\\s+)?(${alternation})\\s*§?\\s*(\\d+[A-Za-z0-9.:/-]*(?:\\([^)]*\\))*(?:\\s*et\\s+seq\\.?)?)`,
    "g",
  );
}

export const stateStatuteEntries: StateStatuteEntry[] = [
  // ── Florida ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "FL",
    abbreviations: ["Fla. Stat. Ann.", "Fla. Stat.", "Fla Stat", "F.S.", "FS"],
    regexFragment: "Fla\\.?\\s*Stat(?:utes)?\\.?(?:\\s*Ann\\.?)?|F\\.?S\\.?",
  },
  // ── Ohio ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "OH",
    abbreviations: ["Ohio Rev. Code Ann.", "Ohio Rev. Code", "O.R.C.", "ORC", "R.C.", "RC"],
    regexFragment: "Ohio\\s+Rev\\.?\\s+Code(?:\\s+Ann\\.?)?|O\\.?R\\.?C\\.?|R\\.?C\\.?",
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
  // ── Utah ───────────────────────────────────────────────────────────────────
  {
    jurisdiction: "UT",
    abbreviations: ["Utah Code Ann.", "Utah Code", "U.C.A.", "UCA"],
    regexFragment: "Utah\\s+Code(?:\\s+Ann\\.?)?|U\\.?C\\.?A\\.?",
  },
  // ── Colorado ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "CO",
    abbreviations: ["Colo. Rev. Stat. Ann.", "Colo. Rev. Stat.", "C.R.S.", "CRS"],
    regexFragment: "Colo\\.?\\s+Rev\\.?\\s+Stat\\.?(?:\\s+Ann\\.?)?|C\\.?R\\.?S\\.?",
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
    regexFragment: "N\\.?C\\.?\\s*Gen\\.?\\s*Stat\\.?(?:\\s+Ann\\.?)?|N\\.?C\\.?G\\.?S\\.?|G\\.?S\\.?",
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
  {
    jurisdiction: "IN",
    abbreviations: [
      "Burns Ind. Code Ann.",
      "Burns Ind. Code",
      "Indiana Code Ann.",
      "Indiana Code",
      "Ind. Code Ann.",
      "Ind. Code",
      "I.C.",
      "IC",
    ],
    regexFragment: "Burns\\s+Ind\\.?\\s+Code(?:\\s+Ann\\.?)?|Ind(?:iana)?\\.?\\s+Code(?:\\s+Ann\\.?)?|I\\.?C\\.?",
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
];
