import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { readCorpus } from "../../scripts/corpus/corpusIO"
import { projectOpinion } from "../../scripts/corpus/project"

// Replica-free: re-run extraction on the committed text and diff against the
// committed projection. A green run means behavior is unchanged across the
// corpus. After an intended change, `pnpm corpus:regen` re-baselines.
const corpus = readCorpus(join(process.cwd(), "tests/fixtures/corpus"))

describe("real-opinion snapshot corpus", () => {
  it("has a committed text + projection for every manifest entry", () => {
    expect(corpus.manifest.length).toBeGreaterThan(0)
    for (const { id } of corpus.manifest) {
      expect(corpus.texts[id], `text for ${id}`).toBeDefined()
      expect(corpus.projections[id], `projection for ${id}`).toBeDefined()
    }
  })

  for (const { id } of corpus.manifest) {
    it(`opinion ${id}: behavior matches committed projection`, () => {
      expect(projectOpinion(id, corpus.texts[id])).toEqual(corpus.projections[id])
    })
  }
})
