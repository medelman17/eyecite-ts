/**
 * Repro script for Sprint G (issues #570, #571, #572).
 *
 * Probes each citation form against the current pipeline and reports
 * (a) number of citations extracted, (b) reporter literal text,
 * (c) normalizedReporter (post-lookup canonical form).
 */
import { extractCitations } from "../src/index"
import { loadReporters } from "../src/data/reporters"
import type { Citation } from "../src/types/citation"

interface Probe {
  group: string
  text: string
  expected: { reporter?: string; normalized?: string }
}

const PROBES_570: Probe[] = [
  { group: "#570", text: "See 252 S. W., 20.", expected: {} },
  { group: "#570", text: "See 26 N. Y., 279.", expected: {} },
  { group: "#570", text: "See 19 Barb., 341.", expected: {} },
  { group: "#570", text: "See 217 Ill. App., 427.", expected: {} },
  { group: "#570", text: "See 125 N. E., 793.", expected: {} },
  { group: "#570", text: "See 3 Den., 594.", expected: {} },
  { group: "#570 (baseline)", text: "See 3 Den. 594.", expected: {} },
]

const PROBES_571: Probe[] = [
  { group: "#571", text: "See 725 F2d 1091.", expected: { normalized: "F.2d" } },
  { group: "#571", text: "See 60 Ill App2d 39.", expected: { normalized: "Ill.App.2d" } },
  { group: "#571", text: "See 24 Ill2d 270.", expected: { normalized: "Ill.2d" } },
  { group: "#571", text: "See 140 N.J.Eq. 496.", expected: { normalized: "N.J. Eq." } },
  { group: "#571", text: "See 17 Oh St 649.", expected: { normalized: "Ohio St." } },
  { group: "#571", text: "See 125 OhioSt. 219.", expected: { normalized: "Ohio St." } },
  { group: "#571", text: "See 329 FedAppx. 1.", expected: { normalized: "F. App'x" } },
  { group: "#571 (baseline)", text: "See 92 NE2d 100.", expected: { normalized: "N.E.2d" } },
  { group: "#571 (baseline)", text: "See 100 P2d 50.", expected: { normalized: "P.2d" } },
]

const PROBES_572: Probe[] = [
  { group: "#572", text: "Dred Scott v. Sandford, 1 Black. 219 (U.S. 1862).", expected: { normalized: "Black" } },
  { group: "#572", text: "Ex parte Milligan, 2 Black. 794 (U.S. 1862).", expected: { normalized: "Black" } },
  { group: "#572", text: "1 Black. 363 (1861).", expected: { normalized: "Black" } },
  { group: "#572 (Indiana baseline)", text: "Smith v. Jones, 5 Black. 100 (Ind. 1840).", expected: { normalized: "Blackf." } },
]

const ALL = [...PROBES_570, ...PROBES_571, ...PROBES_572]

async function main() {
  await loadReporters()
  console.log("Loaded reporters DB")

  for (const probe of ALL) {
    const cites = extractCitations(probe.text) as Citation[]
    console.log(`\n${probe.group}: ${JSON.stringify(probe.text)}`)
    console.log(`  -> ${cites.length} citations`)
    for (const c of cites) {
      if (c.type === "case") {
        const rep = c.reporter
        const norm = c.normalizedReporter
        console.log(`    type=${c.type} reporter=${JSON.stringify(rep)} normalized=${JSON.stringify(norm)} text=${JSON.stringify(c.matchedText)}`)
      } else {
        console.log(`    type=${c.type} text=${JSON.stringify(c.matchedText)}`)
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
