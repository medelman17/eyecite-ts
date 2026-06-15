import { join } from "node:path"
import { type Corpus, readCorpus, writeCorpus } from "./corpusIO"
import { projectOpinion } from "./project"
import { SEEDS } from "./seeds"

/** Recompute expected projections from the committed texts, after merging any
 *  SEEDS missing from the corpus. Replica-free; this is the re-baseline step
 *  after an intended behavior change OR after adding a seed: run it, review the
 *  projection diff (intended improvement vs. regression), commit. */
export function regen(dir: string): { changed: number; added: number } {
  const corpus = readCorpus(dir)
  // Sync SEEDS into the committed corpus (replica-free): add missing ones, and
  // keep every seed's text authoritative from seeds.ts so editing a seed
  // re-syncs on the next regen.
  const present = new Set(corpus.manifest.map((e) => e.id))
  let added = 0
  for (const seed of SEEDS) {
    if (!present.has(seed.entry.id)) {
      corpus.manifest.push(seed.entry)
      added++
    }
    corpus.texts[seed.entry.id] = seed.text
  }
  const projections: Corpus["projections"] = {}
  let changed = 0
  for (const { id } of corpus.manifest) {
    const next = projectOpinion(id, corpus.texts[id])
    if (JSON.stringify(next) !== JSON.stringify(corpus.projections[id])) changed++
    projections[id] = next
  }
  writeCorpus(dir, { ...corpus, projections })
  return { changed, added }
}

const CORPUS_DIR = join(process.cwd(), "tests/fixtures/corpus")
if (process.argv[1]?.endsWith("regen.ts")) {
  const { changed, added } = regen(CORPUS_DIR)
  console.log(`corpus:regen — ${added} seed(s) added, ${changed} projection(s) changed`)
}
