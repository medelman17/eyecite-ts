import type {
  AdjudicationItem,
  AgreementResult,
  Annotator,
  BatchDetail,
  BatchSummary,
  DocListItem,
  DocumentPayload,
  GoldDecision,
  Label,
  NextItem,
} from "./types"

const BASE = import.meta.env.VITE_API_BASE ?? "/api"

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API ${status}: ${body}`)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new ApiError(res.status, body)
  }
  return res.json() as Promise<T>
}

export const api = {
  // Health
  health(): Promise<{ status: string }> {
    return request("/healthz")
  },

  // Documents
  listDocuments(): Promise<DocListItem[]> {
    return request("/documents")
  },

  getDocument(id: string): Promise<DocumentPayload> {
    return request(`/documents/${encodeURIComponent(id)}`)
  },

  getDocumentLabels(id: string, annotator?: string): Promise<Label[]> {
    const qs = annotator ? `?annotator=${encodeURIComponent(annotator)}` : ""
    return request(`/documents/${encodeURIComponent(id)}/labels${qs}`)
  },

  // Annotators
  listAnnotators(): Promise<Annotator[]> {
    return request("/annotators")
  },

  createAnnotator(a: Annotator): Promise<Annotator> {
    return request("/annotators", {
      method: "POST",
      body: JSON.stringify(a),
    })
  },

  // Batches
  listBatches(): Promise<BatchSummary[]> {
    return request("/batches")
  },

  getBatch(id: string): Promise<BatchDetail> {
    return request(`/batches/${encodeURIComponent(id)}`)
  },

  createBatch(body: {
    name: string
    mode: "single" | "double"
    reviewers: string[]
    documentIds: string[]
  }): Promise<BatchDetail> {
    return request("/batches", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  getBatchDocuments(id: string): Promise<DocumentPayload[]> {
    return request(`/batches/${encodeURIComponent(id)}/documents`)
  },

  getNext(batchId: string, annotator: string): Promise<NextItem | null> {
    return request<NextItem>(
      `/batches/${encodeURIComponent(batchId)}/next?annotator=${encodeURIComponent(annotator)}`,
    ).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    })
  },

  // Labels
  postLabel(label: Label): Promise<Label> {
    return request("/labels", {
      method: "POST",
      body: JSON.stringify(label),
    })
  },

  // Adjudication
  getAdjudication(batchId: string): Promise<AdjudicationItem[]> {
    return request(`/batches/${encodeURIComponent(batchId)}/adjudication`)
  },

  // Gold decisions
  getGold(documentId: string, backrefId: string): Promise<GoldDecision | null> {
    return request<GoldDecision>(
      `/gold/${encodeURIComponent(documentId)}/${encodeURIComponent(backrefId)}`,
    ).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    })
  },

  postGold(body: {
    documentId: string
    backrefId: string
    decision: GoldDecision
  }): Promise<GoldDecision> {
    return request("/gold", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  // Agreement
  getAgreement(batchId: string): Promise<AgreementResult> {
    return request(`/batches/${encodeURIComponent(batchId)}/agreement`)
  },

  // Export (returns a URL string for use as an href / download link)
  exportUrl(batchId: string): string {
    return `${BASE}/batches/${encodeURIComponent(batchId)}/export`
  },
}
