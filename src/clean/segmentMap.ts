/**
 * Segment-based position mapping.
 *
 * Compresses a per-character position map into contiguous segments where the
 * offset between clean and original coordinates is constant. Lookups use
 * binary search (O(log k) where k = number of segments, typically 50-200).
 */

export interface Segment {
  /** Start position in clean text */
  cleanPos: number
  /** Corresponding start position in original text */
  origPos: number
  /** Number of positions covered by this segment */
  len: number
}

export class SegmentMap {
  readonly segments: readonly Segment[]

  constructor(segments: Segment[]) {
    this.segments = segments
  }

  /**
   * Create an identity map (clean position === original position).
   */
  static identity(length: number): SegmentMap {
    return new SegmentMap([{ cleanPos: 0, origPos: 0, len: length + 1 }])
  }

  /**
   * Compress a per-position Map into a SegmentMap.
   * Adjacent entries with the same offset (origPos - cleanPos) are merged
   * into a single segment.
   */
  static fromMap(map: Map<number, number>): SegmentMap {
    if (map.size === 0) return new SegmentMap([])

    // Sort entries by clean position (Map iteration order may not be sorted)
    const entries = [...map.entries()].sort((a, b) => a[0] - b[0])

    const segments: Segment[] = []
    let segCleanStart = entries[0][0]
    let segOrigStart = entries[0][1]
    let segLen = 1

    for (let i = 1; i < entries.length; i++) {
      const [cleanPos, origPos] = entries[i]
      const expectedCleanPos = segCleanStart + segLen
      const expectedOrigPos = segOrigStart + segLen

      if (cleanPos === expectedCleanPos && origPos === expectedOrigPos) {
        segLen++
      } else {
        segments.push({ cleanPos: segCleanStart, origPos: segOrigStart, len: segLen })
        segCleanStart = cleanPos
        segOrigStart = origPos
        segLen = 1
      }
    }
    segments.push({ cleanPos: segCleanStart, origPos: segOrigStart, len: segLen })

    return new SegmentMap(segments)
  }

  /**
   * Look up the original position for a clean-text position.
   * Uses binary search on sorted segments.
   */
  lookup(cleanPos: number): number {
    const segs = this.segments
    if (segs.length === 0) return cleanPos

    let lo = 0
    let hi = segs.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const seg = segs[mid]

      if (cleanPos < seg.cleanPos) {
        hi = mid - 1
      } else if (cleanPos >= seg.cleanPos + seg.len) {
        lo = mid + 1
      } else {
        return seg.origPos + (cleanPos - seg.cleanPos)
      }
    }

    // Position beyond all segments: extrapolate from last segment
    const last = segs[segs.length - 1]
    return last.origPos + (cleanPos - last.cleanPos)
  }
}
