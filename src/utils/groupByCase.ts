import type { Citation, FullCaseCitation } from "../types/citation"
import type { ResolvedCitation, ResolutionResult } from "../resolve/types"
import type { CaseGroup } from "./types"
import { toReporterKeys } from "./reporterKey"

/**
 * Build a lookup key for a full case citation: "volume-reporter-page".
 * Used to group duplicate full citations that lack a parallel groupId.
 */
function citeKey(c: FullCaseCitation): string {
  return `${c.volume}-${c.reporter}-${c.page ?? "blank"}`
}

/** Type guard: narrow a Citation to FullCaseCitation after checking type === "case". */
function isFullCase(cite: Citation): cite is FullCaseCitation {
  return cite.type === "case"
}

/** Extract resolution from a resolved short-form citation. */
function getResolution(cite: ResolvedCitation): ResolutionResult | undefined {
  return (cite as ResolvedCitation & { resolution?: ResolutionResult }).resolution
}

/**
 * Group resolved citations by underlying case.
 *
 * Composes parallel linking, resolution, and volume/reporter/page identity
 * into `CaseGroup` objects. Non-case citations are ignored. Unresolved
 * short-form citations are excluded.
 *
 * @example
 * ```typescript
 * const citations = extractCitations(text)
 * const resolved = resolveCitations(citations, text)
 * const groups = groupByCase(resolved)
 * ```
 */
export function groupByCase(citations: ResolvedCitation[]): CaseGroup[] {
  // Map from citation index -> group index (for short-form resolution lookup)
  const indexToGroup = new Map<number, number>()
  // Map from groupId or citeKey -> group index (for dedup)
  const keyToGroup = new Map<string, number>()
  const groups: CaseGroup[] = []

  // First pass: assign full case citations to groups
  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i]
    if (!isFullCase(cite)) continue

    // Check if this citation belongs to an existing group
    const gid = cite.groupId
    const key = citeKey(cite)
    const existingIdx = (gid ? keyToGroup.get(gid) : undefined) ?? keyToGroup.get(key)

    if (existingIdx !== undefined) {
      // Add to existing group
      groups[existingIdx].mentions.push(cite)
      indexToGroup.set(i, existingIdx)
    } else {
      // Create new group
      const groupIdx = groups.length
      const group: CaseGroup = {
        primaryCitation: cite,
        mentions: [cite],
        parallelCitations: toReporterKeys(cite),
      }
      groups.push(group)
      indexToGroup.set(i, groupIdx)
      keyToGroup.set(key, groupIdx)
      if (gid) {
        keyToGroup.set(gid, groupIdx)
      }
    }
  }

  // Second pass: assign short-form citations to their resolved group
  for (let i = 0; i < citations.length; i++) {
    const cite = citations[i]
    if (cite.type !== "id" && cite.type !== "supra" && cite.type !== "shortFormCase") continue

    const resolution = getResolution(cite)
    if (resolution?.resolvedTo === undefined) continue

    const groupIdx = indexToGroup.get(resolution.resolvedTo)
    if (groupIdx === undefined) continue

    groups[groupIdx].mentions.push(cite)
    indexToGroup.set(i, groupIdx)
  }

  // Sort mentions within each group by document position
  for (const group of groups) {
    group.mentions.sort((a, b) => a.span.originalStart - b.span.originalStart)
  }

  return groups
}
