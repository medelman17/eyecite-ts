/**
 * Levenshtein Distance
 *
 * Calculates edit distance between strings for fuzzy party name matching
 * in supra citation resolution.
 *
 * Uses dynamic programming for O(m*n) time complexity.
 */

/**
 * Calculates Levenshtein distance (edit distance) between two strings.
 *
 * Uses a space-optimized rolling two-row DP approach: only the previous and
 * current rows are kept in memory (O(min(m,n)) space instead of O(m*n)).
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Optional threshold for early termination. When provided,
 *   the function returns `maxDistance + 1` as soon as it determines the true
 *   distance must exceed the threshold. This avoids unnecessary computation
 *   for obviously dissimilar strings.
 * @returns Exact edit distance if ≤ maxDistance, otherwise maxDistance + 1
 */
export function levenshteinDistance(a: string, b: string, maxDistance: number = Infinity): number {
  if (a.length === 0) return Math.min(b.length, maxDistance + 1)
  if (b.length === 0) return Math.min(a.length, maxDistance + 1)

  // Ensure short is the shorter string so rows are min(m,n) long
  const short = a.length <= b.length ? a : b
  const long = a.length <= b.length ? b : a

  const cols = short.length
  let prev = Array.from({ length: cols + 1 }, (_, k) => k) // base-case row
  let curr = new Array<number>(cols + 1)

  for (let i = 1; i <= long.length; i++) {
    curr[0] = i
    let rowMin = i // curr[0] is always i

    for (let j = 1; j <= cols; j++) {
      if (long[i - 1] === short[j - 1]) {
        curr[j] = prev[j - 1]
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
      }
      if (curr[j] < rowMin) rowMin = curr[j]
    }

    // Early termination: row minimums are non-decreasing, so if the
    // cheapest cell already exceeds the threshold, no future row can help
    if (rowMin > maxDistance) return maxDistance + 1

    const swap = prev
    prev = curr
    curr = swap
  }

  return prev[cols]
}

/**
 * Calculates normalized Levenshtein similarity (0-1 scale).
 *
 * Returns similarity score where:
 * - 1.0 = identical strings
 * - 0.0 = completely different
 *
 * Comparison is case-insensitive.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score from 0 to 1
 */
export function normalizedLevenshteinDistance(a: string, b: string): number {
  // Normalize to lowercase for case-insensitive comparison
  const lowerA = a.toLowerCase()
  const lowerB = b.toLowerCase()

  // Calculate raw edit distance
  const distance = levenshteinDistance(lowerA, lowerB)

  // Normalize by max length
  const maxLength = Math.max(lowerA.length, lowerB.length)
  if (maxLength === 0) return 1.0 // Both empty strings

  // Convert distance to similarity: 1 - (distance / maxLength)
  return 1 - distance / maxLength
}
