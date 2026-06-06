/** True when the character is a word character (\w: [A-Za-z0-9_]). */
function isWord(c: string | undefined): boolean {
  return c !== undefined && /\w/.test(c)
}

/**
 * True when `needle` placed at `at` in `haystack` is not glued to a surrounding
 * word character. A non-word edge of the needle (e.g. the trailing "." of "Id.")
 * never requires a boundary on that side.
 */
export function tokenBounded(haystack: string, at: number, needle: string): boolean {
  const leftOk = !isWord(needle[0]) || at === 0 || !isWord(haystack[at - 1])
  const end = at + needle.length
  const rightOk =
    !isWord(needle[needle.length - 1]) || end >= haystack.length || !isWord(haystack[end])
  return leftOk && rightOk
}

/** Every token-bounded start index of `needle` in `haystack`, in document order. */
export function tokenBoundedIndexes(haystack: string, needle: string): number[] {
  const out: number[] = []
  if (!needle) return out
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) break
    if (tokenBounded(haystack, at, needle)) out.push(at)
    from = at + Math.max(1, needle.length)
  }
  return out
}
