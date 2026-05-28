import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #707 — Constitutional citations chained with `;` only produced one
 * citation. The us-/state-constitution tokenizer patterns require the
 * `Const.` anchor, so trailing `;\s*art./amend. ...` continuations were
 * silently dropped. Fixed by adding a post-extraction pass that scans
 * forward from each constitutional cite for chained body-tail matches
 * and emits a synthetic citation per element with the same jurisdiction.
 */
describe("Issue #707 - chained constitutional citations", () => {
  it("expands `; amend. XIV, § 1` after US article cite", () => {
    const cs = extractCitations(`U.S. Const. art. III, § 2, cl. 1; amend. XIV, § 1`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(2)
    const head = consts[0] as Record<string, unknown>
    const tail = consts[1] as Record<string, unknown>
    expect(head.article).toBe(3)
    expect(head.section).toBe("2")
    expect(head.clause).toBe(1)
    expect(head.jurisdiction).toBe("US")
    expect(tail.amendment).toBe(14)
    expect(tail.section).toBe("1")
    expect(tail.jurisdiction).toBe("US")
  })

  it("expands `; art. II, § 1` after US article cite", () => {
    const cs = extractCitations(`U.S. Const. art. I, § 8; art. II, § 1`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(2)
    expect((consts[1] as { article?: number }).article).toBe(2)
    expect((consts[1] as { section?: string }).section).toBe("1")
  })

  it("expands multi-element chain with mixed article/amendment", () => {
    const cs = extractCitations(`U.S. Const. art. I, § 1; amend. V; amend. XIV`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(3)
    expect((consts[0] as { article?: number }).article).toBe(1)
    expect((consts[1] as { amendment?: number }).amendment).toBe(5)
    expect((consts[2] as { amendment?: number }).amendment).toBe(14)
  })

  it("inherits state jurisdiction for chained state-const cites", () => {
    const cs = extractCitations(`Cal. Const. art. I, § 7; art. II, § 2`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(2)
    expect((consts[0] as { jurisdiction?: string }).jurisdiction).toBe("CA")
    expect((consts[1] as { jurisdiction?: string }).jurisdiction).toBe("CA")
    expect((consts[1] as { article?: number }).article).toBe(2)
  })

  it("unchained constitutional citation remains a single result", () => {
    const cs = extractCitations(`U.S. Const. art. III, § 2`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(1)
  })

  it("does not chain across unrelated text after `;`", () => {
    const cs = extractCitations(`U.S. Const. art. I, § 1; the law was passed`)
    const consts = cs.filter((c) => c.type === "constitutional")
    expect(consts).toHaveLength(1)
  })
})
