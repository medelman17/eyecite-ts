// Mirrored from apps/annotator/src/contract.ts — the web app talks to the
// backend over HTTP and must NOT import backend code directly.

export type CitationKind = "full" | "id" | "supra" | "shortFormCase"

export interface ContractCitation {
  id: string
  kind: CitationKind
  span: [number, number]
  displayText: string
  parties?: { plaintiff?: string; defendant?: string }
  year?: number
}

export interface Candidate {
  citationId: string
  rank: number
  confidence?: number
  isBuriedAside: boolean
  why: string
}

export interface Backref {
  id: string
  span: [number, number]
  kind: "id" | "supra" | "shortFormCase"
  engineGuess: string | null
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

// Response-only types returned by the backend API

export interface DocListItem {
  id: string
  source: "ocr" | "native"
  backrefCount: number
}

export interface Annotator {
  id: string
  name: string
}

export interface BatchDetail {
  id: string
  name: string
  mode: "single" | "double"
  reviewers: string[]
  documentIds: string[]
  docCount: number
  backrefCount: number
  labeled: number
}

export interface AgreementResult {
  kappa: number | null
  po: number
  pe: number
  sharedItems: number
  reviewers: string[]
  perReviewerLabeled: Record<string, number>
}
