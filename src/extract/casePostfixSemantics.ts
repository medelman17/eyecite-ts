import type { CaseComponentSpans } from "@/types/componentSpans"
import type { Parenthetical, SubsequentHistoryEntry } from "@/types/citation"
import {
  resolveOriginalSpan,
  type Span,
  type TransformationMap,
} from "@/types/span"
import type { StructuredDate } from "./dates"
import type { PinciteInfo } from "./pincite"
import type { CaseCitationPostfix } from "./casePostfix"
import type {
  HistorySignalNode,
  MetadataParentheticalNode,
  RawSpan,
} from "./caseParentheticals"

export interface CasePostfixSemantics {
  pincite?: number
  pinciteInfo?: PinciteInfo
  unpublished: boolean
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
  justices?: string[]
  scope?: string
  parentheticals?: Parenthetical[]
  subsequentHistoryEntries?: SubsequentHistoryEntry[]
  spans: CaseComponentSpans
}

function resolveRawSpan(span: RawSpan, transformationMap: TransformationMap): Span {
  const resolved = resolveOriginalSpan(
    { cleanStart: span.start, cleanEnd: span.end },
    transformationMap,
  )
  return {
    cleanStart: span.start,
    cleanEnd: span.end,
    originalStart: resolved.originalStart,
    originalEnd: resolved.originalEnd,
  }
}

function buildInternalHistoryEntry(
  metadataParenthetical: MetadataParentheticalNode,
  transformationMap: TransformationMap,
): SubsequentHistoryEntry | undefined {
  const internalHistory = metadataParenthetical.internalHistory
  if (!internalHistory) return undefined

  const contentStart = metadataParenthetical.span.start + 1
  const sigCleanStart = contentStart + internalHistory.span.start
  const sigCleanEnd = contentStart + internalHistory.span.end
  const sigOrig = resolveOriginalSpan(
    { cleanStart: sigCleanStart, cleanEnd: sigCleanEnd },
    transformationMap,
  )

  return {
    signal: internalHistory.signal,
    rawSignal: internalHistory.rawSignal,
    signalSpan: {
      cleanStart: sigCleanStart,
      cleanEnd: sigCleanEnd,
      originalStart: sigOrig.originalStart,
      originalEnd: sigOrig.originalEnd,
    },
    order: 0,
  }
}

function buildHistoryEntry(
  node: HistorySignalNode,
  order: number,
  transformationMap: TransformationMap,
): SubsequentHistoryEntry {
  const sigOrig = resolveOriginalSpan(
    { cleanStart: node.span.start, cleanEnd: node.span.end },
    transformationMap,
  )
  return {
    signal: node.signal,
    rawSignal: node.rawSignal,
    signalSpan: {
      cleanStart: node.span.start,
      cleanEnd: node.span.end,
      originalStart: sigOrig.originalStart,
      originalEnd: sigOrig.originalEnd,
    },
    order,
  }
}

export function interpretCaseCitationPostfix(
  postfix: CaseCitationPostfix,
  transformationMap: TransformationMap,
): CasePostfixSemantics {
  const semantics: CasePostfixSemantics = {
    unpublished: postfix.unpublished,
    ...(postfix.pinciteInfo ? { pinciteInfo: postfix.pinciteInfo } : {}),
    ...(postfix.pinciteInfo?.page !== undefined ? { pincite: postfix.pinciteInfo.page } : {}),
    spans: {},
  }

  if (postfix.pinciteSpan) {
    semantics.spans.pincite = resolveRawSpan(postfix.pinciteSpan, transformationMap)
  }

  const metadataParenthetical = postfix.metadataParenthetical
  if (metadataParenthetical) {
    semantics.year = metadataParenthetical.year
    semantics.court = metadataParenthetical.court
    semantics.date = metadataParenthetical.date
    semantics.disposition = metadataParenthetical.disposition
    semantics.justices = metadataParenthetical.justices
    semantics.scope = metadataParenthetical.scope
  }

  for (const node of postfix.parentheticalsAfterPrimaryMetadata) {
    if (node.kind === "metadata") {
      if (node.court && (!semantics.court || semantics.court === semantics.disposition)) {
        semantics.court = node.court
      }
      if (node.year && !semantics.year) {
        semantics.year = node.year
        semantics.date = node.date
      }
      if (node.disposition && !semantics.disposition) {
        semantics.disposition = node.disposition
      }
      if (node.justices && !semantics.justices) {
        semantics.justices = node.justices
      }
      if (node.scope && !semantics.scope) {
        semantics.scope = node.scope
      }
      continue
    }

    semantics.parentheticals ??= []
    semantics.parentheticals.push({
      text: node.text,
      type: node.type,
      span: resolveRawSpan(node.span, transformationMap),
    })
  }

  if (metadataParenthetical && (semantics.court || semantics.year)) {
    semantics.spans.metadataParenthetical = resolveRawSpan(
      metadataParenthetical.span,
      transformationMap,
    )

    const contentStart = metadataParenthetical.span.start + 1
    if (
      metadataParenthetical.courtStart !== undefined &&
      metadataParenthetical.courtEnd !== undefined
    ) {
      semantics.spans.court = resolveRawSpan(
        {
          start: contentStart + metadataParenthetical.courtStart,
          end: contentStart + metadataParenthetical.courtEnd,
        },
        transformationMap,
      )
    }
    if (
      metadataParenthetical.yearStart !== undefined &&
      metadataParenthetical.yearEnd !== undefined
    ) {
      semantics.spans.year = resolveRawSpan(
        {
          start: contentStart + metadataParenthetical.yearStart,
          end: contentStart + metadataParenthetical.yearEnd,
        },
        transformationMap,
      )
    }
  }

  const internalHistory = metadataParenthetical
    ? buildInternalHistoryEntry(metadataParenthetical, transformationMap)
    : undefined
  if (internalHistory) {
    semantics.subsequentHistoryEntries = [internalHistory]
  }

  for (const node of postfix.parentheticalChain.historySignals) {
    semantics.subsequentHistoryEntries ??= []
    semantics.subsequentHistoryEntries.push(
      buildHistoryEntry(node, semantics.subsequentHistoryEntries.length, transformationMap),
    )
  }

  return semantics
}
