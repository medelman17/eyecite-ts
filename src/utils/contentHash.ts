/**
 * Stable FNV-1a-64 hex of the NFC-normalized, NUL-joined quote fields. A cheap,
 * synchronous, dependency-free identity for dedup/equality. Fields are joined on
 * a NUL byte (which cannot appear in citation text) so that, e.g., {exact:"a b"}
 * and {exact:"a", prefix:"b"} do not collide. Iterates UTF-16 code units so any
 * consumer reproduces it with the identical loop. Returns 16-char lowercase hex.
 */
export function contentHash(exact: string, prefix = "", suffix = ""): string {
  const s = `${exact}\u0000${prefix}\u0000${suffix}`.normalize("NFC")
  let h = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i))
    h = BigInt.asUintN(64, h * prime)
  }
  return h.toString(16).padStart(16, "0")
}
