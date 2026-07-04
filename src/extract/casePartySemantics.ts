import type { CaseComponentSpans } from "@/types/componentSpans"
import type { CitationSignal } from "@/types/citation"
import {
  resolveOriginalSpan,
  type Span,
  type TransformationMap,
} from "@/types/span"

/** Valid CitationSignal values for safe validation after regex capture + normalization. */
const VALID_SIGNALS = new Set([
  "see",
  "see also",
  "see generally",
  "cf",
  "but see",
  "but cf",
  "compare",
  "accord",
  "contra",
  // Combined `, e.g.` forms (Bluebook Rule 1.3) must be matched before bare signals.
  "e.g.",
  "see, e.g.",
  "see also, e.g.",
  "but see, e.g.",
  "cf., e.g.",
  "but cf., e.g.",
])

/**
 * Regex matching any VALID_SIGNALS entry at the start of a string, followed by whitespace.
 * Derived from VALID_SIGNALS to ensure a single source of truth.
 */
export const SIGNAL_STRIP_REGEX: RegExp = (() => {
  const sorted = [...VALID_SIGNALS].sort((a, b) => b.length - a.length)
  const alternatives = sorted.map((s) =>
    s
      .replace(/\s+/g, "\\s*,?\\s+")
      .replace(/,\s*/g, ",?\\s*")
      .replace(/\./g, "\\.\\s*"),
  )
  const proseConnector =
    "(?:the\\s+(?:case\\s+of(?:\\s+the)?|opinion(?:\\s+filed\\s+at\\s+this\\s+term)?\\s+in)\\s+)?"
  return new RegExp(`^(${alternatives.join("|")}),?\\s+${proseConnector}`, "i")
})()

export interface PartyNameResult {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
  signal?: CitationSignal
  /** Bankruptcy adversary admin parenthetical (#241), e.g., "In re Hintze". */
  adminParenthetical?: string
}

export interface InterpretCasePartySemanticsInput {
  caseName: string
  caseNameStart?: number
  citationCoreStart: number
  fullSpan?: Span
  cleanedText?: string
  transformationMap: TransformationMap
}

export interface CasePartySemantics extends PartyNameResult {
  caseName: string
  fullSpan?: Span
  spans: Pick<CaseComponentSpans, "caseName" | "plaintiff" | "defendant" | "signal">
}

/**
 * Normalize party name for matching by removing legal noise.
 * Normalization pipeline:
 * 1. Strip "et al." (case-insensitive)
 * 2. Strip slash-aliases "d/b/a", "f/k/a", "n/k/a", "a/k/a" and everything after
 * 3. Strip "aka" and everything after (case-insensitive, word boundary)
 * 4. Strip trailing corporate suffixes (Inc., LLC, Corp., Ltd., Co., LLP, LP, P.C.)
 * 5. Strip leading articles (The, A, An)
 * 6. Normalize whitespace
 * 7. Trim and lowercase
 */
function normalizePartyName(name: string): string {
  let normalized = name

  normalized = normalized.replace(/\bet\s+al\.?/gi, "")
  normalized = normalized.replace(/\s+(?:d\/b\/a|[fna]\/k\/a)\b.*/gi, "")
  normalized = normalized.replace(/\s+aka\b.*/gi, "")

  let prev = ""
  while (prev !== normalized) {
    prev = normalized
    normalized = normalized.replace(/,?\s*(Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.C)\.?$/gi, "")
  }

  normalized = normalized.replace(/^(The|A|An)\s+/i, "")
  normalized = normalized.replace(/\s+/g, " ")

  return normalized.trim().toLowerCase()
}

/**
 * Extract plaintiff and defendant party names from case name.
 * Handles adversarial cases (v.) and procedural prefixes (In re, Ex parte, etc.).
 */
