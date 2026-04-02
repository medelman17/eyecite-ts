import type { Citation } from "../types/citation"

/** Convert an integer to a Roman numeral (1-27 covers all amendments + articles). */
function toRoman(n: number): string {
  const numerals: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]
  let result = ""
  let remaining = n
  for (const [value, numeral] of numerals) {
    while (remaining >= value) {
      result += numeral
      remaining -= value
    }
  }
  return result
}

/**
 * Reconstruct a canonical Bluebook-style citation string from structured fields.
 *
 * Works across all 11 citation types via the discriminated union.
 * Best-effort: uses whatever fields are available on the citation object.
 *
 * @example
 * ```typescript
 * toBluebook(caseCitation)   // "Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007)"
 * toBluebook(statuteCite)    // "42 U.S.C. § 1983"
 * toBluebook(idCite)         // "Id. at 570"
 * ```
 */
export function toBluebook(citation: Citation): string {
  switch (citation.type) {
    case "case": {
      const reporter = citation.normalizedReporter ?? citation.reporter
      let pageStr: string
      if (citation.hasBlankPage) {
        pageStr = " ___"
      } else if (citation.page !== undefined) {
        pageStr = ` ${citation.page}`
      } else {
        pageStr = ""
      }

      const core = `${citation.volume} ${reporter}${pageStr}`
      const pincite = citation.pincite !== undefined ? `, ${citation.pincite}` : ""
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      const caseName = citation.caseName ? `${citation.caseName}, ` : ""

      return `${caseName}${core}${pincite}${year}`
    }

    case "statute": {
      const title = citation.title !== undefined ? `${citation.title} ` : ""
      const section = `\u00A7 ${citation.section}`
      const subsection = citation.subsection ?? ""
      const etSeq = citation.hasEtSeq ? " et seq." : ""
      return `${title}${citation.code} ${section}${subsection}${etSeq}`
    }

    case "constitutional": {
      const jurisdiction = citation.jurisdiction === "US" ? "U.S." : (citation.jurisdiction ?? "")
      const prefix = `${jurisdiction} Const.`

      let body = ""
      if (citation.article !== undefined) {
        body += ` art. ${toRoman(citation.article)}`
      }
      if (citation.amendment !== undefined) {
        body += ` amend. ${toRoman(citation.amendment)}`
      }
      if (citation.section !== undefined) {
        body += `, \u00A7 ${citation.section}`
      }
      if (citation.clause !== undefined) {
        body += `, cl. ${citation.clause}`
      }
      return `${prefix}${body}`
    }

    case "journal": {
      const vol = citation.volume !== undefined ? `${citation.volume} ` : ""
      const page = citation.page !== undefined ? ` ${citation.page}` : ""
      const pincite = citation.pincite !== undefined ? `, ${citation.pincite}` : ""
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      return `${vol}${citation.abbreviation}${page}${pincite}${year}`
    }

    case "neutral":
      return `${citation.year} ${citation.court} ${citation.documentNumber}`

    case "publicLaw":
      return `Pub. L. No. ${citation.congress}-${citation.lawNumber}`

    case "federalRegister": {
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      return `${citation.volume} Fed. Reg. ${citation.page}${year}`
    }

    case "statutesAtLarge":
      return `${citation.volume} Stat. ${citation.page}`

    case "id":
      return citation.pincite !== undefined ? `Id. at ${citation.pincite}` : "Id."

    case "supra":
      return citation.pincite !== undefined
        ? `${citation.partyName}, supra, at ${citation.pincite}`
        : `${citation.partyName}, supra`

    case "shortFormCase": {
      const reporter = citation.reporter
      if (citation.pincite !== undefined) {
        return `${citation.volume} ${reporter} at ${citation.pincite}`
      }
      const page = citation.page !== undefined ? ` ${citation.page}` : ""
      return `${citation.volume} ${reporter}${page}`
    }
  }
}
