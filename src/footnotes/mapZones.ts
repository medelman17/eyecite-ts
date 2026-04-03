import type { TransformationMap } from "@/types/span"
import type { FootnoteMap } from "./types"

/**
 * Search nearby positions in the map to find the closest mapped coordinate.
 * This handles cases where a zone boundary falls on a character that was
 * removed during cleaning (e.g., an HTML tag boundary).
 *
 * For zone starts, search forward (the first surviving character after the boundary).
 * For zone ends, search backward (the last surviving character before the boundary).
 *
 * @param pos - Original-text position to look up
 * @param originalToClean - Position mapping from TransformationMap
 * @param direction - "forward" for zone starts, "backward" for zone ends
 * @param maxSearch - Maximum positions to scan (matches cleanText maxLookAhead)
 * @returns Mapped clean-text position, or undefined if nothing found within range
 */
function findNearestCleanPosition(
  pos: number,
  originalToClean: Map<number, number>,
  direction: "forward" | "backward",
  maxSearch = 20,
): number | undefined {
  for (let offset = 1; offset <= maxSearch; offset++) {
    const candidate = direction === "forward" ? pos + offset : pos - offset
    const mapped = originalToClean.get(candidate)
    if (mapped !== undefined) return mapped
  }
  return undefined
}

/**
 * Map FootnoteMap zones from raw-text coordinates to clean-text coordinates.
 *
 * Uses TransformationMap.originalToClean to translate each zone's start/end.
 * When an exact position isn't in the map (e.g., it fell on a stripped HTML tag),
 * scans nearby positions: forward for zone starts, backward for zone ends.
 *
 * @param zones - FootnoteMap in raw-text coordinates
 * @param map - TransformationMap from cleanText()
 * @returns FootnoteMap in clean-text coordinates
 */
export function mapFootnoteZones(zones: FootnoteMap, map: TransformationMap): FootnoteMap {
  if (zones.length === 0) return []

  return zones.map((zone) => ({
    start:
      map.originalToClean.get(zone.start) ??
      findNearestCleanPosition(zone.start, map.originalToClean, "forward") ??
      zone.start,
    end:
      map.originalToClean.get(zone.end) ??
      findNearestCleanPosition(zone.end, map.originalToClean, "backward") ??
      zone.end,
    footnoteNumber: zone.footnoteNumber,
  }))
}
