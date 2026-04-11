import type { Span } from "eyecite-ts"

/** Category determines color/styling for each component */
export type ComponentCategory =
  | "signal"
  | "identity"
  | "locator"
  | "reference"
  | "metadata"
  | "context"
  | "marker"

/** A single labeled component in the citation diagram tree */
export interface DiagramNode {
  /** Semantic label: "volume", "reporter", "page", "plaintiff", etc. */
  label: string
  /** Display label for rendering: "Vol.", "Rptr.", "Pg." */
  displayLabel: string
  /** The actual text value from the citation */
  value: string
  /** Category for color-coding */
  category: ComponentCategory
  /** Whether this field was found in the text or synthesized */
  presence: "present" | "inferred"
  /** Confidence for this component (0-1) */
  confidence?: number
  /** Character range within the citation's matchedText */
  charStart: number
  charEnd: number
  /** Original document Span if available from componentSpans */
  documentSpan?: Span
  /** Child nodes (e.g., caseName → [plaintiff, "v.", defendant]) */
  children?: DiagramNode[]
  /** Relationship to another citation (batch mode) */
  relation?: DiagramRelation
}

/** Relationship between a diagram node and another citation */
export interface DiagramRelation {
  type: "refines" | "resolves" | "parallels" | "history"
  targetIndex?: number
  description?: string
}

/** Color palette entry for a category */
export interface CategoryColors {
  fill: string
  stroke: string
  text: string
  glow: string
}

/** Complete visual theme */
export interface DiagramTheme {
  name: string
  background: string
  foreground: string
  fontFamily: string
  monoFontFamily: string
  fontSize: number
  labelFontSize: number
  borderRadius: number
  colors: Record<ComponentCategory, CategoryColors>
  connectorColor: string
}

/** Positioned node after layout */
export interface PositionedNode {
  node: DiagramNode
  x: number
  y: number
  width: number
  height: number
  /** X position of the underline in the source text row */
  sourceX: number
  sourceWidth: number
}

/** Layout result for a single citation diagram */
export interface DiagramLayout {
  nodes: PositionedNode[]
  totalWidth: number
  totalHeight: number
  sourceTextY: number
  bracketRowY: number
  boxRowY: number
  labelRowY: number
}
