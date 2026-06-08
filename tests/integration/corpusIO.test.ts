import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { readCorpus, writeCorpus } from "../../scripts/corpus/corpusIO"

const dir = mkdtempSync(join(tmpdir(), "corpus-io-"))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe("corpus I/O", () => {
  it("round-trips manifest + gzipped texts + projections", () => {
    const manifest = [{ id: 7, court: "scotus", era: "1970s", type: "010combined", ocr: false }]
    const texts = { 7: "410 U.S. 113 (1973)." }
    const projections = { 7: { id: 7, count: 1, citations: [] } }

    writeCorpus(dir, { manifest, texts, projections })
    const back = readCorpus(dir)

    expect(back.manifest).toEqual(manifest)
    expect(back.texts).toEqual(texts)
    expect(back.projections).toEqual(projections)
  })
})
