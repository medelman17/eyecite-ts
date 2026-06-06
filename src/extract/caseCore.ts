import type { Token } from "@/tokenize"
import type { CaseComponentSpans } from "@/types/componentSpans"
import { spanFromGroupIndex, type TransformationMap } from "@/types/span"

export interface ParseCaseCitationCoreInput {
  token: Token
  transformationMap: TransformationMap
}

export interface CaseCitationCoreSyntax {
  volume: number | string
  reporter: string
  page?: number
  nominativeVolume?: number
  nominativeReporter?: string
  hasBlankPage?: true
  spans: Pick<CaseComponentSpans, "volume" | "reporter" | "page">
}

/** Parse a volume string as number when purely numeric, string when hyphenated. */
function parseVolume(raw: string): number | string {
  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10)
  }
  return raw
}

/** Matches volume-reporter-page format in citation core, with optional nominative reporter. */
const VOLUME_REPORTER_PAGE_REGEX =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s'&]+)\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+-\d+|\d+|_{3,}|-{3,})(?=$|[\s.;,)\]])/d

/** Comma-form variant for old typesetting shape `<vol> <Reporter>, <page>` (#570). */
const VOLUME_REPORTER_PAGE_REGEX_COMMA =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s'&]+?)\s*,\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+-\d+|\d+|_{3,}|-{3,})(?=$|[.;)\]])/d

/** Detects blank page placeholders (3+ underscores or dashes). */
const BLANK_PAGE_REGEX = /^[_-]{3,}$/

export function parseCaseCitationCore({
  token,
  transformationMap,
}: ParseCaseCitationCoreInput): CaseCitationCoreSyntax {
  const { text, span } = token
  const match =
    VOLUME_REPORTER_PAGE_REGEX.exec(text) ??
    VOLUME_REPORTER_PAGE_REGEX_COMMA.exec(text)

  if (!match) {
    throw new Error(`Failed to parse case citation: ${text}`)
  }

  const volume = parseVolume(match[1])
  const reporter = match[2].trim()
  const nominativeVolume = match[3] ? Number.parseInt(match[3], 10) : undefined
  const nominativeReporter = match[4] || undefined
  const pageStr = match[5]
  const isBlankPage = BLANK_PAGE_REGEX.test(pageStr)
  const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
  const spans: Pick<CaseComponentSpans, "volume" | "reporter" | "page"> = {}

  if (match.indices) {
    if (match.indices[1]) {
      spans.volume = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    }
    if (match.indices[2]) {
      const [reporterStart, reporterEnd] = match.indices[2]
      const rawReporter = text.substring(reporterStart, reporterEnd)
      const leadTrim = rawReporter.length - rawReporter.trimStart().length
      const trailTrim = rawReporter.length - rawReporter.trimEnd().length
      spans.reporter = spanFromGroupIndex(
        span.cleanStart,
        [reporterStart + leadTrim, reporterEnd - trailTrim],
        transformationMap,
      )
    }
    if (match.indices[5]) {
      spans.page = spanFromGroupIndex(span.cleanStart, match.indices[5], transformationMap)
    }
  }

  return {
    volume,
    reporter,
    ...(page !== undefined ? { page } : {}),
    ...(nominativeVolume !== undefined ? { nominativeVolume } : {}),
    ...(nominativeReporter !== undefined ? { nominativeReporter } : {}),
    ...(isBlankPage ? { hasBlankPage: true as const } : {}),
    spans,
  }
}
