/**
 * A detected footnote zone in the text.
 * Positions are in input-text (raw) coordinates.
 */
export interface FootnoteZone {
  /** Start position in input-text coordinates */
  start: number
  /** End position in input-text coordinates */
  end: number
  /** Footnote number (1, 2, 3...) */
  footnoteNumber: number
}

/**
 * Result of footnote detection — sorted by start position.
 */
export type FootnoteMap = FootnoteZone[]
