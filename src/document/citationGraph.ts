import type { Citation, HistorySignal } from "../types/citation"
import { computeInParentheticalOwners } from "../utils/parentheticalScope"
import type { CitationGraph, Edge } from "./types"

/**
 * Build a citation graph by projecting existing relationship fields on
 * Citation objects into a typed-edge representation.
 *
 * Reads from:
 *   - citation.resolution?.resolvedTo        → "resolves-to" edge
 *   - citation.resolution?.antecedentIndex   → "antecedent" edge
 *   - citation.groupId (parallel group)      → "parallel" edges (one per pair)
 *   - citation.subsequentHistoryOf           → "history-of" edge
 *   - citation.pinciteInheritedFrom          → "pincite-inherit" edge
 *   - citation.stringCitationGroupId         → "string-cite" edges
 *   - parenDepths + text (balance-tolerant)  → "in-parenthetical-of" edge
 *
 * Invariants:
 *   - nodes.length === citations.length (isolated nodes included)
 *   - No self-edges
 *   - No duplicates of the same (type, from, to)
 *   - Edges sorted by (from, type, to) for deterministic iteration
 */
export function buildCitationGraph(
  citations: Citation[],
  parenDepths: number[],
  text?: string,
): CitationGraph {
  const nodes = citations.map((_, i) => i)
  const edges: Edge[] = []
  const seen = new Set<string>()

  function addEdge(edge: Edge): void {
    if (edge.from === edge.to) return // no self-edges
    const key = `${edge.type}|${edge.from}|${edge.to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  for (let i = 0; i < citations.length; i++) {
    const c = citations[i] as Citation & {
      resolution?: {
        resolvedTo?: number
        antecedentIndex?: number
        confidence?: number
        warnings?: string[]
      }
      subsequentHistoryOf?: { index: number; signal: HistorySignal }
      pinciteInheritedFrom?: number
    }

    // resolves-to
    if (c.resolution?.resolvedTo !== undefined) {
      addEdge({
        type: "resolves-to",
        from: i,
        to: c.resolution.resolvedTo,
        confidence: c.resolution.confidence ?? 1.0,
        ...(c.resolution.warnings ? { warnings: c.resolution.warnings } : {}),
      })
    }

    // antecedent
    if (c.resolution?.antecedentIndex !== undefined) {
      addEdge({ type: "antecedent", from: i, to: c.resolution.antecedentIndex })
    }

    // history-of
    if (c.subsequentHistoryOf) {
      addEdge({
        type: "history-of",
        from: i,
        to: c.subsequentHistoryOf.index,
        signal: c.subsequentHistoryOf.signal,
      })
    }

    // pincite-inherit
    if (c.pinciteInheritedFrom !== undefined) {
      addEdge({ type: "pincite-inherit", from: i, to: c.pinciteInheritedFrom })
    }
  }

  // parallel edges — undirected; emit one edge per pair within each group.
  // groupId only exists on FullCaseCitation; narrow before access.
  const groupMembers = new Map<string, number[]>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (c.type !== "case") continue
    const groupId = c.groupId
    if (!groupId) continue
    const members = groupMembers.get(groupId) ?? []
    members.push(i)
    groupMembers.set(groupId, members)
  }
  for (const [groupId, members] of groupMembers) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge({ type: "parallel", from: members[i], to: members[j], groupId })
      }
    }
  }

  // string-cite edges — emit pair edges between adjacent members of each group,
  // ordered by stringCitationIndex.
  const stringGroups = new Map<string, Array<{ idx: number; position: number }>>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (!c.stringCitationGroupId) continue
    const members = stringGroups.get(c.stringCitationGroupId) ?? []
    members.push({ idx: i, position: c.stringCitationIndex ?? 0 })
    stringGroups.set(c.stringCitationGroupId, members)
  }
  for (const [groupId, members] of stringGroups) {
    members.sort((a, b) => a.position - b.position)
    for (let i = 0; i < members.length - 1; i++) {
      addEdge({
        type: "string-cite",
        from: members[i].idx,
        to: members[i + 1].idx,
        groupId,
        position: members[i].position,
      })
    }
  }

  // in-parenthetical-of edges — balance-tolerant owner per citation (#801):
  // the `(`/`)` depth signal plus trigger-word anchoring (recovers a dropped
  // opening paren) and a sentence-boundary guard (rejects a dropped closing
  // paren leaking onto a following top-level cite). Falls back to raw depth
  // when `text` is not supplied (pre-#801 behavior).
  const parentheticalOwners = computeInParentheticalOwners(citations, parenDepths, text)
  for (let i = 0; i < citations.length; i++) {
    const owner = parentheticalOwners[i]
    if (owner !== undefined) {
      addEdge({ type: "in-parenthetical-of", from: i, to: owner })
    }
  }

  // Stable sort: from, then type, then to.
  edges.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    return a.to - b.to
  })

  return { nodes, edges }
}
