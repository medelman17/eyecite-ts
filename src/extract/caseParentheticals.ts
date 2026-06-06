import { levenshteinDistance } from "@/resolve/levenshtein"
import type { HistorySignal, ParentheticalType } from "@/types/citation"
import { parseDate, type StructuredDate } from "./dates"

export interface RawSpan {
  start: number
  end: number
}

export interface HistorySignalNode {
  kind: "historySignal"
  rawSignal: string
  signal: HistorySignal
  span: RawSpan
  nextParentheticalIndex?: number
}

export interface MetadataParentheticalNode {
  kind: "metadata"
  text: string
  span: RawSpan
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
  justices?: string[]
  scope?: string
  courtStart?: number
  courtEnd?: number
  yearStart?: number
  yearEnd?: number
  internalHistory?: HistorySignalNode
}

export interface ExplanatoryParentheticalNode {
  kind: "explanatory"
  text: string
  span: RawSpan
  type: ParentheticalType
}

export type ParentheticalNode = MetadataParentheticalNode | ExplanatoryParentheticalNode
export type CaseParentheticalNode = ParentheticalNode | HistorySignalNode

export interface CaseParentheticalChain {
  nodes: CaseParentheticalNode[]
  parentheticals: ParentheticalNode[]
  metadataParentheticals: MetadataParentheticalNode[]
  explanatoryParentheticals: ExplanatoryParentheticalNode[]
  historySignals: HistorySignalNode[]
  firstParenthetical?: ParentheticalNode
  lastParenthetical?: ParentheticalNode
}

interface RawParenthetical {
  text: string
  start: number
  end: number
}

interface RawSignal {
  text: string
  normalized: HistorySignal
  start: number
  end: number
}

interface CollectedParentheticals {
  parens: RawParenthetical[]
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}

const MONTH_PATTERN =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?/

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const NO_STRIP_TRAILING = new Set([
  "Cir",
  "Ct",
  "App",
  "Sup",
  "Dist",
  "Div",
  "Bankr",
  "Crim",
  "Civ",
  "Mass",
  "Tex",
  "Penn",
  "Wash",
  "Ind",
  "Ark",
])

function stripMisspelledTrailingMonth(content: string): string {
  const match = /\s+(\w{3,12})\.?\s*$/.exec(content)
  if (!match) return content
  const word = match[1]
  if (!/^[A-Z]/.test(word)) return content
  const wordStem = word.replace(/\.$/, "")
  if (NO_STRIP_TRAILING.has(wordStem)) return content
  const firstLetter = word[0]
  for (const month of MONTH_NAMES) {
    if (month[0] !== firstLetter) continue
    if (levenshteinDistance(word, month, 2) <= 2) {
      return content.slice(0, match.index).trim()
    }
  }
  return content
}

const PAREN_SKIP_REGEX = /[\s,]/