export function extractPartyNames(caseName: string): PartyNameResult {
  let signal: CitationSignal | undefined
  // Procedural prefix patterns (anchored to start, case-insensitive).
  // Longer prefixes first so the for-loop finds the most specific match.
  const proceduralPrefixes = [
    // "In the Matter of the X of" cluster — must precede "In the Matter of"
    "In the Matter of the Liquidation of",
    "In the Matter of the Rehabilitation of",
    "In the Matter of the Receivership of",
    "In the Matter of the Extradition of",
    "In the Matter of the Application of",
    "In the Matter of the Welfare of",
    "In the Matter of",
    // "In re X of" cluster — must precede "In re"
    "In re Petition for Naturalization of",
    "In re Termination of Parental Rights as to",
    "In re Termination of Parental Rights to",
    "In re Termination of Parental Rights of",
    "In re Marriage of",
    "In re Liquidation of",
    "In re Rehabilitation of",
    "In re Receivership of",
    "In re Naturalization of",
    "In re Extradition of",
    "In re Application of",
    "In re Welfare of",
    "In re Dependency of",
    "In re Paternity of",
    "In re Parentage of",
    "In re Conservatorship of",
    "In re Guardianship of",
    "In re Adoption of",
    "In the Interest of",
    "In re",
    "Ex parte",
    // "Matter of X of" cluster — must precede "Matter of"
    "Matter of Liquidation of",
    "Matter of Rehabilitation of",
    "Matter of",
    // Sovereign ex rel. — long forms precede short forms
    "Commonwealth of Puerto Rico ex rel.",
    "Government of the Virgin Islands ex rel.",
    "Commonwealth ex rel.",
    "State ex rel.",
    "United States ex rel.",
    "People ex rel.",
    "District of Columbia ex rel.",
    // Petition variants — "Petition for Naturalization of" precedes "Petition of"
    "Petition for Naturalization of",
    "Application of",
    "On Petition of",
    "Petition of",
    // Other "X of" forms
    "Adoption of",
    "Conservatorship of the Person and Estate of",
    "Conservatorship of the Person of",
    "Conservatorship of the Estate of",
    "Conservatorship of",
    "Guardianship of",
    "Estate of",
    "Care and Protection of",
    "Succession of",
    "Inquiry Concerning Judge",
    "Appeal of",
  ]

  for (const prefix of proceduralPrefixes) {
    const prefixRegex = new RegExp(`^(${prefix})\\s+(.+)$`, "i")
    const match = prefixRegex.exec(caseName)
    if (match) {
      const matchedPrefix = match[1]
      const subject = match[2]

      if (/\s+vs?\.?\s+/i.test(subject)) {
        const vMatch = /^(.+?)\s+vs?\.?\s+(.+)$/i.exec(caseName)
        if (vMatch) {
          const plaintiff = vMatch[1].trim()
          const defendant = vMatch[2].trim()
          return {
            plaintiff,
            plaintiffNormalized: normalizePartyName(plaintiff),
            defendant,
            defendantNormalized: normalizePartyName(defendant),
          }
        }
      } else {
        return {
          plaintiff: caseName,
          plaintiffNormalized: normalizePartyName(subject),
          proceduralPrefix: matchedPrefix,
        }
      }
    }
  }

  const vMatch = /^(.+?)\s+vs?\.?\s+(.+)$/i.exec(caseName)
  if (vMatch) {
    let plaintiff = vMatch[1].trim()
    let defendant = vMatch[2].trim()

    let adminParenthetical: string | undefined
    const adminMatch = /\s*\(\s*(In\s+re\s+[^)]+?)\s*\)\s*$/i.exec(defendant)
    if (adminMatch) {
      adminParenthetical = adminMatch[1]
      defendant = defendant.substring(0, adminMatch.index).trim()
    }

    const signalMatch =
      plaintiff.match(SIGNAL_STRIP_REGEX) ?? plaintiff.match(/^(Also|In(?!\s+re\b))\s+/i)
    if (signalMatch) {
      const remainderAfterStrip = plaintiff.substring(signalMatch[0].length).trimStart()
      const firstChar = remainderAfterStrip[0] ?? ""
      const remainderIsCaseNameLike = firstChar >= "A" && firstChar <= "Z"
      if (remainderIsCaseNameLike) {
        const lowered = signalMatch[1].toLowerCase()
        if (VALID_SIGNALS.has(lowered)) {
          signal = lowered as CitationSignal
        } else {
          const stripped = lowered.replace(/\.$/, "")
          if (VALID_SIGNALS.has(stripped)) {
            signal = stripped as CitationSignal
          }
        }
        plaintiff = plaintiff.substring(signalMatch[0].length).trim()
      }
    }

    return {
      plaintiff: plaintiff || vMatch[1].trim(),
      plaintiffNormalized: normalizePartyName(plaintiff || vMatch[1].trim()),
      defendant,
      defendantNormalized: normalizePartyName(defendant),
      signal,
      ...(adminParenthetical ? { adminParenthetical } : {}),
    }
  }

  return {}
}

function resolveCleanSpan(
  cleanStart: number,
  cleanEnd: number,
  transformationMap: TransformationMap,
): Span {
  const original = resolveOriginalSpan({ cleanStart, cleanEnd }, transformationMap)
  return {
    cleanStart,
    cleanEnd,
    originalStart: original.originalStart,
    originalEnd: original.originalEnd,
  }
}

