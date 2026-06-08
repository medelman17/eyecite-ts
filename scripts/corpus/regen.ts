import { join } from "node:path"
import { type Corpus, readCorpus, writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"

/** Recompute expected projections from the committed texts. Replica-free; this
 *  is the re-baseline step after an intended behavior change: run it, review
 *  the projection diff (intended improvement vs. regression), commit. */
export function regen(dir: string): { changed: number } {
  const corpus = readCorpus(dir)
  const projections: Corpus["projections"] = {}
  let changed = 0
  for (const { id } of corpus.manifest) {
    const next = projectOpinion(id, corpus.texts[id])
    if (JSON.stringify(next) !== JSON.stringify(corpus.projections[id])) changed++
    projections[id] = next
  }
  writeCorpus(dir, { ...corpus, projections })
  return { changed }
}

const CORPUS_DIR = join(process.cwd(), "tests/fixtures/corpus")
if (process.argv[1]?.endsWith("regen.ts")) {
  const { changed } = regen(CORPUS_DIR)
  console.log(`corpus:regen — ${changed} projection(s) changed`)
}
