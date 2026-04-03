/**
 * BK-Tree (Burkhard-Keller Tree)
 *
 * A metric tree that indexes strings by pairwise edit distance, enabling
 * threshold queries that prune dissimilar candidates via triangle inequality.
 * Used internally for supra citation party name matching.
 */

interface BKTreeNode {
  key: string
  insertionOrder: number
  children: Map<number, BKTreeNode>
}

export interface BKQueryResult {
  key: string
  distance: number
  insertionOrder: number
}

/**
 * A BK-Tree for approximate string matching using a metric distance function.
 *
 * @param distanceFn - A metric distance function (must satisfy triangle inequality).
 *   Accepts an optional third parameter `maxDistance` for early termination.
 */
export class BKTree {
  private root: BKTreeNode | null = null
  private nextOrder = 0
  private readonly distanceFn: (a: string, b: string, maxDistance?: number) => number

  constructor(distanceFn: (a: string, b: string, maxDistance?: number) => number) {
    this.distanceFn = distanceFn
  }

  /**
   * Insert a key into the tree. Duplicate keys are ignored (first insertion wins).
   */
  insert(key: string): void {
    const node: BKTreeNode = {
      key,
      insertionOrder: this.nextOrder++,
      children: new Map(),
    }

    if (this.root === null) {
      this.root = node
      return
    }

    let current = this.root
    while (true) {
      const d = this.distanceFn(key, current.key)
      if (d === 0) return // duplicate key, keep first
      const child = current.children.get(d)
      if (child) {
        current = child
      } else {
        current.children.set(d, node)
        return
      }
    }
  }

  /**
   * Find all keys within `maxDistance` of the query key.
   *
   * Uses triangle inequality to prune branches: if d(query, node) = k,
   * only children at distances in [k - maxDistance, k + maxDistance] can
   * possibly contain matches.
   *
   * Results are sorted by distance (ascending), then insertion order (ascending).
   */
  query(queryKey: string, maxDistance: number): BKQueryResult[] {
    if (this.root === null) return []

    const results: BKQueryResult[] = []
    const stack: BKTreeNode[] = [this.root]

    let node: BKTreeNode | undefined
    while ((node = stack.pop())) {
      // Compute exact distance — early termination is NOT safe here because
      // the BK-Tree needs the true distance for triangle inequality pruning.
      // A truncated distance shifts the child exploration range and causes false negatives.
      const d = this.distanceFn(queryKey, node.key)

      if (d <= maxDistance) {
        results.push({ key: node.key, distance: d, insertionOrder: node.insertionOrder })
      }

      // Triangle inequality pruning
      const lo = d - maxDistance
      const hi = d + maxDistance
      for (const [childDist, childNode] of node.children) {
        if (childDist >= lo && childDist <= hi) {
          stack.push(childNode)
        }
      }
    }

    results.sort((a, b) => a.distance - b.distance || a.insertionOrder - b.insertionOrder)
    return results
  }
}