export function interpretCasePartySemantics(
  input: InterpretCasePartySemanticsInput,
): CasePartySemantics {
  const partyResult = extractPartyNames(input.caseName)
  const spans: Pick<CaseComponentSpans, "caseName" | "plaintiff" | "defendant" | "signal"> =
    {}

  let caseName = input.caseName
  let fullSpan = input.fullSpan

  const {
    plaintiff,
    plaintiffNormalized,
    defendant,
    defendantNormalized,
    proceduralPrefix,
    signal,
    adminParenthetical,
  } = partyResult

  if (plaintiff && defendant) {
    const adminSuffix = adminParenthetical ? ` (${adminParenthetical})` : ""
    const existingSepMatch = /\s+(vs?\.?)\s+/.exec(caseName)
    const rebuildSep = existingSepMatch?.[1] ?? "v."
    const rebuiltName = `${plaintiff} ${rebuildSep} ${defendant}${adminSuffix}`
    if (rebuiltName !== caseName && fullSpan && input.cleanedText) {
      caseName = rebuiltName

      const prefixRegion = input.cleanedText.substring(fullSpan.cleanStart, input.citationCoreStart)
      const vSep = /\s+vs?\.?\s+/i.exec(prefixRegion)
      if (vSep) {
        const beforeV = prefixRegion.substring(0, vSep.index)
        const pIdx = beforeV.lastIndexOf(plaintiff)
        if (pIdx !== -1) {
          const newCleanStart = fullSpan.cleanStart + pIdx
          const newOriginalStart =
            input.transformationMap.cleanToOriginal.get(newCleanStart) ?? newCleanStart
          fullSpan = { ...fullSpan, cleanStart: newCleanStart, originalStart: newOriginalStart }
        }
      }

      if (input.caseNameStart !== undefined) {
        const strippedCleanStart = fullSpan.cleanStart
        const strippedCleanEnd = strippedCleanStart + caseName.length
        spans.caseName = resolveCleanSpan(
          strippedCleanStart,
          strippedCleanEnd,
          input.transformationMap,
        )
      }
    }
  }

  if (plaintiff && input.caseNameStart !== undefined && input.cleanedText) {
    const nameAnchor = fullSpan?.cleanStart ?? input.caseNameStart
    const searchRegion = input.cleanedText.substring(nameAnchor, input.citationCoreStart)
    const vSepMatch = /\s+vs?\.?\s+/i.exec(searchRegion)
    if (vSepMatch) {
      const plaintiffRegion = searchRegion.substring(0, vSepMatch.index)
      const pIdx = plaintiffRegion.lastIndexOf(plaintiff)
      if (pIdx !== -1) {
        const pCleanStart = nameAnchor + pIdx
        spans.plaintiff = resolveCleanSpan(
          pCleanStart,
          pCleanStart + plaintiff.length,
          input.transformationMap,
        )
      }

      if (defendant) {
        const defRegionStart = vSepMatch.index + vSepMatch[0].length
        const defendantRegion = searchRegion.substring(defRegionStart)
        const dIdx = defendantRegion.indexOf(defendant)
        if (dIdx !== -1) {
          const dCleanStart = nameAnchor + defRegionStart + dIdx
          spans.defendant = resolveCleanSpan(
            dCleanStart,
            dCleanStart + defendant.length,
            input.transformationMap,
          )
        }
      }
    } else {
      const pIdx = searchRegion.indexOf(plaintiff)
      if (pIdx !== -1) {
        const pCleanStart = nameAnchor + pIdx
        spans.plaintiff = resolveCleanSpan(
          pCleanStart,
          pCleanStart + plaintiff.length,
          input.transformationMap,
        )
      }
    }
  }

  if (signal && fullSpan && input.cleanedText && input.caseNameStart !== undefined) {
    const sigRegion = input.cleanedText.substring(input.caseNameStart, input.citationCoreStart)
    const sigMatch = SIGNAL_STRIP_REGEX.exec(sigRegion)
    if (sigMatch) {
      const sigCleanStart = input.caseNameStart
      const sigCleanEnd = sigCleanStart + sigMatch[1].length
      spans.signal = resolveCleanSpan(sigCleanStart, sigCleanEnd, input.transformationMap)
    }
  }

  return {
    caseName,
    ...(plaintiff !== undefined ? { plaintiff } : {}),
    ...(plaintiffNormalized !== undefined ? { plaintiffNormalized } : {}),
    ...(defendant !== undefined ? { defendant } : {}),
    ...(defendantNormalized !== undefined ? { defendantNormalized } : {}),
    ...(proceduralPrefix !== undefined ? { proceduralPrefix } : {}),
    ...(signal !== undefined ? { signal } : {}),
    ...(adminParenthetical !== undefined ? { adminParenthetical } : {}),
    ...(fullSpan !== undefined ? { fullSpan } : {}),
    spans,
  }
}
