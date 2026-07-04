import type { Token } from "@/tokenize"
import type { CaseComponentSpans } from "@/types/componentSpans"
import { spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { CitationParseError } from "./errors"
import { groupSpan, optionalGroup, requireGroup } from "./groupAccessor"

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

/** Detects blank page placeholders (3+ underscores or dashes). */
const BLANK_PAGE_REGEX = /^[_-]{3,}$/

export function parseCaseCitationCore({
  token,
  transformationMap,
}: ParseCaseCitationCoreInput): CaseCitationCoreSyntax {
  type CaseGroup =
    | "volume"
    | "reporter"
    | "page"
    | "pageComma"
    | "nominativeVolume"
    | "nominativeReporter"

  // Accept/reject gate: the case patterns guarantee volume+reporter+page when
  // they match, so absence means the tokenizer admitted a shape this extractor
  // can't parse — decline (the #881 path), preserving the old twin's
  // match/no-match behavior.
  const volumeRaw = requireGroup<CaseGroup>(token, "volume")
  const reporterRaw = requireGroup<CaseGroup>(token, "reporter")
  // The page sits in one of two alternation branches — space-form (`page`) or
  // comma-form (`pageComma`). They carry DISTINCT names because CI's Node
  // rejects duplicate named groups even across alternatives; coalesce here.
  const pageStr =
    optionalGroup<CaseGroup>(token, "page") ?? optionalGroup<CaseGroup>(token, "pageComma")
  if (pageStr === undefined) {
    throw new CitationParseError(`Failed to parse case citation page: ${token.text}`)
  }

  const volume = parseVolume(volumeRaw)
  const reporter = reporterRaw.trim()
  const nominativeVolumeRaw = optionalGroup<CaseGroup>(token, "nominativeVolume")
  const nominativeVolume = nominativeVolumeRaw ? Number.parseInt(nominativeVolumeRaw, 10) : undefined
  const nominativeReporter = optionalGroup<CaseGroup>(token, "nominativeReporter")
  const isBlankPage = BLANK_PAGE_REGEX.test(pageStr)
  const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
  const spans: Pick<CaseComponentSpans, "volume" | "reporter" | "page"> = {}

  const volumeSpan = groupSpan<CaseGroup>(token, "volume")
  if (volumeSpan) spans.volume = spanFromGroupIndex(token.span.cleanStart, volumeSpan, transformationMap)

  const reporterSpan = groupSpan<CaseGroup>(token, "reporter")
  if (reporterSpan) {
    // Residual structuring: the reporter capture can include surrounding
    // whitespace; trim it for the component span (load-bearing — the corpus
    // projection and the characterization test assert reporter spans).
    const [rStart, rEnd] = reporterSpan
    const rawReporter = token.text.substring(rStart, rEnd)
    const leadTrim = rawReporter.length - rawReporter.trimStart().length
    const trailTrim = rawReporter.length - rawReporter.trimEnd().length
    spans.reporter = spanFromGroupIndex(
      token.span.cleanStart,
      [rStart + leadTrim, rEnd - trailTrim],
      transformationMap,
    )
  }

  const pageSpan =
    groupSpan<CaseGroup>(token, "page") ?? groupSpan<CaseGroup>(token, "pageComma")
  if (pageSpan) spans.page = spanFromGroupIndex(token.span.cleanStart, pageSpan, transformationMap)

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
