import type { TransformationMap } from "@/types/span"
import type { FootnoteMap } from "./types"

/**
 * Map FootnoteMap zones from raw-text coordinates to clean-text coordinates.
 *
 * Uses TransformationMap.originalToClean to translate each zone's start/end.
 * Falls back to original positions when a mapping entry doesn't exist.
 *
 * @param zones - FootnoteMap in raw-text coordinates
 * @param map - TransformationMap from cleanText()
 * @returns FootnoteMap in clean-text coordinates
 */
export function mapFootnoteZones(zones: FootnoteMap, map: TransformationMap): FootnoteMap {
  if (zones.length === 0) return []

  return zones.map((zone) => ({
    start: map.originalToClean.get(zone.start) ?? zone.start,
    end: map.originalToClean.get(zone.end) ?? zone.end,
    footnoteNumber: zone.footnoteNumber,
  }))
}
