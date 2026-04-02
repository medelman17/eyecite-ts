/**
 * Court Inference from Reporter Series
 *
 * Infers court level and jurisdiction from reporter abbreviation using a
 * curated static lookup table.
 *
 * Design decision: This uses a hand-curated table rather than parsing
 * mlz_jurisdiction from the reporter DB. Using the reporter DB would make
 * it a hard dependency of core extraction, defeating the lazy-loading
 * architecture where eyecite-ts/data is a separate entry point for
 * tree-shaking. A curated table keeps court inference zero-dependency
 * and fast. Full reporter DB coverage can be added later as an opt-in
 * function in the eyecite-ts/data entry point.
 *
 * @module extract/courtInference
 */

import type { CourtInference } from "@/types/citation"

/** Helper to reduce repetition when building the lookup table. */
function federal(level: CourtInference["level"]): CourtInference {
  return { level, jurisdiction: "federal", confidence: 1.0 }
}

function state(level: CourtInference["level"], st: string): CourtInference {
  return { level, jurisdiction: "state", state: st, confidence: 1.0 }
}

function regional(level: CourtInference["level"]): CourtInference {
  return { level, jurisdiction: "state", confidence: 0.7 }
}

/**
 * Curated reporter → court inference mapping.
 *
 * Covers ~80 reporter abbreviations (including spacing variants). Unknown
 * reporters return undefined from inferCourtFromReporter() — no guessing.
 */
const REPORTER_COURT_MAP = new Map<string, CourtInference>([
  // ── Federal Supreme ──────────────────────────────────────────────
  // After normalizeReporterSpacing, reporters arrive collapsed (e.g. "S.Ct.").
  // Spaced forms kept for direct-call / pre-cleaned paths.
  ["U.S.", federal("supreme")],
  ["S.Ct.", federal("supreme")],
  ["L.Ed.", federal("supreme")],
  ["L.Ed.2d", federal("supreme")],
  ["S. Ct.", federal("supreme")],
  ["L. Ed.", federal("supreme")],
  ["L. Ed. 2d", federal("supreme")],
  ["U. S.", federal("supreme")],
  ["L.Ed. 2d", federal("supreme")],
  ["L. Ed.2d", federal("supreme")],

  // ── Federal Appellate ────────────────────────────────────────────
  ["F.", federal("appellate")],
  ["F.2d", federal("appellate")],
  ["F.3d", federal("appellate")],
  ["F.4th", federal("appellate")],
  ["F. App'x", federal("appellate")],

  // ── Federal Trial ────────────────────────────────────────────────
  ["F.Supp.", federal("trial")],
  ["F.Supp.2d", federal("trial")],
  ["F.Supp.3d", federal("trial")],
  ["F.Supp.4th", federal("trial")],
  ["F. Supp.", federal("trial")],
  ["F. Supp. 2d", federal("trial")],
  ["F. Supp. 3d", federal("trial")],
  ["F. Supp. 4th", federal("trial")],
  ["F.R.D.", federal("trial")],
  ["B.R.", federal("trial")],

  // ── California ───────────────────────────────────────────────────
  ["Cal.", state("supreme", "CA")],
  ["Cal.2d", state("supreme", "CA")],
  ["Cal.3d", state("supreme", "CA")],
  ["Cal.4th", state("supreme", "CA")],
  ["Cal.5th", state("supreme", "CA")],
  ["Cal.App.", state("appellate", "CA")],
  ["Cal.App.2d", state("appellate", "CA")],
  ["Cal.App.3d", state("appellate", "CA")],
  ["Cal.App.4th", state("appellate", "CA")],
  ["Cal.App.5th", state("appellate", "CA")],
  ["Cal.Rptr.", state("unknown", "CA")],
  ["Cal.Rptr.2d", state("unknown", "CA")],
  ["Cal.Rptr.3d", state("unknown", "CA")],

  // ── New York ─────────────────────────────────────────────────────
  ["N.Y.", state("supreme", "NY")],
  ["N.Y.2d", state("supreme", "NY")],
  ["N.Y.3d", state("supreme", "NY")],
  ["A.D.", state("appellate", "NY")],
  ["A.D.2d", state("appellate", "NY")],
  ["A.D.3d", state("appellate", "NY")],
  ["Misc.", state("trial", "NY")],
  ["Misc.2d", state("trial", "NY")],
  ["Misc.3d", state("trial", "NY")],
  ["N.Y.S.", state("unknown", "NY")],
  ["N.Y.S.2d", state("unknown", "NY")],
  ["N.Y.S.3d", state("unknown", "NY")],

  // ── Illinois ─────────────────────────────────────────────────────
  ["Ill.", state("supreme", "IL")],
  ["Ill.2d", state("supreme", "IL")],
  ["Ill.App.", state("appellate", "IL")],
  ["Ill.App.2d", state("appellate", "IL")],
  ["Ill.App.3d", state("appellate", "IL")],
  ["Ill.Dec.", state("unknown", "IL")],

  // ── Ohio ────────────────────────────────────────────────────────
  ["Ohio St.", state("supreme", "OH")],
  ["Ohio St.2d", state("supreme", "OH")],
  ["Ohio St.3d", state("supreme", "OH")],
  ["Ohio App.3d", state("appellate", "OH")],

  // ── Pennsylvania ────────────────────────────────────────────────
  ["Pa.", state("supreme", "PA")],
  ["Pa. Super.", state("appellate", "PA")],

  // ── Texas ───────────────────────────────────────────────────────
  ["Tex.", state("supreme", "TX")],

  // ── Florida ─────────────────────────────────────────────────────
  ["Fla.", state("supreme", "FL")],

  // ── Massachusetts ───────────────────────────────────────────────
  ["Mass.", state("supreme", "MA")],
  ["Mass. App. Ct.", state("appellate", "MA")],

  // ── Regional (multi-state, no state field) ───────────────────────
  // Level is "unknown" because regional reporters carry both supreme
  // and appellate court opinions (e.g., A.3d includes MD Court of
  // Appeals decisions). The lower confidence already signals ambiguity.
  ["A.", regional("unknown")],
  ["A.2d", regional("unknown")],
  ["A.3d", regional("unknown")],
  ["S.E.", regional("unknown")],
  ["S.E.2d", regional("unknown")],
  ["S.E.3d", regional("unknown")],
  ["S.W.", regional("unknown")],
  ["S.W.2d", regional("unknown")],
  ["S.W.3d", regional("unknown")],
  ["N.E.", regional("unknown")],
  ["N.E.2d", regional("unknown")],
  ["N.E.3d", regional("unknown")],
  ["N.W.", regional("unknown")],
  ["N.W.2d", regional("unknown")],
  ["N.W.3d", regional("unknown")],
  ["So.", regional("unknown")],
  ["So.2d", regional("unknown")],
  ["So.3d", regional("unknown")],
  ["P.", regional("unknown")],
  ["P.2d", regional("unknown")],
  ["P.3d", regional("unknown")],
])

/**
 * Infer court level and jurisdiction from a reporter abbreviation.
 *
 * @param reporter - Reporter abbreviation (e.g., "F.3d", "Cal.App.5th")
 * @returns CourtInference if reporter is in the curated table, undefined otherwise
 */
export function inferCourtFromReporter(reporter: string): CourtInference | undefined {
  return REPORTER_COURT_MAP.get(reporter)
}
