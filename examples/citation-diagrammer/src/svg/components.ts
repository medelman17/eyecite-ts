import type { CategoryColors, DiagramTheme } from "../types"

/** Escape text for safe SVG/XML insertion */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Render a rounded pill badge (e.g., citation type label) */
export function renderPill(
  x: number,
  y: number,
  text: string,
  fillColor: string,
  textColor: string,
  fontSize: number,
  animDelay: number,
): string {
  const width = text.length * fontSize * 0.65 + 16
  const height = fontSize + 8
  return `<g class="dc-badge" style="animation-delay:${animDelay}ms">
    <rect x="${x}" y="${y}" width="${width}" height="${height}"
          rx="${height / 2}" fill="${fillColor}" stroke="${textColor}" stroke-width="1.5"/>
    <text x="${x + width / 2}" y="${y + height / 2 + fontSize * 0.35}"
          text-anchor="middle" fill="${textColor}"
          font-size="${fontSize}" font-weight="600"
          font-family="system-ui, sans-serif">${escapeXml(text)}</text>
  </g>`
}

/** Render the 5-dot confidence meter */
export function renderConfidenceMeter(
  x: number,
  y: number,
  confidence: number,
  theme: DiagramTheme,
): string {
  const dotCount = 5
  const dotR = 4
  const dotGap = 12
  const filled = Math.round(confidence * dotCount)

  let dots = ""
  for (let i = 0; i < dotCount; i++) {
    const cx = x + i * dotGap
    const cy = y
    const isFilled = i < filled
    const fillColor = isFilled ? theme.colors.locator.stroke : "transparent"
    const strokeColor = isFilled ? theme.colors.locator.stroke : theme.connectorColor
    const delay = 100 + i * 50

    dots += `<circle class="dc-conf-dot" cx="${cx}" cy="${cy}" r="${dotR}"
                     fill="${isFilled ? "transparent" : "transparent"}"
                     stroke="${strokeColor}" stroke-width="1.5">
      ${isFilled ? `<animate attributeName="fill" from="transparent" to="${fillColor}" dur="0.2s" begin="${delay}ms" fill="freeze"/>` : ""}
    </circle>\n`
  }

  // Confidence text
  const textX = x + dotCount * dotGap + 8
  dots += `<text x="${textX}" y="${y + 4}" fill="${theme.connectorColor}"
                 font-size="11" font-family="system-ui, sans-serif"
                 class="dc-badge" style="animation-delay:200ms">
    ${confidence.toFixed(2)}
  </text>`

  return `<g class="dc-confidence">${dots}</g>`
}

/** Render a colored underline segment in the source text row */
export function renderSourceUnderline(
  x: number,
  y: number,
  width: number,
  colors: CategoryColors,
  index: number,
  nodeId: string,
): string {
  const delay = 350 + index * 40
  const dashLen = Math.max(width, 1)
  return `<line class="dc-source-underline" id="ul-${nodeId}"
               x1="${x}" y1="${y}" x2="${x + width}" y2="${y}"
               stroke="${colors.stroke}" stroke-width="2.5" stroke-linecap="round"
               stroke-dasharray="${dashLen}" stroke-dashoffset="${dashLen}">
    <animate attributeName="stroke-dashoffset" from="${dashLen}" to="0"
             dur="0.3s" begin="${delay}ms" fill="freeze"
             calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  </line>`
}

/** Render a bracket line from source text down to component box */
export function renderBracket(
  sourceX: number,
  sourceY: number,
  boxX: number,
  boxY: number,
  colors: CategoryColors,
  index: number,
  nodeId: string,
): string {
  const delay = 550 + index * 30
  // Draw a path: vertical from source down, then angled to box center
  const midY = sourceY + (boxY - sourceY) * 0.4
  const d = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${boxX} ${boxY}`
  const pathLen = Math.abs(boxY - sourceY) + Math.abs(boxX - sourceX) + 10

  return `<path class="dc-bracket" id="br-${nodeId}"
               d="${d}" fill="none"
               stroke="${colors.stroke}" stroke-width="1" stroke-opacity="0.5"
               stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}">
    <animate attributeName="stroke-dashoffset" from="${pathLen}" to="0"
             dur="0.35s" begin="${delay}ms" fill="freeze"
             calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  </path>`
}

/** Render a component box with value and label */
export function renderComponentBox(
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  displayLabel: string,
  colors: CategoryColors,
  glowColor: string,
  theme: DiagramTheme,
  index: number,
  nodeId: string,
  isInferred: boolean,
  confidence?: number,
): string {
  const delay = 700 + index * 50
  const labelY = y - 4
  const valueY = y + height / 2 + theme.fontSize * 0.35 - theme.labelFontSize / 2
  const dash = isInferred ? ' stroke-dasharray="4 2"' : ""
  const opacity = confidence !== undefined && confidence < 0.5 ? ' class="dc-low-confidence"' : ""
  const isIdentity = nodeId.includes("plaintiff") || nodeId.includes("defendant") || nodeId.includes("caseName") || nodeId.includes("partyName")
  const fontFamily = isIdentity ? theme.fontFamily : theme.monoFontFamily

  return `<g class="dc-node dc-${nodeId}" id="node-${nodeId}"
             style="--glow-color:${glowColor}; animation-delay:${delay}ms"${opacity}>
    <rect x="${x}" y="${y}" width="${width}" height="${height}"
          rx="${theme.borderRadius}" fill="${colors.fill}"
          stroke="${colors.stroke}" stroke-width="1.5"${dash}/>
    <text class="dc-label" x="${x + width / 2}" y="${labelY}"
          text-anchor="middle" fill="${colors.text}"
          font-size="${theme.labelFontSize}" font-weight="600"
          font-family="system-ui, sans-serif"
          style="animation-delay:${delay + 200}ms">
      ${escapeXml(displayLabel)}
    </text>
    <text class="dc-value" x="${x + width / 2}" y="${valueY}"
          text-anchor="middle" fill="${colors.text}"
          font-size="${theme.fontSize}" font-weight="500"
          font-family='${fontFamily}'>
      ${escapeXml(value)}
    </text>
  </g>`
}

/** Render a "refines" relationship arrow between two boxes */
export function renderRelationArrow(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  label: string,
  theme: DiagramTheme,
  index: number,
): string {
  const delay = 1000 + index * 80
  const midY = Math.max(fromY, toY) + 16
  const d = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
  const pathLen = 120

  return `<g class="dc-relation" style="animation-delay:${delay}ms">
    <path d="${d}" fill="none" stroke="${theme.connectorColor}"
          stroke-width="1.5" stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}"
          marker-end="url(#arrowhead)">
      <animate attributeName="stroke-dashoffset" from="${pathLen}" to="0"
               dur="0.4s" begin="${delay}ms" fill="freeze"
               calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
    </path>
    <text x="${(fromX + toX) / 2}" y="${midY + 12}" text-anchor="middle"
          fill="${theme.connectorColor}" font-size="9"
          font-family="system-ui, sans-serif" font-style="italic"
          opacity="0">
      ${escapeXml(label)}
      <animate attributeName="opacity" from="0" to="0.7"
               dur="0.2s" begin="${delay + 300}ms" fill="freeze"/>
    </text>
  </g>`
}
