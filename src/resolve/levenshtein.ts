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
 * The edit distance is the minimum number of single-character edits
 * (insertions, deletions, substitutions) needed to change one string into the other.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits required (0 = identical)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Handle empty strings
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Create 2D array for dynamic programming
  // dp[i][j] = edit distance between a[0...i-1] and b[0...j-1]
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))

  // Initialize base cases
  for (let i = 0; i <= a.length; i++) {
    dp[i][0] = i // Distance from a[0...i-1] to empty string
  }
  for (let j = 0; j <= b.length; j++) {
    dp[0][j] = j // Distance from empty string to b[0...j-1]
  }

  // Fill the DP table
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        // Characters match - no edit needed
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        // Characters differ - take minimum of:
        // 1. Insert: dp[i][j-1] + 1
        // 2. Delete: dp[i-1][j] + 1
        // 3. Substitute: dp[i-1][j-1] + 1
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // Delete from a
            dp[i][j - 1], // Insert into a
            dp[i - 1][j - 1], // Substitute
          )
      }
    }
  }

  return dp[a.length][b.length]
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
