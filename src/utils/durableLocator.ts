import type { Citation } from "../types/citation"
import type { Span } from "../types/span"
import { contentHash } from "./contentHash"
import { getSurroundingContext } from "./context"
import { tokenBoundedIndexes } from "./tokenBounded"
import type { DurableLocator, DurableLocatorOptions } from "./types"

/**
 * Build a durable locator for one citation against `source`.
 *
 * `source` MUST be the text matching `options.space` (default "original" — the
 * text passed to extractCitations). See {@link DurableLocatorOptions}. Throws on
 * out-of-range offsets, an empty span, or (on the original-space core-span path)
 * a slice that does not equal `citation.matchedText` — all of which indicate the
 * wrong `source` or `space`.
 */
export function toDurableLocator(
  citation: Citation,
  source: string,
  options: DurableLocatorOptions = {},
): DurableLocator {
  const space = options.space ?? "original"
  const contextLength = options.contextLength ?? 32

  // Choose the span: fullSpan (when requested AND present) else the core span.
  // `fullSpan` lives only on some union members, so guard with `in`.
  let span: Span = citation.span
  let useFull = false
  const full = "fullSpan" in citation ? citation.fullSpan : undefined
  if (options.fullSpan === true && full !== undefined) {
    span = full
    useFull = true
  }

  const start = space === "clean" ? span.cleanStart : span.originalStart
  const end = space === "clean" ? span.cleanEnd : span.originalEnd

  if (start < 0 || end > source.length || start > end) {
    throw new Error(
      `toDurableLocator: span [${start}, ${end}) is out of range for source of length ${source.length} — wrong source text or space?`,
    )
  }

  const exact = source.slice(start, end)
  if (exact.length === 0) {
    throw new Error("toDurableLocator: empty exact quote — nothing to anchor")
  }

  // matchedText is the original-text substring, so it only equals the slice on
  // the original-space core-span path. The clean path and the fullSpan path have
  // no stored equivalent to cross-check against.
  if (space === "original" && !useFull && exact !== citation.matchedText) {
    throw new Error(
      `toDurableLocator: sliced text "${exact}" does not equal citation.matchedText "${citation.matchedText}" — wrong source text or space?`,
    )
  }

  // Sentence-bounded, then clamped to contextLength. getSurroundingContext gives
  // the enclosing legal sentence (it knows "F.3d"/"U.S." periods are not
  // boundaries); we slice raw windows from `source` within those bounds.
  const sentence = getSurroundingContext(source, { start, end })
  const sentStart = sentence.span.start
  const sentEnd = sentence.span.end
  const prefix = source.slice(Math.max(sentStart, start - contextLength), start)
  const suffix = source.slice(end, Math.min(sentEnd, end + contextLength))

  const occurrence = tokenBoundedIndexes(source, exact).indexOf(start)

  return {
    v: 1,
    space,
    quote: {
      exact,
      ...(prefix.length > 0 ? { prefix } : {}),
      ...(suffix.length > 0 ? { suffix } : {}),
    },
    position: { start, end },
    ...(occurrence >= 0 ? { occurrence } : {}),
    contentHash: contentHash(exact, prefix, suffix),
  }
}

/** Build durable locators for many citations sharing one `source` + options. */
export function toDurableLocators(
  citations: Citation[],
  source: string,
  options: DurableLocatorOptions = {},
): DurableLocator[] {
  return citations.map((citation) => toDurableLocator(citation, source, options))
}