const PINCITE_SKIP_REGEX =
  /^(?:,\s*(?:(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?\*?\d+(?:[-–—~]\*?\d+)?(?:\s+(?:n|note)\s*\.?\s*\d+)?|(?:at\s+)?(?:¶¶?|paras?\.?)\s*\d+(?:[-–—~]\d+)?))+/

const SIGNAL_TABLE: ReadonlyArray<readonly [RegExp, HistorySignal]> = [
  [/^aff'?d\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^affirmed\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^aff'?d\b/i, "affirmed"],
  [/^affirmed\b/i, "affirmed"],
  [/^rev'?d\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\s+on\s+other\s+grounds\b/i, "reversed"],
  [/^reversed\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\b/i, "reversed"],
  [/^reversed\b/i, "reversed"],
  [/^certiorari\s+denied\b/i, "cert_denied"],
  [/^cert\.\s*den(ied|\.)(?=[\s,;(\[]|$)/i, "cert_denied"],
  [/^certiorari\s+granted\b/i, "cert_granted"],
  [/^cert\.\s*granted\b/i, "cert_granted"],
  [/^overruled\s+by\b/i, "overruled"],
  [/^overruled\s+in\b/i, "overruled"],
  [/^overruling\b/i, "overruled"],
  [/^overruled\b/i, "overruled"],
  [/^vacated\s+by\b/i, "vacated"],
  [/^vacated\b/i, "vacated"],
  [/^remanded\s+for\s+reconsideration\b/i, "remanded"],
  [/^remanded\b/i, "remanded"],
  [/^modified\s+by\b/i, "modified"],
  [/^modified\b/i, "modified"],
  [/^abrogated\s+by\b/i, "abrogated"],
  [/^abrogated\s+in\b/i, "abrogated"],
  [/^abrogated\b/i, "abrogated"],
  [/^superseded\s+by\s+grant\s+of\s+review\b/i, "superseded_by_grant_of_review"],
  [/^superseded\s+by\b/i, "superseded"],
  [/^superseded\b/i, "superseded"],
  [/^disapproved\s+on\s+other\s+grounds\b/i, "disapproved_other_grounds"],
  [/^disapproved\s+of\b/i, "disapproved"],
  [/^disapproved\b/i, "disapproved"],
  [/^questioned\s+by\b/i, "questioned"],
  [/^questioned\b/i, "questioned"],
  [/^distinguished\s+by\b/i, "distinguished"],
  [/^distinguished\b/i, "distinguished"],
  [/^withdrawn\b/i, "withdrawn"],
  [/^reinstated\b/i, "reinstated"],
  [/^reh'?g\s+denied\b/i, "rehearing_denied"],
  [/^rehearing\s+denied\b/i, "rehearing_denied"],
  [/^reh'?g\s+granted\b/i, "rehearing_granted"],
  [/^rehearing\s+granted\b/i, "rehearing_granted"],
  [/^writ\s+ref'?d\s+n\.r\.e\./i, "writ_refused"],
  [/^writ\s+ref'?d\s+w\.m\.j\./i, "writ_refused"],
  [/^writ\s+ref'?d\b/i, "writ_refused"],
  [/^writ\s+dism'?d\s+w\.o\.j\./i, "writ_dismissed"],
  [/^writ\s+dism'?d\b/i, "writ_dismissed"],
  [/^writ\s+denied\b/i, "writ_denied"],
  [/^writ\s+granted\b/i, "writ_granted"],
  [/^no\s+writ\b/i, "no_writ"],
  [/^pet\.\s+ref'?d\b/i, "pet_refused"],
  [/^pet\.\s+denied\b/i, "pet_denied"],
  [/^pet\.\s+dism'?d\b/i, "pet_dismissed"],
  [/^pet\.\s+granted\b/i, "pet_granted"],
  [/^pet\.\s+filed\b/i, "pet_filed"],
  [/^no\s+pet\.\s+h\./i, "no_pet"],
  [/^no\s+pet\./i, "no_pet"],
  [/^review\s+den(?:ied|\.)/i, "review_denied"],
  [/^review\s+granted\b/i, "review_granted"],
  [/^opinion\s+vacated\b/i, "opinion_vacated"],
  [/^petition\s+for\s+review\s+filed\b/i, "petition_for_review_filed"],
  [/^petition\s+for\s+review\s+granted\b/i, "petition_for_review_granted"],
  [/^petition\s+for\s+review\s+denied\b/i, "petition_for_review_denied"],
  [/^as\s+modified\s+on\s+denial\s+of\s+rehearing\b/i, "modified_on_denial_of_rehearing"],
  [/^ordered\s+not\s+pub\.?/i, "not_published"],
  [/^not\s+for\s+publication\b/i, "not_published"],
  [/^nonpubl?\.?\s+opn\.?/i, "not_published"],
]

function normalizeSignal(raw: string): { signal: HistorySignal; matchLength: number } | undefined {
  for (const [regex, signal] of SIGNAL_TABLE) {
    const match = regex.exec(raw)
    if (match) {
      return { signal, matchLength: match[0].length }
    }
  }
  return undefined
}

const SIGNAL_WORDS: ReadonlySet<string> = new Set([
  "holding",
  "finding",
  "stating",
  "noting",
  "explaining",
  "quoting",
  "citing",
  "discussing",
  "describing",
  "recognizing",
  "applying",
  "rejecting",
  "adopting",
  "requiring",
])

function isSignalWord(word: string): word is ParentheticalType {
  return SIGNAL_WORDS.has(word)
}

const LEADING_WORD_REGEX = /^([a-z]+)\b/i

export function isNonMetadataParenContent(content: string): boolean {
  let depth = 0
  for (const ch of content) {
    if (ch === "(") depth++
    else if (ch === ")") depth--
  }
  if (depth > 0) return true

  const leadingMatch = LEADING_WORD_REGEX.exec(content)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) return true
  }

  if (/\(\d{4}\)/.test(content)) return true

  return false
}

function stripDateFromCourt(content: string): string | undefined {
  if (/^(?:Vol\.?|vol\.?|p\.?|pp\.?|at|n\.?|note)\s+\d/i.test(content)) {
    return undefined
  }

  const stripped = content.replace(/\s*\([^()]*\)\s*$/, "").trim()
  let court = stripped
    .replace(/\s*\d{1,2}[/-]\d{1,2}[/-]\d{4}\s*$/, "")
    .replace(/\s*\d{4}[/-]\d{1,2}[/-]\d{1,2}\s*$/, "")
    .trim()
  court = court
    .replace(
      /\s*\d{4}(?:\s+|,\s+)(?:mem\.?|unpub\.?|unpublished|per\s+curiam|en\s+banc|slip\s+op\.?|table|supp\.?)\s*$/i,
      "",
    )
    .trim()
  court = court.replace(/\s*\d{4}\s*$/, "").trim()
  court = court.replace(/\s*,?\s*\d{1,2}\s*,?\s*$/, "").trim()
  court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`, "i"), "").trim()
  court = stripMisspelledTrailingMonth(court).trim()
  court = court.replace(/,\s*$/, "").trim()
  if (!court || !/[A-Za-z]/.test(court)) return undefined

  if (/^["'“”‘’]/.test(court)) return undefined
  if (/(?:[a-z][a-z\d+.-]*:\/\/|file:\/\/\/)/i.test(court)) return undefined
  if (/^(?:dis|conc|concurring|dissenting)\.\s*opn\./i.test(court)) return undefined
  if (/,\s+J\.?J?\.?\s*$|,\s+JJ\.?\s*$/.test(court)) return undefined
  if (/,\s+J\.?J?\.?,\s+(?:dissenting|concurring|joining)/i.test(court)) {
    return undefined
  }
  if (
    /^(?:(?:now|previously|formerly|since)\s+)?(?:rev'd|aff'd|aff'g|rev'g|mod'd|cert\.?\s+(?:denied|granted|dismissed)|appeal\s+(?:denied|dismissed|docketed)|dismissed|reversed|vacated|vacating|overruled(?:\s+by)?|overruling|en\s+banc|per\s+curiam)(?:\s+(?:in\s+part|on\s+other\s+grounds?|sub\s+nom\.?))?\s*$/i.test(
      court,
    )
  ) {
    return undefined
  }
  if (
    /^(?:n\.?\s*d\.?|no\s+date|year\s+omitted|unpub\.?|unpublished|slip\s+op(?:\.|inion)?|table|mem\.?)\s*$/i.test(
      court,
    )
  ) {
    return undefined
  }
  if (/^(?:filed|decided|argued|submitted|heard|effective|entered)\b/i.test(court)) {
    return undefined
  }
  if (/^(?:c\.|circa|about|approx\.?|approximately|cir\.)\s*$/i.test(court)) {
    return undefined
  }
  if (!court.includes(".")) {
    const firstWord = court.match(/^[a-z]+/i)?.[0].toLowerCase()
    if (
      firstWord &&
      (SIGNAL_WORDS.has(firstWord) ||
        firstWord === "additional" ||
        firstWord === "emphasis" ||
        firstWord === "internal" ||
        firstWord === "citations" ||
        firstWord === "footnote" ||
        firstWord === "alteration" ||
        firstWord === "alterations" ||
        firstWord === "omitted" ||
        firstWord === "see")
    ) {
      return undefined
    }

    const words = court.split(/\s+/)
    if (words.length >= 3 && words.every((w) => /^[a-z]/.test(w))) return undefined

    const hasOrdinal = words.some((w) => /^\d+(st|nd|rd|th|d)$/i.test(w))
    const allTitleCase = words.every((w) => /^[A-Z]/.test(w))
    if (!hasOrdinal && allTitleCase) return undefined
  }

  return court
}

const PAREN_CLOSE_HARD_CEILING = 10000

function collectParentheticals(
  text: string,
  startPos: number,
  maxLookahead = 2000,
): CollectedParentheticals {
  const parens: RawParenthetical[] = []
  const signals: CollectedParentheticals["signals"] = []
  let pos = startPos
  const endLimit = Math.min(text.length, startPos + maxLookahead)
  const hardEndLimit = Math.min(text.length, startPos + PAREN_CLOSE_HARD_CEILING)
  let pendingSignal: RawSignal | undefined

  const pinciteText = text.substring(pos, endLimit)
  const pinciteSkip = PINCITE_SKIP_REGEX.exec(pinciteText)
  if (pinciteSkip) {
    pos += pinciteSkip[0].length
  }

  while (pos < endLimit) {
    while (pos < endLimit && PAREN_SKIP_REGEX.test(text[pos])) {
      pos++
    }

    if (pos >= endLimit || text[pos] !== "(") {
      const remainingText = text.substring(pos, endLimit)
      const normalized = normalizeSignal(remainingText)
      if (normalized) {
        if (pendingSignal) {
          signals.push({ signal: pendingSignal, nextParenIndex: -1 })
        }
        pendingSignal = {
          text: remainingText.substring(0, normalized.matchLength).replace(/\s+$/, ""),
          normalized: normalized.signal,
          start: pos,
          end: pos + normalized.matchLength,
        }
        pos += normalized.matchLength
        continue
      }
      break
    }

    const parenStart = pos
    let depth = 0
    const contentStart = pos + 1

    while (pos < hardEndLimit) {
      const char = text[pos]
      if (char === "(") {
        depth++
      } else if (char === ")") {
        depth--
        if (depth === 0) {
          pos++
          const content = text.substring(contentStart, pos - 1).trim()
          if (content.length > 0) {
            parens.push({ text: content, start: parenStart, end: pos })
            if (pendingSignal) {
              signals.push({ signal: pendingSignal, nextParenIndex: parens.length - 1 })
              pendingSignal = undefined
            }
          }
          break
        }
      }
      pos++
    }

    if (depth > 0) break
  }

  if (pendingSignal) {
    signals.push({ signal: pendingSignal, nextParenIndex: -1 })
  }

  return { parens, signals }
}

export function parseParenthetical(content: string): MetadataParentheticalNode {
  const result: MetadataParentheticalNode = {
    kind: "metadata",
    text: content,
    span: { start: 0, end: content.length },
  }

  const dateResult = parseDate(content)
  if (dateResult) {
    result.date = dateResult
    result.year = dateResult.parsed.year
  }

  let workingContent = content
  if (result.year) {
    const yearStr = String(result.year)
    const yearIdx = content.lastIndexOf(yearStr)
    if (yearIdx !== -1) {
      const afterYearStart = yearIdx + yearStr.length
      const afterYear = content.substring(afterYearStart)
      const trailing = /^\s*,\s*(.+?)\s*$/.exec(afterYear)
      if (trailing) {
        const sigText = trailing[1]
        const normalized = normalizeSignal(sigText)
        if (normalized) {
          const rawSignal = sigText.substring(0, normalized.matchLength)
          const sigOffset = content.indexOf(rawSignal, afterYearStart)
          const start = sigOffset !== -1 ? sigOffset : afterYearStart
          result.internalHistory = {
            kind: "historySignal",
            rawSignal,
            signal: normalized.signal,
            span: { start, end: start + rawSignal.length },
          }
          workingContent = content.substring(0, afterYearStart)
        }
      }
    }
  }

  const courtResult = stripDateFromCourt(workingContent)
  if (courtResult) {
    result.court = courtResult
    const courtIdx = content.indexOf(courtResult)
    if (courtIdx !== -1) {
      result.courtStart = courtIdx
      result.courtEnd = courtIdx + courtResult.length
    }
  }

  if (result.year) {
    const yearStr = String(result.year)
    const yearIdx = content.lastIndexOf(yearStr)
    if (yearIdx !== -1) {
      result.yearStart = yearIdx
      result.yearEnd = yearIdx + yearStr.length
    }
  }

  const justiceMatch = /^(?<surnames>[A-Z][a-z]+(?:(?:,\s+|\s+and\s+)[A-Z][a-z]+)*)\s*,?\s*(?<title>C\.J\.|J\.|JJ\.)\s*,?\s*(?<role>.+)$/.exec(
    content.trim(),
  )
  if (justiceMatch?.groups) {
    const surnameText = justiceMatch.groups.surnames
    const roleText = justiceMatch.groups.role.trim().replace(/[.,]+$/, "")
    result.justices = surnameText
      .split(/(?:,\s+and\s+|,\s+|\s+and\s+)/)
      .map((s) => s.trim())
      .filter(Boolean)

    const lower = roleText.toLowerCase()
    if (/^concurring\s+in\s+part\s+and\s+dissenting\s+in\s+part/.test(lower)) {
      result.disposition = "mixed"
      result.scope = "in_part"
    } else if (/^concurring\s+in\s+the\s+judgment/.test(lower)) {
      result.disposition = "concurrence"
      result.scope = "in_judgment"
    } else if (/^concurring\s+in\s+part/.test(lower)) {
      result.disposition = "concurrence"
      result.scope = "in_part"
    } else if (/^dissenting\s+in\s+part/.test(lower)) {
      result.disposition = "dissent"
      result.scope = "in_part"
    } else if (/^dissenting\s+from\s+denial\s+of/.test(lower)) {
      result.disposition = "dissent"
      result.scope = "from_denial"
    } else if (/^concurring/.test(lower)) {
      result.disposition = "concurrence"
    } else if (/^dissenting/.test(lower)) {
      result.disposition = "dissent"
    } else if (/^joining/.test(lower)) {
      result.disposition = "majority"
    }
    return result
  }

  if (/^plurality\s+opinion\b/i.test(content.trim())) {
    result.disposition = "plurality opinion"
    clearCourtIfDisposition(result, "plurality opinion")
    return result
  }
  if (/^mem\.\s*$/i.test(content.trim())) {
    result.disposition = "mem."
    clearCourtIfDisposition(result, "mem.")
    return result
  }
  if (/^unpublished\s+table\s+decision\b/i.test(content.trim())) {
    result.disposition = "unpublished table decision"
    clearCourtIfDisposition(result, "unpublished table decision")
    return result
  }

  if (/\ben banc\b\s*$/i.test(content.trim())) {
    result.disposition = "en banc"
    clearCourtIfDisposition(result, "en banc")
  } else if (/\bin bank\b\s*$/i.test(content.trim())) {
    result.disposition = "in bank"
    clearCourtIfDisposition(result, "in bank")
  } else if (/\bper curiam\b\s*$/i.test(content.trim())) {
    result.disposition = "per curiam"
    clearCourtIfDisposition(result, "per curiam")
  }

  return result
}

function clearCourtIfDisposition(
  result: { court?: string; courtStart?: number; courtEnd?: number },
  disposition: string,
): void {
  if (!result.court) return
  const normalized = result.court.trim().toLowerCase()
  if (normalized === disposition.toLowerCase()) {
    result.court = undefined
    result.courtStart = undefined
    result.courtEnd = undefined
  }
}

export function classifyCaseParenthetical(raw: {
  text: string
  span: RawSpan
}): ParentheticalNode {
  const leadingMatch = LEADING_WORD_REGEX.exec(raw.text)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) {
      return {
        kind: "explanatory",
        text: raw.text,
        type: candidate,
        span: raw.span,
      }
    }
  }

  if (isNonMetadataParenContent(raw.text)) {
    return {
      kind: "explanatory",
      text: raw.text,
      type: "other",
      span: raw.span,
    }
  }

  const meta = parseParenthetical(raw.text)
  if (meta.year || meta.date || meta.disposition || meta.justices) {
    return { ...meta, span: raw.span }
  }

  return {
    kind: "explanatory",
    text: raw.text,
    type: "other",
    span: raw.span,
  }
}

export function parseCaseParentheticalChain(
  text: string,
  startPos: number,
  maxLookahead = 2000,
): CaseParentheticalChain {
  const collected = collectParentheticals(text, startPos, maxLookahead)
  const nodes: CaseParentheticalNode[] = collected.parens.map((raw) =>
    classifyCaseParenthetical({
      text: raw.text,
      span: { start: raw.start, end: raw.end },
    }),
  )

  for (const { signal, nextParenIndex } of collected.signals) {
    nodes.push({
      kind: "historySignal",
      rawSignal: signal.text,
      signal: signal.normalized,
      span: { start: signal.start, end: signal.end },
      ...(nextParenIndex >= 0 ? { nextParentheticalIndex: nextParenIndex } : {}),
    })
  }

  nodes.sort((a, b) => a.span.start - b.span.start)
  const parentheticals = nodes.filter(
    (node): node is ParentheticalNode =>
      node.kind === "metadata" || node.kind === "explanatory",
  )
  const metadataParentheticals = parentheticals.filter(
    (node): node is MetadataParentheticalNode => node.kind === "metadata",
  )
  const explanatoryParentheticals = parentheticals.filter(
    (node): node is ExplanatoryParentheticalNode => node.kind === "explanatory",
  )
  const historySignals = nodes.filter(
    (node): node is HistorySignalNode => node.kind === "historySignal",
  )

  return {
    nodes,
    parentheticals,
    metadataParentheticals,
    explanatoryParentheticals,
    historySignals,
    firstParenthetical: parentheticals[0],
    lastParenthetical: parentheticals[parentheticals.length - 1],
  }
}
