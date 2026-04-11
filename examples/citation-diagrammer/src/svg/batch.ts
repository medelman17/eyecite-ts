import type { Citation } from "eyecite-ts"
import { decompose } from "../decompose"
import { computeLayout } from "../layout"
import type { DiagramTheme } from "../types"
import { generateAnimationStyles, generateDefs } from "./animations"
import { escapeXml } from "./components"
import { renderTreeToSvg } from "./render"

interface ResolutionEdge {
  fromIndex: number
  toIndex: number
  type: string
  label: string
}

/**
 * Render multiple citations as a stacked SVG with resolution connectors.
 * Shows Id. → antecedent, supra → full cite, short-form → full cite links.
 */
export function renderBatchDiagram(
  citations: Citation[],
  theme: DiagramTheme,
  spacing = 24,
): string {
  if (citations.length === 0) return ""
  if (citations.length === 1) {
    return renderTreeToSvg(decompose(citations[0]), computeLayout(decompose(citations[0]), theme), theme)
  }

  // Decompose and layout each citation
  const entries = citations.map((c) => {
    const tree = decompose(c)
    const layout = computeLayout(tree, theme)
    return { citation: c, tree, layout }
  })

  // Compute total dimensions
  const CONNECTOR_MARGIN = 60
  const maxWidth = Math.max(...entries.map((e) => e.layout.totalWidth)) + CONNECTOR_MARGIN
  let totalHeight = 0
  const yOffsets: number[] = []

  for (const entry of entries) {
    yOffsets.push(totalHeight)
    totalHeight += entry.layout.totalHeight + spacing
  }
  totalHeight -= spacing // Remove trailing spacing

  // Find resolution edges
  const edges = findResolutionEdges(citations)

  // Build SVG
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxWidth} ${totalHeight}" width="${maxWidth}" height="${totalHeight}">`,
  )
  parts.push(generateAnimationStyles(theme))
  parts.push(generateDefs(theme))
  parts.push(`<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`)

  // Render each citation in its own translated group
  for (let i = 0; i < entries.length; i++) {
    const { tree, layout } = entries[i]
    const yOff = yOffsets[i]

    // Re-render the individual diagram SVG as an inner group
    parts.push(`<g transform="translate(${CONNECTOR_MARGIN}, ${yOff})">`)
    // Inline the individual diagram content (without outer SVG wrapper)
    const innerSvg = renderTreeToSvg(tree, layout, theme)
    // Strip outer <svg> and </svg> tags to embed as group content
    const inner = innerSvg
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "")
      .replace(/<style>[\s\S]*?<\/style>/, "") // Remove duplicate styles
      .replace(/<defs>[\s\S]*?<\/defs>/, "") // Remove duplicate defs
    parts.push(inner)
    parts.push("</g>")
  }

  // Draw resolution connectors on the left margin
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    const fromY = yOffsets[edge.fromIndex] + entries[edge.fromIndex].layout.totalHeight / 2
    const toY = yOffsets[edge.toIndex] + entries[edge.toIndex].layout.totalHeight / 2
    const delay = 1100 + i * 100

    // Curved Bézier connector on the left
    const midX = 20
    const ctrlOffset = Math.abs(fromY - toY) * 0.3
    const d = `M ${CONNECTOR_MARGIN - 8} ${fromY} C ${midX} ${fromY - ctrlOffset}, ${midX} ${toY + ctrlOffset}, ${CONNECTOR_MARGIN - 8} ${toY}`
    const pathLen = Math.abs(fromY - toY) * 2 + 40

    const connectorColor = getEdgeColor(edge.type, theme)

    parts.push(`<g class="dc-resolution-edge" style="animation-delay:${delay}ms; opacity:0;">
      <path d="${d}" fill="none" stroke="${connectorColor}" stroke-width="1.5"
            stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}"
            marker-end="url(#arrowhead)">
        <animate attributeName="stroke-dashoffset" from="${pathLen}" to="0"
                 dur="0.5s" begin="${delay}ms" fill="freeze"
                 calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
      </path>
      <text x="${midX - 2}" y="${(fromY + toY) / 2 + 3}" text-anchor="middle"
            fill="${connectorColor}" font-size="9" font-style="italic"
            font-family="system-ui, sans-serif"
            transform="rotate(-90, ${midX - 2}, ${(fromY + toY) / 2})"
            opacity="0">
        ${escapeXml(edge.label)}
        <animate attributeName="opacity" from="0" to="0.8"
                 dur="0.2s" begin="${delay + 400}ms" fill="freeze"/>
      </text>
      <animate attributeName="opacity" from="0" to="1"
               dur="0.01s" begin="${delay}ms" fill="freeze"/>
    </g>`)
  }

  parts.push("</svg>")
  return parts.join("\n")
}

/** Detect resolution relationships between citations */
function findResolutionEdges(citations: Citation[]): ResolutionEdge[] {
  const edges: ResolutionEdge[] = []

  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]

    if (c.type === "id") {
      // Id. resolves to the immediately preceding full citation
      const prevFull = findPrecedingFullCitation(citations, i)
      if (prevFull >= 0) {
        edges.push({ fromIndex: i, toIndex: prevFull, type: "id", label: "Id." })
      }
    } else if (c.type === "supra") {
      // Supra resolves to the first matching full citation by party name
      if (c.partyName) {
        const target = findFullCiteByPartyName(citations, c.partyName, i)
        if (target >= 0) {
          edges.push({ fromIndex: i, toIndex: target, type: "supra", label: "supra" })
        }
      }
    } else if (c.type === "shortFormCase") {
      // Short form resolves to matching full citation by reporter
      const target = findFullCiteByReporter(citations, c.volume, c.reporter, i)
      if (target >= 0) {
        edges.push({ fromIndex: i, toIndex: target, type: "shortForm", label: "short form" })
      }
    }
  }

  return edges
}

function findPrecedingFullCitation(citations: Citation[], fromIndex: number): number {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const c = citations[i]
    if (c.type !== "id" && c.type !== "supra" && c.type !== "shortFormCase") {
      return i
    }
  }
  return -1
}

function findFullCiteByPartyName(citations: Citation[], partyName: string, beforeIndex: number): number {
  const needle = partyName.toLowerCase()
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const c = citations[i]
    if (c.type === "case" && c.caseName) {
      if (c.caseName.toLowerCase().includes(needle)) return i
      if (c.plaintiffNormalized?.includes(needle)) return i
      if (c.defendantNormalized?.includes(needle)) return i
    }
  }
  return -1
}

function findFullCiteByReporter(
  citations: Citation[],
  volume: number | string,
  reporter: string,
  beforeIndex: number,
): number {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const c = citations[i]
    if (c.type === "case" && String(c.volume) === String(volume) && c.reporter === reporter) {
      return i
    }
  }
  return -1
}

function getEdgeColor(type: string, theme: DiagramTheme): string {
  switch (type) {
    case "id":
      return theme.colors.marker.stroke
    case "supra":
      return theme.colors.identity.stroke
    case "shortForm":
      return theme.colors.locator.stroke
    default:
      return theme.connectorColor
  }
}
