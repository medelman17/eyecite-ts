import type { ManifestEntry } from "./corpusIO"

export interface Seed {
  entry: ManifestEntry
  text: string
}

/**
 * Hand-authored opinions exhibiting shapes the curated corpus missed. Negative
 * ids mark seeds; real CourtListener opinions use positive ids. These are
 * permanent guarantees — even if a future re-sample drops the shape.
 */
export const SEEDS: Seed[] = [
  {
    // #878: prose-led single-party caption (no `v.`). Extraction attaches no
    // party name, so `Miranda, supra` must still resolve via the resolver
    // fallback — the behavior an over-eager "dead code" removal would break.
    entry: { id: -1, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "The holding in Miranda, 384 U.S. 436 (1966), is broad. Miranda, supra, at 444.",
  },
  {
    // Nested quoting parenthetical (#867) + Id. to the host (Rule 4.1).
    entry: { id: -2, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1). Id. at 110.",
  },
  {
    // Section-style Id. pincite → statute family (#847).
    entry: { id: -3, court: "seed", era: "seed", type: "seed", ocr: false },
    text: "See 42 U.S.C. § 1983. The statute applies. Id. § 1983(c).",
  },
]
