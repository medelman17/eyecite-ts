import { describe, it, expect, beforeEach } from "vitest"
import {
  loadReporters,
  getReportersSync,
  findReportersByAbbreviation,
  type ReportersDatabase,
} from "@/data/reporters"

describe("Reporter Database - Lazy Loading", () => {
  it("should return null before loadReporters() is called (degraded mode)", () => {
    // Before loading, getReportersSync should return null
    const db = getReportersSync()
    expect(db).toBeNull()
  })

  it("should load reporters and cache the result", async () => {
    const db = await loadReporters()
    expect(db).not.toBeNull()
    expect(db.byAbbreviation).toBeInstanceOf(Map)
    expect(db.all).toBeInstanceOf(Array)
    expect(db.all.length).toBeGreaterThan(1000) // ~1235 reporters

    // After loading, getReportersSync should return the cached database
    const cachedDb = getReportersSync()
    expect(cachedDb).toBe(db) // Same reference (cached)
  })

  it("should return the same cached instance on subsequent calls", async () => {
    const db1 = await loadReporters()
    const db2 = await loadReporters()
    expect(db1).toBe(db2) // Same reference
  })
})

describe("Reporter Database - Lookup by Abbreviation", () => {
  let _db: ReportersDatabase

  beforeEach(async () => {
    _db = await loadReporters()
  })

  it("should find Federal Reporter, Second Series by F.2d", async () => {
    const reporters = await findReportersByAbbreviation("F.2d")
    expect(reporters.length).toBeGreaterThan(0)

    const reporter = reporters[0]
    expect(reporter.name.toLowerCase()).toContain("federal reporter")
    expect(reporter.editions).toHaveProperty("F.2d")
  })

  it("should find reporters by variant form", async () => {
    // "F. 2d" is a variant of "F.2d"
    const reporters = await findReportersByAbbreviation("F. 2d")
    expect(reporters.length).toBeGreaterThan(0)

    // Should match the same reporter as canonical form
    const canonical = await findReportersByAbbreviation("F.2d")
    expect(reporters[0].name).toBe(canonical[0].name)
  })

  it("should return empty array for unknown reporter", async () => {
    const reporters = await findReportersByAbbreviation("NONEXISTENT")
    expect(reporters).toEqual([])
  })

  it("should perform case-insensitive lookup", async () => {
    const lowercase = await findReportersByAbbreviation("f.2d")
    const uppercase = await findReportersByAbbreviation("F.2D")
    const mixedcase = await findReportersByAbbreviation("F.2d")

    expect(lowercase.length).toBeGreaterThan(0)
    expect(uppercase.length).toBeGreaterThan(0)
    expect(mixedcase.length).toBeGreaterThan(0)

    // All should return the same results
    expect(lowercase[0].name).toBe(uppercase[0].name)
    expect(lowercase[0].name).toBe(mixedcase[0].name)
  })
})

describe("Reporter Database - O(1) Lookup Performance", () => {
  it("should complete 1000 lookups in less than 50ms", async () => {
    await loadReporters()

    const abbreviations = [
      "F.2d",
      "U.S.",
      "S.Ct.",
      "A.2d",
      "P.2d",
      "N.E.2d",
      "So.2d",
      "S.W.2d",
      "Cal.Rptr.",
      "N.Y.S.2d",
    ]

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      const abbr = abbreviations[i % abbreviations.length]
      await findReportersByAbbreviation(abbr)
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50) // Should be ~1-2ms for Map lookups
  }, 10000) // 10-second timeout for safety
})

describe("Reporter Database - Data Structure", () => {
  it("should index all editions of a reporter", async () => {
    const db = await loadReporters()

    // Atlantic Reporter has multiple editions: A., A.2d, A.3d
    const a1 = db.byAbbreviation.get("a.")
    const a2d = db.byAbbreviation.get("a.2d")
    const a3d = db.byAbbreviation.get("a.3d")

    expect(a1).toBeDefined()
    expect(a2d).toBeDefined()
    expect(a3d).toBeDefined()

    // All should reference the same reporter (Atlantic Reporter)
    expect(a1?.[0].name).toContain("Atlantic")
    expect(a2d?.[0].name).toContain("Atlantic")
    expect(a3d?.[0].name).toContain("Atlantic")
  })

  it("should include edition date information", async () => {
    const reporters = await findReportersByAbbreviation("F.2d")
    expect(reporters.length).toBeGreaterThan(0)

    const reporter = reporters[0]
    expect(reporter.editions["F.2d"]).toBeDefined()

    const edition = reporter.editions["F.2d"]
    // F.2d has start and end dates
    expect(edition.start).toBeTruthy()
    expect(edition.end).toBeTruthy()
  })

  it("should include cite_type for classification", async () => {
    const reporters = await findReportersByAbbreviation("F.2d")
    expect(reporters.length).toBeGreaterThan(0)

    const reporter = reporters[0]
    expect(reporter.cite_type).toBeDefined()
    expect(typeof reporter.cite_type).toBe("string")
    expect(reporter.cite_type).toMatch(/federal|state|specialty|neutral/)
  })
})
