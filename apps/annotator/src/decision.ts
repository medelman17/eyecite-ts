// apps/annotator/src/decision.ts
// Shared helper: reconstruct a Label["decision"] from DB columns.
import type { Label } from "./contract.js"

export function decisionFromColumns(row: {
  decision_type: "antecedent" | "abstain" | "ambiguous" | "flag"
  citation_id: string | null
  ambiguous_citation_ids: string[] | null
}): Label["decision"] {
  switch (row.decision_type) {
    case "antecedent":
      return { type: "antecedent", citationId: row.citation_id ?? "" }
    case "ambiguous":
      return { type: "ambiguous", citationIds: row.ambiguous_citation_ids ?? [] }
    case "abstain":
      return { type: "abstain" }
    case "flag":
      return { type: "flag" }
  }
}
