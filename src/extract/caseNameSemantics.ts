import type { CaseComponentSpans } from "@/types/componentSpans"
import {
  resolveOriginalSpan,
  type Span,
  type TransformationMap,
} from "@/types/span"
import type { StructuredDate } from "./dates"

export interface CaseNameScanResult {
  caseName: string
  nameStart: number
  year?: number
  yearStart?: number
  yearEnd?: number
  precedingDocketMeta?: {
    court: string
    year: number
    date: StructuredDate
  }
}

export interface InterpretCaseNameScanInput {
  caseNameResult: CaseNameScanResult
  tokenSpan: {
    cleanStart: number
    cleanEnd: number
  }
  postfixLastParentheticalEnd?: number
  year?: number
  court?: string
  date?: StructuredDate
  hasExistingYearSpan?: boolean
  transformationMap: TransformationMap
}

export interface CaseNameSemantics {
  caseName: string
  year?: number
  court?: string
  date?: StructuredDate
  fullSpan: Span
  spans: Pick<CaseComponentSpans, "caseName" | "year">
}

const TRAILING_YEAR_PAREN_REGEX = /\s*\((?:[^()]*\s)?\d{4}\)\s*$/
const TRAILING_PARALLEL_CITE_START_REGEX = /,\s+\d+\s+[A-Z][A-Za-z.&'\d\s]*\d+\s*$/
const TRAILING_NEUTRAL_CITE_START_REGEX = /,\s+\d{4}\s+[A-Z]+\s+\d+\s*$/
const OLD_STYLE_COURT_DATE_REGEX =
  /,\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:Cir|App|Ct|Dist|Cir\.\s+App)\.,\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+(\d{4})\s*$/
const OLD_STYLE_BARE_YEAR_REGEX = /,\s+((?:17|18|19|20)\d{2})\s*$/

function resolveFullSpan(
  cleanStart: number,
  cleanEnd: number,
  transformationMap: TransformationMap,
): Span {
  return {
    cleanStart,
    cleanEnd,
    originalStart: transformationMap.cleanToOriginal.get(cleanStart) ?? cleanStart,
    originalEnd: transformationMap.cleanToOriginal.get(cleanEnd) ?? cleanEnd,
  }
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

function stripAbsorbedTrailingSyntax(caseName: string): {
  caseName: string
  oldStyleYear?: number
} {
  const stripped = caseName
    .replace(TRAILING_YEAR_PAREN_REGEX, "")
    .trim()
    .replace(TRAILING_PARALLEL_CITE_START_REGEX, "")
    .trim()
    .replace(TRAILING_NEUTRAL_CITE_START_REGEX, "")
    .trim()

  const courtDateMatch = OLD_STYLE_COURT_DATE_REGEX.exec(stripped)
  if (courtDateMatch) {
    return {
      caseName: stripped.replace(OLD_STYLE_COURT_DATE_REGEX, "").trim(),
      oldStyleYear: Number.parseInt(courtDateMatch[1], 10),
    }
  }

  const bareYearMatch = OLD_STYLE_BARE_YEAR_REGEX.exec(stripped)
  if (bareYearMatch) {
    return {
      caseName: stripped.replace(OLD_STYLE_BARE_YEAR_REGEX, "").trim(),
      oldStyleYear: Number.parseInt(bareYearMatch[1], 10),
    }
  }

  return { caseName: stripped }
}

export function interpretCaseNameScan(
  input: InterpretCaseNameScanInput,
): CaseNameSemantics {
  const stripped = stripAbsorbedTrailingSyntax(input.caseNameResult.caseName)
  const fullSpan = resolveFullSpan(
    input.caseNameResult.nameStart,
    input.postfixLastParentheticalEnd ?? input.tokenSpan.cleanEnd,
    input.transformationMap,
  )
  const spans: Pick<CaseComponentSpans, "caseName" | "year"> = {
    caseName: resolveCleanSpan(
      input.caseNameResult.nameStart,
      input.caseNameResult.nameStart + stripped.caseName.length,
      input.transformationMap,
    ),
  }

  let year = input.year
  let court = input.court
  let date = input.date

  if (stripped.oldStyleYear !== undefined && year === undefined) {
    year = stripped.oldStyleYear
  }

  if (input.caseNameResult.year !== undefined && year === undefined) {
    year = input.caseNameResult.year
    if (
      input.caseNameResult.yearStart !== undefined &&
      input.caseNameResult.yearEnd !== undefined &&
      !input.hasExistingYearSpan
    ) {
      spans.year = resolveCleanSpan(
        input.caseNameResult.yearStart,
        input.caseNameResult.yearEnd,
        input.transformationMap,
      )
    }
  }

  const docketMeta = input.caseNameResult.precedingDocketMeta
  if (docketMeta) {
    if (year === undefined) year = docketMeta.year
    if (court === undefined) court = docketMeta.court
    if (date === undefined) date = docketMeta.date
  }

  return {
    caseName: stripped.caseName,
    ...(year !== undefined ? { year } : {}),
    ...(court !== undefined ? { court } : {}),
    ...(date !== undefined ? { date } : {}),
    fullSpan,
    spans,
  }
}
