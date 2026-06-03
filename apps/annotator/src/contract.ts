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
  text: string
  citations: ContractCitation[]
  backrefs: Backref[]
}

export interface Label {
  backrefId: string
  decision:
    | { type: "antecedent"; citationId: string }
    | { type: "abstain" }
    | { type: "ambiguous" }
    | { type: "flag" }
  annotatorId: string
  agreedWithEngine: boolean
  note?: string
}
