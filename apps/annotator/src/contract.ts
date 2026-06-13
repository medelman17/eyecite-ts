// apps/annotator/src/contract.ts
export type CitationKind = "full" | "id" | "supra" | "shortFormCase"

export interface ContractCitation {
  id: string // stable within a document, e.g. `c${index}`
  kind: CitationKind
  span: [number, number] // [start, end) in the document text
  displayText: string
  parties?: { plaintiff?: string; defendant?: string }
  year?: number
}

export interface Candidate {
  citationId: string // refers to a "full" ContractCitation
  rank: number // 0 = the engine's pick, then ascending
  confidence?: number // engine confidence for the pick; undefined for others
  isBuriedAside: boolean // candidate sits inside another cite's parenthetical
  why: string // short human-readable reason ("engine pick", "prior full cite", "buried in (quoting …)")
}

export interface Backref {
  id: string // = the back-reference's ContractCitation id
  span: [number, number]
  kind: "id" | "supra" | "shortFormCase"
  engineGuess: string | null // citationId, or null when the engine abstained
  engineConfidence: number | null
  engineWarning: string | null
  candidates: Candidate[]
}

export interface DocumentPayload {
  id: string
  source: "ocr" | "native"
  court: string | null
  year: number | null
  caption?: string
  docket?: string
  text: string
  citations: ContractCitation[]
  backrefs: Backref[]
}

export interface Label {
  documentId: string
  backrefId: string
  decision:
    | { type: "antecedent"; citationId: string }
    | { type: "abstain" }
    | { type: "ambiguous"; citationIds: string[] }
    | { type: "flag" }
  annotatorId: string
  agreedWithEngine: boolean
  note?: string
  createdAt?: string
}

export interface BatchSummary {
  id: string
  name: string
  mode: "single" | "double"
  docCount: number
  backrefCount: number
  labeled: number
  reviewers: string[]
  kappa: number | null
  disagreements: number
  flagged: number
  status: string
  mix: { confirm: number; correct: number; abstain: number; ambiguous: number; flag: number }
}

export interface NextItem {
  document: DocumentPayload
  backref: Backref
}

export interface ReviewerLabelRef {
  annotatorId: string
  decision: Label["decision"]
  agreedWithEngine: boolean
  note?: string
}

export interface GoldDecision {
  type: "antecedent" | "abstain" | "ambiguous" | "none"
  citationId?: string
  citationIds?: string[]
  rationale?: string
  by: string
  at: string
}

export interface AdjudicationItem {
  id: string
  documentId: string
  backrefId: string
  reason: "disagreement" | "flag"
  reviewers: ReviewerLabelRef[]
  engineGuess: string | null
  gold: GoldDecision | null
}
