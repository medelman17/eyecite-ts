import { prepare, layout as pretextLayout } from "@chenglou/pretext"
import type { DiagramLayout, DiagramNode, DiagramTheme, PositionedNode } from "./types"

const PAD_X = 24
const PAD_Y = 16
const HEADER_HEIGHT = 32
const SOURCE_GAP = 20
const BRACKET_HEIGHT = 28
const BOX_PAD_X = 8
const BOX_PAD_Y = 4
const BOX_GAP = 6
const LABEL_GAP = 4

/**
 * Measure text width using Pretext's fast arithmetic-only layout.
 * Falls back to character-width approximation if Pretext isn't available.
 */
export function measureText(text: string, font: string, fontSize: number): number {
  try {
    const prepared = prepare(text, `${fontSize}px ${font}`)
    // Layout at infinite width → single line, returns natural width
    const result = pretextLayout(prepared, 99999, fontSize * 1.2)
    // Approximate: for a single line, width ≈ height / lineHeight * avgCharWidth
    // Actually, pretext doesn't return width directly from layout().
    // Use character count * measured average width instead.
    if (text.length === 0) return 0
    // Measure a reference character to get average width
    const refPrepared = prepare("M", `${fontSize}px ${font}`)
    const refResult = pretextLayout(refPrepared, 99999, fontSize * 1.2)
    // If the reference fits in one line at a very narrow width, we can compute char width
    const narrowPrepared = prepare(text, `${fontSize}px ${font}`)
    const narrowResult = pretextLayout(narrowPrepared, 1, fontSize * 1.2)
    // lineCount at width=1 tells us ~how many graphemes (each on its own line)
    if (narrowResult.lineCount > 0 && result.lineCount === 1) {
      // Total height at width=1 / lineHeight = char count, so width ≈ height_at_1 / lineHeight * (lineHeight)...
      // Actually let's use a simpler approach: binary search for minimum width that gives 1 line
      return binarySearchWidth(text, font, fontSize)
    }
    return text.length * fontSize * 0.6
  } catch {
    // Fallback: character-width approximation
    return text.length * fontSize * 0.6
  }
}

/** Binary search for the minimum width that fits text on one line */
function binarySearchWidth(text: string, font: string, fontSize: number): number {
  const prepared = prepare(text, `${fontSize}px ${font}`)
  const lineHeight = fontSize * 1.2
  let lo = 1
  let hi = text.length * fontSize * 1.5
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const result = pretextLayout(prepared, mid, lineHeight)
    if (result.lineCount <= 1) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return Math.ceil(hi)
}

/**
 * Compute layout positions for all component nodes.
 */
export function computeLayout(
  tree: DiagramNode,
  theme: DiagramTheme,
  maxWidth = 720,
): DiagramLayout {
  const children = tree.children ?? []
  if (children.length === 0) {
    return {
      nodes: [],
      totalWidth: maxWidth,
      totalHeight: 120,
      sourceTextY: HEADER_HEIGHT + PAD_Y + SOURCE_GAP,
      bracketRowY: HEADER_HEIGHT + PAD_Y + SOURCE_GAP + theme.fontSize + 8,
      boxRowY: HEADER_HEIGHT + PAD_Y + SOURCE_GAP + theme.fontSize + 8 + BRACKET_HEIGHT,
      labelRowY: HEADER_HEIGHT + PAD_Y + SOURCE_GAP + theme.fontSize + 8 + BRACKET_HEIGHT + 40,
    }
  }

  // Measure source text width
  const sourceText = tree.value
  const sourceFont = extractFontName(theme.fontFamily)
  const sourceWidth = measureText(sourceText, sourceFont, theme.fontSize)
  const charWidth = sourceText.length > 0 ? sourceWidth / sourceText.length : theme.fontSize * 0.6

  // Layout rows
  const sourceTextY = HEADER_HEIGHT + PAD_Y + SOURCE_GAP
  const bracketRowY = sourceTextY + theme.fontSize + 12
  const boxRowY = bracketRowY + BRACKET_HEIGHT
  const boxHeight = theme.fontSize + BOX_PAD_Y * 2 + theme.labelFontSize + 4
  const labelRowY = boxRowY + boxHeight + LABEL_GAP

  // Position each child as a box
  const monoFont = extractFontName(theme.monoFontFamily)
  const positioned: PositionedNode[] = []
  let boxX = PAD_X

  for (const child of children) {
    // Measure the value text width for the box
    const isIdentity = child.category === "identity"
    const font = isIdentity ? sourceFont : monoFont
    const valueWidth = measureText(child.value, font, theme.fontSize)
    const labelWidth = measureText(child.displayLabel, monoFont, theme.labelFontSize)
    const width = Math.max(valueWidth, labelWidth) + BOX_PAD_X * 2

    // Source text underline position (based on character positions)
    const sourceX = PAD_X + child.charStart * charWidth
    const sourceW = (child.charEnd - child.charStart) * charWidth

    positioned.push({
      node: child,
      x: boxX,
      y: boxRowY,
      width,
      height: boxHeight,
      sourceX,
      sourceWidth: Math.max(sourceW, 4),
    })

    boxX += width + BOX_GAP
  }

  // Center boxes under their source text positions if there's room
  // Reflow: if boxes exceed maxWidth, keep them as-is (left-to-right)
  const totalBoxWidth = boxX - BOX_GAP + PAD_X
  const contentWidth = Math.max(sourceWidth + PAD_X * 2, totalBoxWidth, 400)
  const totalWidth = Math.min(contentWidth, maxWidth)
  const totalHeight = labelRowY + theme.labelFontSize + PAD_Y

  return {
    nodes: positioned,
    totalWidth,
    totalHeight,
    sourceTextY,
    bracketRowY,
    boxRowY,
    labelRowY,
  }
}

/** Extract the first font name from a CSS font-family string */
function extractFontName(fontFamily: string): string {
  const first = fontFamily.split(",")[0].trim()
  return first.replace(/['"]/g, "")
}
