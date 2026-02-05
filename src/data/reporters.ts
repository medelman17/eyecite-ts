/**
 * Reporter database integration for citation validation
 *
 * This module provides lazy-loadable access to the reporters-db database,
 * containing 1200+ court reporters with variant forms. The library works
 * in degraded mode (pattern-based extraction only) if reporters are not loaded.
 *
 * @example
 * // Degraded mode: extraction works without reporter data
 * const citations = await extract(text)
 *
 * @example
 * // Full mode: load reporters for validation
 * await loadReporters()
 * const citations = await extract(text)  // Now with reporter validation
 */

/**
 * Edition entry from reporters-db
 *
 * Represents a specific edition of a reporter with start/end dates.
 */
export interface ReporterEdition {
  /** Start date in ISO 8601 format */
  start: string | null
  /** End date in ISO 8601 format (null if ongoing) */
  end: string | null
}

/**
 * Reporter entry from reporters-db
 *
 * Represents a single court reporter with all metadata needed for
 * citation validation and enrichment.
 *
 * Note: The reporters-db structure has the actual data; this interface
 * represents it flexibly to handle all variations in the JSON.
 */
export interface ReporterEntry {
  /** Full reporter name (e.g., "Federal Reporter") */
  name: string
  /** Citation type: state, federal, specialty, neutral, state_regional, etc. */
  cite_type: string
  /** Editions keyed by abbreviation (e.g., {"F.2d": {...}, "F.3d": {...}}) */
  editions: Record<string, ReporterEdition>
  /** Variant forms mapped to canonical form (e.g., {"F. 2d": "F.2d"}) */
  variations?: Record<string, string | undefined>
  /** MLZ jurisdiction identifiers (optional) */
  mlz_jurisdiction?: string[]
  /** Publisher (optional) */
  publisher?: string
  /** Notes (optional) */
  notes?: string
}

/**
 * In-memory reporter database with fast O(1) lookup
 *
 * Uses Map-based indexing for case-insensitive abbreviation lookup.
 * All variant forms are indexed to support fuzzy matching.
 */
export interface ReportersDatabase {
  /** Fast O(1) lookup by abbreviation (lowercase normalized keys) */
  byAbbreviation: Map<string, ReporterEntry[]>
  /** All reporters (for iteration/filtering) */
  all: ReporterEntry[]
}

/**
 * Cached database instance (null until loadReporters() called)
 */
let cached: ReportersDatabase | null = null

/**
 * Load reporter database asynchronously with lazy loading
 *
 * Dynamic import prevents loading 1200+ reporters until explicitly requested.
 * Result is cached after first load for subsequent calls.
 *
 * @returns Promise resolving to indexed reporter database
 *
 * @example
 * const db = await loadReporters()
 * const reporters = db.byAbbreviation.get('f.2d')  // Fast O(1) lookup
 */
export async function loadReporters(): Promise<ReportersDatabase> {
  if (cached) return cached

  // Dynamic import prevents loading until requested (keeps core bundle small)
  const data = await import("../../data/reporters.json", {
    assert: { type: "json" },
  })

  const byAbbreviation = new Map<string, ReporterEntry[]>()
  const all: ReporterEntry[] = []

  // reporters.json structure: { "A.": [...], "F.2d": [...], ... }
  const reportersData = (data.default || data) as Record<
    string,
    ReporterEntry[]
  >

  // Build fast lookup index with lowercase normalization
  for (const [canonicalAbbr, reporters] of Object.entries(reportersData)) {
    for (const reporter of reporters) {
      all.push(reporter)

      // Index by all edition abbreviations
      for (const editionAbbr of Object.keys(reporter.editions)) {
        const key = editionAbbr.toLowerCase()
        if (!byAbbreviation.has(key)) {
          byAbbreviation.set(key, [])
        }
        byAbbreviation.get(key)!.push(reporter)
      }

      // Index all variations for fuzzy matching
      for (const [variant, canonical] of Object.entries(
        reporter.variations || {},
      )) {
        const variantKey = variant.toLowerCase()
        if (!byAbbreviation.has(variantKey)) {
          byAbbreviation.set(variantKey, [])
        }
        byAbbreviation.get(variantKey)!.push(reporter)
      }
    }
  }

  cached = {
    byAbbreviation,
    all,
  }
  return cached
}

/**
 * Get cached reporter database synchronously (degraded mode support)
 *
 * Returns null if reporters not loaded yet. This enables the library to
 * work in degraded mode without reporter validation.
 *
 * @returns Cached database or null if not loaded
 *
 * @example
 * const db = getReportersSync()
 * if (db) {
 *   // Full mode: validate citations
 * } else {
 *   // Degraded mode: extract without validation
 * }
 */
export function getReportersSync(): ReportersDatabase | null {
  return cached
}

/**
 * Find reporters by abbreviation (case-insensitive)
 *
 * Loads reporter database if not already loaded. Returns all reporters
 * matching the abbreviation (including variant forms).
 *
 * @param abbr - Reporter abbreviation to look up
 * @returns Promise resolving to matching reporters (empty array if none)
 *
 * @example
 * const reporters = await findReportersByAbbreviation('F.2d')
 * // [{ abbreviation: 'F.2d', name: 'Federal Reporter, Second Series', ... }]
 *
 * @example
 * const unknown = await findReportersByAbbreviation('NONEXISTENT')
 * // [] (empty array, not error)
 */
export async function findReportersByAbbreviation(
  abbr: string,
): Promise<ReporterEntry[]> {
  const db = await loadReporters()
  return db.byAbbreviation.get(abbr.toLowerCase()) ?? []
}
