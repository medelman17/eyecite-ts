/**
 * Union-Find (Disjoint-Set Forest)
 *
 * Tracks connected components for subsequent history chain linking.
 * Uses path halving and union by rank with lower-index-wins tie-breaking.
 */

export class UnionFind {
  private readonly parent: number[]
  private readonly rank: number[]

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array<number>(n).fill(0)
  }

  /** Find the root (canonical representative) of the set containing x. */
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]] // path halving
      x = this.parent[x]
    }
    return x
  }

  /** Merge the sets containing x and y. Lower index becomes root. */
  union(x: number, y: number): void {
    let rootX = this.find(x)
    let rootY = this.find(y)
    if (rootX === rootY) return

    // Lower index is always the canonical representative
    if (rootX > rootY) {
      const tmp = rootX
      rootX = rootY
      rootY = tmp
    }
    this.parent[rootY] = rootX
    if (this.rank[rootX] === this.rank[rootY]) this.rank[rootX]++
  }

  /** Check if x and y are in the same set. */
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y)
  }

  /** Return all connected components as a map from root → sorted member indices. */
  components(): Map<number, number[]> {
    const result = new Map<number, number[]>()
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i)
      let members = result.get(root)
      if (!members) {
        members = []
        result.set(root, members)
      }
      members.push(i)
    }
    return result
  }
}
