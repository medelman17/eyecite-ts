import { extractCitations } from "eyecite-ts"
import { renderBatchDiagram } from "./svg/batch"
import { renderDiagram } from "./svg/render"
import { LEGAL_CLASSIC } from "./theme"

const SAMPLE_TEXTS: Record<string, string> = {
  scotus:
    'In Brown v. Board of Education, 347 U.S. 483 (1954), the Court held that "separate educational facilities are inherently unequal." Id. at 495.',
  complex:
    "See Smith v. Doe, 550 U.S. 544, 570 (2007) (holding that due process requires notice).",
  multi:
    "The Court in Monell v. Dep't of Soc. Servs., 436 U.S. 658 (1978), established municipal liability under 42 U.S.C. \u00A7 1983. Id. at 690. See also Twombly, 550 U.S. at 570.",
  statute:
    "U.S. Const. amend. XIV, \u00A7 1; 42 U.S.C. \u00A7 1983; Pub. L. No. 116-283.",
}

function init(): void {
  const input = document.getElementById("citation-input") as HTMLTextAreaElement
  const btn = document.getElementById("diagram-btn") as HTMLButtonElement
  const sampleSelect = document.getElementById("sample-select") as HTMLSelectElement
  const output = document.getElementById("output-section") as HTMLElement

  btn.addEventListener("click", () => diagram(input.value, output))

  sampleSelect.addEventListener("change", () => {
    const key = sampleSelect.value
    if (key && SAMPLE_TEXTS[key]) {
      input.value = SAMPLE_TEXTS[key]
      diagram(input.value, output)
    }
  })

  // Keyboard shortcut: Ctrl/Cmd+Enter to diagram
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      diagram(input.value, output)
    }
  })
}

function diagram(text: string, output: HTMLElement): void {
  if (!text.trim()) {
    output.innerHTML = '<p class="output-placeholder">Enter text above and click Diagram</p>'
    return
  }

  const citations = extractCitations(text)

  if (citations.length === 0) {
    output.innerHTML = '<p class="output-placeholder">No citations found in the input text</p>'
    return
  }

  output.innerHTML = ""

  // Stats bar
  const stats = document.createElement("div")
  stats.className = "stats-bar"
  stats.textContent = `Found ${citations.length} citation${citations.length === 1 ? "" : "s"}`
  output.appendChild(stats)

  if (citations.length > 1) {
    // Batch mode: show individual diagrams + combined batch with connectors
    const batchHeader = document.createElement("h3")
    batchHeader.className = "section-header"
    batchHeader.textContent = "Document Overview (with resolution links)"
    output.appendChild(batchHeader)

    const batchSvg = renderBatchDiagram(citations, LEGAL_CLASSIC)
    const batchContainer = document.createElement("div")
    batchContainer.className = "diagram-container batch-container"
    batchContainer.innerHTML = batchSvg
    output.appendChild(batchContainer)

    const individualHeader = document.createElement("h3")
    individualHeader.className = "section-header"
    individualHeader.textContent = "Individual Diagrams"
    output.appendChild(individualHeader)
  }

  // Render each citation individually
  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i]
    const svg = renderDiagram(citation, LEGAL_CLASSIC)

    const container = document.createElement("div")
    container.className = "diagram-container"
    container.innerHTML = svg

    // Add citation metadata below
    const meta = document.createElement("div")
    meta.className = "citation-meta"
    meta.innerHTML = `<span class="meta-type">${citation.type}</span>
      <span class="meta-confidence">confidence: ${citation.confidence.toFixed(2)}</span>
      <span class="meta-span">span: [${citation.span.originalStart}, ${citation.span.originalEnd}]</span>`
    container.appendChild(meta)

    output.appendChild(container)
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
