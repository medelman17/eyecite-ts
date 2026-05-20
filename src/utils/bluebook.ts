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
      // section may be absent (e.g. Massachusetts chapter-only like
      // `G.L. c. 93A` \u2014 #569). Render the chapter form when present and
      // omit the trailing `\u00A7 <section>` if there is no section.
      const code = citation.code ? `${citation.code} ` : ""
      const chapter = citation.chapter ? `c. ${citation.chapter}` : ""
      const subsection = citation.subsection ?? ""
      const etSeq = citation.hasEtSeq ? " et seq." : ""
      if (citation.section !== undefined && citation.section !== "") {
        const section = `\u00A7 ${citation.section}`
        const sep = chapter ? ", " : ""
        return `${title}${code}${chapter}${sep}${section}${subsection}${etSeq}`
      }
      // chapter-only OR section absent: emit `code c. chapter` (Mass)
      // or `code \u00A7` placeholder when neither field is present.
      // (`code` may be absent when an untagged bare-section cite was emitted
      // \u2014 #531/#565 \u2014 handled by the `citation.code ? ... : ""` ternary above.)
      if (chapter) return `${title}${code}${chapter}${etSeq}`
      return `${title}${code}\u00A7${etSeq}`
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

    case "docket": {
      const caseName = citation.caseName ? `${citation.caseName}, ` : ""
      const courtAndYear =
        citation.court && citation.year
          ? ` (${citation.court} ${citation.year})`
          : citation.court
            ? ` (${citation.court})`
            : citation.year
              ? ` (${citation.year})`
              : ""
      return `${caseName}No. ${citation.docketNumber}${courtAndYear}`
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

    case "federalRule": {
      // Bluebook canonical abbreviated form.
      const ruleSetAbbrev: Record<typeof citation.ruleSet, string> = {
        civil: "Civ. P.",
        criminal: "Crim. P.",
        evidence: "Evid.",
        appellate: "App. P.",
        bankruptcy: "Bankr. P.",
      }
      const subsection = citation.subsection ?? ""
      return `Fed. R. ${ruleSetAbbrev[citation.ruleSet]} ${citation.rule}${subsection}`
    }

    case "restatement": {
      const subsection = citation.subsection ?? ""
      return `Restatement (${citation.edition}) of ${citation.subject} § ${citation.section}${subsection}`
    }

    case "treatise": {
      const section = `§ ${citation.section}`
      return `${citation.volume} ${citation.title} ${section}`
    }

    case "annotation": {
      const year = citation.year !== undefined ? ` (${citation.year})` : ""
      return `${citation.volume} ${citation.series} ${citation.page}${year}`
    }
  }
}
