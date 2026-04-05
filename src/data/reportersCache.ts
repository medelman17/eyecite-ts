/**
 * Lightweight reporters-db cache — no dynamic imports.
 *
 * Separated from reporters.ts so modules in the core bundle
 * (e.g., filterFalsePositives) can read the cached database
 * without pulling in the heavy reporters.json dynamic import.
 *
 * @module data/reportersCache
 */

import type { ReportersDatabase } from "./reporters"

let cached: ReportersDatabase | null = null

/** Get cached reporter database (null if not yet loaded). */
export function getReportersSync(): ReportersDatabase | null {
  return cached
}

/** Set the cached reporter database (called by loadReporters). */
export function setReportersCache(db: ReportersDatabase): void {
  cached = db
}
