// apps/annotator/src/prefill.ts
import { extractCitations } from "eyecite-ts"
import type {
  Backref,
  Candidate,
  CitationKind,
  ContractCitation,
  DocumentPayload,
} from "./contract.js"

type AnyCitation = {
  type: string
  matchedText?: string
  span: { cleanStart: number; cleanEnd: number; originalStart: number; originalEnd: number }
  fullSpan?: { cleanStart: number; cleanEnd: number }
  plaintiff?: string
  defendant?: string
  year?: number
  resolution?: { resolvedTo?: number; confidence?: number; warnings?: string[] }
}

const BACKREF_TYPES = new Set(["id", "supra", "shortFormCase"])

function kindOf(type: string): CitationKind {
  return BACKREF_TYPES.has(type) ? (type as CitationKind) : "full"
}

/** A candidate is "buried" if its core span sits wholly inside an earlier cite's fullSpan. */
function isBuried(cand: AnyCitation, all: AnyCitation[], candIdx: number): boolean {
  for (let i = 0; i < candIdx; i++) {
    const fs = all[i].fullSpan
    if (!fs) continue
    if (fs.cleanStart <= cand.span.cleanStart && fs.cleanEnd >= cand.span.cleanEnd) return true
  }
  return false
}

export function buildDocumentPayload(
  text: string,
  meta: { id: string; source: "ocr" | "native"; court: string | null; year: number | null; caption?: string; docket?: string },
): DocumentPayload {
  const cites = extractCitations(text, { resolve: true }) as unknown as AnyCitation[]
  const id = (i: number) => `c${i}`

  const citations: ContractCitation[] = cites.map((c, i) => ({
    id: id(i),
    kind: kindOf(c.type),
    span: [c.span.originalStart, c.span.originalEnd],
    displayText: c.matchedText ?? text.slice(c.span.cleanStart, c.span.cleanEnd),
    parties:
      c.plaintiff || c.defendant ? { plaintiff: c.plaintiff, defendant: c.defendant } : undefined,
    year: c.year,
  }))

  const backrefs: Backref[] = []
  for (let i = 0; i < cites.length; i++) {
    const c = cites[i]
    if (!BACKREF_TYPES.has(c.type)) continue

    const guessIdx = c.resolution?.resolvedTo
    const guessId = guessIdx === undefined ? null : id(guessIdx)

    // Candidate universe: prior FULL citations, most-recent first.
    const candidates: Candidate[] = []
    for (let j = i - 1; j >= 0; j--) {
      if (BACKREF_TYPES.has(cites[j].type)) continue // skip prior back-refs
      candidates.push({
        citationId: id(j),
        rank: 0, // fixed below
        confidence: j === guessIdx ? c.resolution?.confidence : undefined,
        isBuriedAside: isBuried(cites[j], cites, j),
        why: j === guessIdx ? "engine pick" : "prior full citation",
      })
    }
    // Guess first, then keep reverse-document order; assign ranks.
    candidates.sort((a, b) => (a.citationId === guessId ? -1 : b.citationId === guessId ? 1 : 0))
    candidates.forEach((cand, r) => {
      cand.rank = r
    })

    backrefs.push({
      id: id(i),
      span: [c.span.originalStart, c.span.originalEnd],
      kind: c.type as Backref["kind"],
      engineGuess: guessId,
      engineConfidence: c.resolution?.confidence ?? null,
      engineWarning: c.resolution?.warnings?.[0] ?? null,
      candidates,
    })
  }

  return { ...meta, text, citations, backrefs }
}
