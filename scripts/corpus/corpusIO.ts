import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"
import type { OpinionProjection } from "./project"

export interface ManifestEntry {
  id: number
  court: string
  era: string
  type: string
  ocr: boolean
}

export interface Corpus {
  manifest: ManifestEntry[]
  texts: Record<number, string>
  projections: Record<number, OpinionProjection>
}

const MANIFEST = "manifest.json"
const TEXTS = "texts.json.gz"
const PROJECTIONS = "projections.json"

export function writeCorpus(dir: string, corpus: Corpus): void {
  writeFileSync(join(dir, MANIFEST), `${JSON.stringify(corpus.manifest, null, 2)}\n`)
  writeFileSync(join(dir, TEXTS), gzipSync(Buffer.from(JSON.stringify(corpus.texts))))
  writeFileSync(join(dir, PROJECTIONS), `${JSON.stringify(corpus.projections, null, 2)}\n`)
}

export function readCorpus(dir: string): Corpus {
  const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), "utf8")) as ManifestEntry[]
  const texts = JSON.parse(gunzipSync(readFileSync(join(dir, TEXTS))).toString("utf8")) as Record<
    number,
    string
  >
  const projections = JSON.parse(readFileSync(join(dir, PROJECTIONS), "utf8")) as Record<
    number,
    OpinionProjection
  >
  return { manifest, texts, projections }
}
