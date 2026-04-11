import type { Citation } from "eyecite-ts"
import { decompose } from "../decompose"
import { computeLayout } from "../layout"
import type { ComponentCategory, DiagramLayout, DiagramNode, DiagramTheme, PositionedNode } from "../types"
import { generateAnimationStyles, generateDefs } from "./animations"
import {
  escapeXml,
  renderBracket,
  renderComponentBox,
  renderConfidenceMeter,
  renderPill,
  renderRelationArrow,
  renderSourceUnderline,
} from "./components"

const PAD_X = 24

/**
 * Render a single citation as an animated SVG string.
 * Self-contained: includes embedded CSS, SMIL animations, and SVG defs.
 */
export function renderDiagram(citation: Citation, theme: DiagramTheme): string {
  const tree = decompose(citation)
  const layout = computeLayout(tree, theme)
  return renderTreeToSvg(tree, layout, theme)
}

/**
 * Render a pre-decomposed tree to SVG.
 */
export function renderTreeToSvg(
  tree: DiagramNode,
  layout: DiagramLayout,
  theme: DiagramTheme,
): string {
  const { nodes, totalWidth, totalHeight, sourceTextY, bracketRowY } = layout
  const children = tree.children ?? []

  if (children.length === 0) {
    return renderEmptySvg(tree, theme)
  }

  const parts: string[] = []

  // Open SVG
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" style="font-family:${theme.fontFamily}">`,
  )

  // Embedded styles and defs
  parts.push(generateAnimationStyles(theme))
  parts.push(generateDefs(theme))

  // Background
  parts.push(
    `<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`,
  )

  // ── Header Row: Type Badge + Confidence Meter ──
  const typeName = tree.displayLabel
  const typeColors = getCategoryForType(tree.label)
  parts.push(
    renderPill(PAD_X, 12, typeName, theme.colors[typeColors].fill, theme.colors[typeColors].stroke, 11, 0),
  )

  if (tree.confidence !== undefined) {
    parts.push(renderConfidenceMeter(PAD_X + typeName.length * 11 * 0.65 + 32, 20, tree.confidence, theme))
  }

  // ── Source Text Row ──
  const sourceText = tree.value
  parts.push(
    `<text class="dc-source-text" x="${PAD_X}" y="${sourceTextY + theme.fontSize}"
           fill="${theme.foreground}" font-size="${theme.fontSize}"
           font-family='${theme.fontFamily}'>
      ${escapeXml(sourceText)}
    </text>`,
  )

  // ── Source Underlines ──
  const underlineY = sourceTextY + theme.fontSize + 6
  for (let i = 0; i < nodes.length; i++) {
    const pn = nodes[i]
    const colors = theme.colors[pn.node.category]
    const nodeId = `${pn.node.label}-${i}`
    parts.push(renderSourceUnderline(pn.sourceX, underlineY, pn.sourceWidth, colors, i, nodeId))
  }

  // ── Bracket Lines ──
  for (let i = 0; i < nodes.length; i++) {
    const pn = nodes[i]
    const colors = theme.colors[pn.node.category]
    const nodeId = `${pn.node.label}-${i}`
    const srcMidX = pn.sourceX + pn.sourceWidth / 2
    const boxMidX = pn.x + pn.width / 2

    parts.push(
      renderBracket(
        srcMidX,
        underlineY + 4,
        boxMidX,
        pn.y,
        colors,
        i,
        nodeId,
      ),
    )
  }

  // ── Component Boxes ──
  for (let i = 0; i < nodes.length; i++) {
    const pn = nodes[i]
    const colors = theme.colors[pn.node.category]
    const nodeId = `${pn.node.label}-${i}`

    parts.push(
      renderComponentBox(
        pn.x,
        pn.y,
        pn.width,
        pn.height,
        pn.node.value,
        pn.node.displayLabel,
        colors,
        colors.glow,
        theme,
        i,
        nodeId,
        pn.node.presence === "inferred",
        pn.node.confidence,
      ),
    )
  }

  // ── Relation Arrows (refines, resolves) ──
  const relationPairs = findRelationPairs(nodes)
  for (let i = 0; i < relationPairs.length; i++) {
    const { from, to, label } = relationPairs[i]
    parts.push(
      renderRelationArrow(
        from.x + from.width / 2,
        from.y + from.height,
        to.x + to.width / 2,
        to.y + to.height,
        label,
        theme,
        i,
      ),
    )
  }

  // Close SVG
  parts.push("</svg>")

  return parts.join("\n")
}

/** Find pairs of nodes that have "refines" relationships (e.g., pincite → page) */
function findRelationPairs(
  nodes: PositionedNode[],
): Array<{ from: PositionedNode; to: PositionedNode; label: string }> {
  const pairs: Array<{ from: PositionedNode; to: PositionedNode; label: string }> = []

  for (const pn of nodes) {
    if (pn.node.relation?.type === "refines") {
      // Find the "page" or "section" node that this refines
      const target = nodes.find(
        (n) =>
          n !== pn &&
          (n.node.label === "page" || n.node.label === "section") &&
          n.node.category === "locator",
      )
      if (target) {
        pairs.push({
          from: pn,
          to: target,
          label: pn.node.relation.description ?? "refines",
        })
      }
    }
  }

  return pairs
}

/** Render a minimal SVG for citations with no extractable components */
function renderEmptySvg(tree: DiagramNode, theme: DiagramTheme): string {
  const width = 400
  const height = 80
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${generateAnimationStyles(theme)}
  <rect width="100%" height="100%" fill="${theme.background}" rx="8"/>
  <text x="${width / 2}" y="45" text-anchor="middle" fill="${theme.foreground}"
        font-size="${theme.fontSize}" font-family='${theme.fontFamily}'>
    ${escapeXml(tree.value)}
  </text>
</svg>`
}

/** Map citation type names to their primary component category for badge coloring */
function getCategoryForType(typeName: string): ComponentCategory {
  const map: Record<string, ComponentCategory> = {
    case: "identity",
    statute: "locator",
    constitutional: "metadata",
    journal: "locator",
    neutral: "locator",
    publicLaw: "locator",
    federalRegister: "locator",
    statutesAtLarge: "locator",
    id: "marker",
    supra: "identity",
    shortFormCase: "locator",
  }
  return map[typeName] ?? "marker"
}
