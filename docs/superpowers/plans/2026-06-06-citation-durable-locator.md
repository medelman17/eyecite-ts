# Citation Durable Locators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `toDurableLocator` / `toDurableLocators` to `eyecite-ts/utils` that turn each extracted citation into a portable, W3C-style durable locator (quote + context + position) that survives document edits.

**Architecture:** A pure, zero-dependency post-extraction utility. Two new internal helpers (`tokenBoundedIndexes`, `contentHash`) plus the builder live under `src/utils/`. The builder slices the citation's `exact` from a caller-supplied `source`, derives sentence-bounded + clamped `prefix`/`suffix` via the existing `getSurroundingContext`, stamps a document-order `occurrence` ordinal, and emits a `DurableLocator`. eyecite produces locators; resolution back to a range is a consumer concern and out of scope.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), Vitest 4, Biome, Changesets, pnpm. Path alias `@/*` → `src/*`.

---

## File Structure

```
src/utils/
  tokenBounded.ts        # NEW: tokenBounded(), tokenBoundedIndexes()
  contentHash.ts         # NEW: contentHash() FNV-1a-64
  durableLocator.ts      # NEW: toDurableLocator(), toDurableLocators()
  types.ts               # MODIFY: + DurableLocator, DurableLocatorOptions
  index.ts               # MODIFY: + export builder + types (NOT the helpers)

tests/utils/
  tokenBounded.test.ts          # NEW
  contentHash.test.ts           # NEW
  durableLocator.test.ts        # NEW
  durableLocator.entry.test.ts  # NEW (public-export smoke test)

.changeset/
  citation-durable-locators.md  # NEW
```

Helpers are intentionally **not** re-exported from `index.ts` (kept internal per the spec); they are unit-tested via their direct module paths.

---

### Task 1: `tokenBoundedIndexes` helper

**Files:**
- Create: `src/utils/tokenBounded.ts`
- Test: `tests/utils/tokenBounded.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/tokenBounded.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { tokenBoundedIndexes } from "@/utils/tokenBounded"

describe("tokenBoundedIndexes", () => {
  it("finds a standalone occurrence", () => {
    expect(tokenBoundedIndexes("see Id. here", "Id.")).toEqual([4])
  })

  it("rejects a needle glued inside a longer word", () => {
    // "Id." occurs inside "gridId." but is glued to a leading word char.
    expect(tokenBoundedIndexes("the gridId. value", "Id.")).toEqual([])
  })

  it("finds every non-overlapping occurrence in document order", () => {
    expect(tokenBoundedIndexes("Id. x Id. y Id.", "Id.")).toEqual([0, 6, 12])
  })

  it("treats a non-word leading edge as always bounded", () => {
    // Needle starts with "§" (non-word), so its left edge needs no boundary
    // even when preceded by a word char.
    expect(tokenBoundedIndexes("x§ 1 y", "§ 1")).toEqual([1])
  })

  it("returns empty for an empty needle", () => {
    expect(tokenBoundedIndexes("anything", "")).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/utils/tokenBounded.test.ts`
Expected: FAIL — `Cannot find module '@/utils/tokenBounded'` (or "failed to resolve import").

- [ ] **Step 3: Write the implementation**

Create `src/utils/tokenBounded.ts`:

```ts
/** True when the character is a word character (\w: [A-Za-z0-9_]). */
function isWord(c: string | undefined): boolean {
  return c !== undefined && /\w/.test(c)
}

/**
 * True when `needle` placed at `at` in `haystack` is not glued to a surrounding
 * word character. A non-word edge of the needle (e.g. the trailing "." of "Id.")
 * never requires a boundary on that side.
 */
export function tokenBounded(haystack: string, at: number, needle: string): boolean {
  const leftOk = !isWord(needle[0]) || at === 0 || !isWord(haystack[at - 1])
  const end = at + needle.length
  const rightOk =
    !isWord(needle[needle.length - 1]) || end >= haystack.length || !isWord(haystack[end])
  return leftOk && rightOk
}

/** Every token-bounded start index of `needle` in `haystack`, in document order. */
export function tokenBoundedIndexes(haystack: string, needle: string): number[] {
  const out: number[] = []
  if (!needle) return out
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) break
    if (tokenBounded(haystack, at, needle)) out.push(at)
    from = at + Math.max(1, needle.length)
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/utils/tokenBounded.test.ts`
Expected: PASS — 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tokenBounded.ts tests/utils/tokenBounded.test.ts
git commit -m "feat(utils): add token-bounded index helper for locators"
```

---

### Task 2: `contentHash` helper

**Files:**
- Create: `src/utils/contentHash.ts`
- Test: `tests/utils/contentHash.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/contentHash.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { contentHash } from "@/utils/contentHash"

describe("contentHash", () => {
  it("is deterministic", () => {
    expect(contentHash("410 U.S. 113", "Roe ", " (1973)")).toBe(
      contentHash("410 U.S. 113", "Roe ", " (1973)"),
    )
  })

  it("does not collide across field boundaries (NUL join)", () => {
    // exact "a b" must differ from exact "a" + prefix "b".
    expect(contentHash("a b")).not.toBe(contentHash("a", "b"))
  })

  it("is stable across Unicode normalization forms", () => {
    // precomposed e-acute (U+00E9) vs decomposed e + combining acute (U+0301).
    expect(contentHash("caf\u00e9")).toBe(contentHash("cafe\u0301"))
  })

  it("returns 16-char lowercase hex", () => {
    expect(contentHash("x")).toMatch(/^[0-9a-f]{16}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/utils/contentHash.test.ts`
Expected: FAIL — `Cannot find module '@/utils/contentHash'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/contentHash.ts`:

```ts
/**
 * Stable FNV-1a-64 hex of the NFC-normalized, NUL-joined quote fields. A cheap,
 * synchronous, dependency-free identity for dedup/equality. Fields are joined on
 * a NUL byte (which cannot appear in citation text) so that, e.g., {exact:"a b"}
 * and {exact:"a", prefix:"b"} do not collide. Iterates UTF-16 code units so any
 * consumer reproduces it with the identical loop. Returns 16-char lowercase hex.
 */
export function contentHash(exact: string, prefix = "", suffix = ""): string {
  const s = `${exact}\u0000${prefix}\u0000${suffix}`.normalize("NFC")
  let h = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i))
    h = BigInt.asUintN(64, h * prime)
  }
  return h.toString(16).padStart(16, "0")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/utils/contentHash.test.ts`
Expected: PASS — 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/contentHash.ts tests/utils/contentHash.test.ts
git commit -m "feat(utils): add FNV-1a-64 contentHash for locator identity"
```

---

### Task 3: `DurableLocator` types

**Files:**
- Modify: `src/utils/types.ts` (append new interfaces)

- [ ] **Step 1: Add the types**

Append to `src/utils/types.ts`:

```ts
/**
 * A portable, host-agnostic locator for a citation, in the style of the W3C Web
 * Annotation selectors. Stores the citation as a quote plus surrounding context
 * (TextQuoteSelector) and an offset hint (TextPositionSelector), so it survives
 * edits to the document. Produced by `toDurableLocator`; resolution back to a
 * concrete range is a consumer concern.
 */
export interface DurableLocator {
  /** Schema version. */
  v: 1
  /** Which text the offsets + quote were taken from. */
  space: "original" | "clean"
  /** W3C TextQuoteSelector — the anchor of record. */
  quote: {
    exact: string
    prefix?: string
    suffix?: string
  }
  /** W3C TextPositionSelector — offsets in `space`. Hint/audit; may drift. */
  position: { start: number; end: number }
  /**
   * Document-order ordinal among token-bounded hits of `exact`. Omitted when the
   * span is not a token-bounded hit (e.g. glued inside a longer word).
   */
  occurrence?: number
  /** Stable FNV-1a-64 hex of exact+prefix+suffix — locator identity. */
  contentHash: string
}

/** Options for `toDurableLocator` / `toDurableLocators`. */
export interface DurableLocatorOptions {
  /**
   * Coordinate space. Default "original": `source` MUST be the text passed to
   * extractCitations. "clean": `source` MUST be eyecite's cleaned text
   * (e.g. cleanText(input).text).
   */
  space?: "original" | "clean"
  /**
   * Use fullSpan (case name through final parenthetical) when present, else the
   * core span. Default false.
   */
  fullSpan?: boolean
  /** Max characters per context side after sentence-bounding. Default 32. */
  contextLength?: number
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm typecheck`
Expected: PASS — no errors (types are additive and unreferenced yet).

- [ ] **Step 3: Commit**

```bash
git add src/utils/types.ts
git commit -m "feat(utils): add DurableLocator types"
```

---

### Task 4: `toDurableLocator` / `toDurableLocators`

**Files:**
- Create: `src/utils/durableLocator.ts`
- Test: `tests/utils/durableLocator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/durableLocator.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"
import type { Span } from "@/types/span"
import { toDurableLocator, toDurableLocators } from "@/utils/durableLocator"
import { tokenBoundedIndexes } from "@/utils/tokenBounded"

/** Minimal citation stub for controlled unit tests. The builder only reads
 *  `span`, `matchedText`, and the absence of `fullSpan`. */
function fakeCitation(span: Span, matchedText: string): Citation {
  return { type: "id", text: matchedText, matchedText, span, confidence: 1 } as unknown as Citation
}

describe("toDurableLocator", () => {
  it("produces a W3C-shaped, version-1 locator for a unique citation", () => {
    const text = "We cite 410 U.S. 113 today."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.v).toBe(1)
    expect(loc.space).toBe("original")
    expect(loc.quote.exact).toBe("410 U.S. 113")
    expect(loc.occurrence).toBe(0)
    expect(loc.contentHash).toMatch(/^[0-9a-f]{16}$/)
  })

  it("sets position to the selected span offsets", () => {
    const text = "We rely on 410 U.S. 113 here."
    const cite = extractCitations(text)[0]!
    const loc = toDurableLocator(cite, text)
    expect(loc.position).toEqual({
      start: cite.span.originalStart,
      end: cite.span.originalEnd,
    })
  })

  it("clamps each context side to contextLength characters", () => {
    const text =
      "In the matter of the very long preliminary discussion that precedes it, 410 U.S. 113 controls."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix!.length).toBe(32)
  })

  it("does not let the prefix cross a sentence boundary", () => {
    const text = "Short prior. The court in 410 U.S. 113 ruled."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix).toBe("The court in ")
    expect(loc.quote.prefix).not.toContain("prior")
  })

  it("omits an empty prefix when the citation starts its sentence", () => {
    const text = "410 U.S. 113 was a landmark ruling."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix).toBeUndefined()
    expect(loc.quote.suffix).toBeDefined()
  })

  it("omits an empty suffix at end-of-text with no trailing punctuation", () => {
    const text = "The controlling authority is 410 U.S. 113"
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.suffix).toBeUndefined()
  })

  it("reads original offsets for original space and clean offsets for clean space", () => {
    const span = { originalStart: 10, originalEnd: 13, cleanStart: 4, cleanEnd: 7 }
    const cite = fakeCitation(span, "abc")
    const o = toDurableLocator(cite, "0123456789abcdef ghij", { space: "original" })
    expect(o.position).toEqual({ start: 10, end: 13 })
    expect(o.quote.exact).toBe("abc")
    const c = toDurableLocator(cite, "see XYZ stuff here now", { space: "clean" })
    expect(c.position).toEqual({ start: 4, end: 7 })
    expect(c.quote.exact).toBe("XYZ")
    expect(c.space).toBe("clean")
  })

  it("uses fullSpan when fullSpan:true and the citation has one", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990)."
    const loc = toDurableLocator(extractCitations(text)[0]!, text, { fullSpan: true })
    expect(loc.quote.exact.startsWith("Smith v. Jones")).toBe(true)
    expect(loc.quote.exact).toContain("(1990)")
  })

  it("falls back to the core span when fullSpan:true but none exists", () => {
    const text = "See 28 U.S.C. § 1331."
    const cite = extractCitations(text)[0]!
    const loc = toDurableLocator(cite, text, { fullSpan: true })
    expect(loc.quote.exact).toBe(cite.matchedText)
  })

  it("stamps occurrence as the document-order ordinal among identical hits", () => {
    const source = "Id. x Id. y Id." // "Id." at 0, 6, 12 — target is the middle one
    const cite = fakeCitation(
      { cleanStart: 6, cleanEnd: 9, originalStart: 6, originalEnd: 9 },
      "Id.",
    )
    expect(toDurableLocator(cite, source).occurrence).toBe(1)
  })

  it("throws when the span is out of range for the source", () => {
    const cite = fakeCitation(
      { cleanStart: 0, cleanEnd: 5, originalStart: 0, originalEnd: 5 },
      "12345",
    )
    expect(() => toDurableLocator(cite, "123")).toThrow(/out of range/)
  })

  it("throws on an empty (zero-length) span", () => {
    const cite = fakeCitation(
      { cleanStart: 2, cleanEnd: 2, originalStart: 2, originalEnd: 2 },
      "",
    )
    expect(() => toDurableLocator(cite, "abcdef")).toThrow(/nothing to anchor/)
  })

  it("throws when source text does not match the citation (original core-span)", () => {
    const text = "See 410 U.S. 113 (1973) for the holding."
    const cite = extractCitations(text)[0]!
    const wrong = "z".repeat(text.length + 10)
    expect(() => toDurableLocator(cite, wrong)).toThrow(/does not equal/)
  })
})

describe("toDurableLocators", () => {
  it("maps over many citations sharing one source", () => {
    const text = "First, 410 U.S. 113. Second, 5 U.S. 137."
    const cites = extractCitations(text)
    const locs = toDurableLocators(cites, text)
    expect(locs.length).toBe(cites.length)
    expect(locs.length).toBeGreaterThan(0)
  })

  it("every located occurrence round-trips to its position (key invariant)", () => {
    const text =
      "See Roe v. Wade, 410 U.S. 113 (1973). Id. at 114. Later, 5 U.S. 137 (1803). Id. at 138."
    const cites = extractCitations(text)
    const locs = toDurableLocators(cites, text)
    expect(locs.length).toBe(cites.length)
    for (const loc of locs) {
      if (loc.occurrence === undefined) continue
      expect(tokenBoundedIndexes(text, loc.quote.exact)[loc.occurrence]).toBe(loc.position.start)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/utils/durableLocator.test.ts`
Expected: FAIL — `Cannot find module '@/utils/durableLocator'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/durableLocator.ts`:

```ts
import type { Citation } from "../types/citation"
import type { Span } from "../types/span"
import { contentHash } from "./contentHash"
import { getSurroundingContext } from "./context"
import { tokenBoundedIndexes } from "./tokenBounded"
import type { DurableLocator, DurableLocatorOptions } from "./types"

/**
 * Build a durable locator for one citation against `source`.
 *
 * `source` MUST be the text matching `options.space` (default "original" — the
 * text passed to extractCitations). See {@link DurableLocatorOptions}. Throws on
 * out-of-range offsets, an empty span, or (on the original-space core-span path)
 * a slice that does not equal `citation.matchedText` — all of which indicate the
 * wrong `source` or `space`.
 */
export function toDurableLocator(
  citation: Citation,
  source: string,
  options: DurableLocatorOptions = {},
): DurableLocator {
  const space = options.space ?? "original"
  const contextLength = options.contextLength ?? 32

  // Choose the span: fullSpan (when requested AND present) else the core span.
  // `fullSpan` lives only on some union members, so guard with `in`.
  let span: Span = citation.span
  let useFull = false
  const full = "fullSpan" in citation ? citation.fullSpan : undefined
  if (options.fullSpan === true && full !== undefined) {
    span = full
    useFull = true
  }

  const start = space === "clean" ? span.cleanStart : span.originalStart
  const end = space === "clean" ? span.cleanEnd : span.originalEnd

  if (start < 0 || end > source.length || start > end) {
    throw new Error(
      `toDurableLocator: span [${start}, ${end}) is out of range for source of length ${source.length} — wrong source text or space?`,
    )
  }

  const exact = source.slice(start, end)
  if (exact.length === 0) {
    throw new Error("toDurableLocator: empty exact quote — nothing to anchor")
  }

  // matchedText is the original-text substring, so it only equals the slice on
  // the original-space core-span path. The clean path and the fullSpan path have
  // no stored equivalent to cross-check against.
  if (space === "original" && !useFull && exact !== citation.matchedText) {
    throw new Error(
      `toDurableLocator: sliced text "${exact}" does not equal citation.matchedText "${citation.matchedText}" — wrong source text or space?`,
    )
  }

  // Sentence-bounded, then clamped to contextLength. getSurroundingContext gives
  // the enclosing legal sentence (it knows "F.3d"/"U.S." periods are not
  // boundaries); we slice raw windows from `source` within those bounds.
  const sentence = getSurroundingContext(source, { start, end })
  const sentStart = sentence.span.start
  const sentEnd = sentence.span.end
  const prefix = source.slice(Math.max(sentStart, start - contextLength), start)
  const suffix = source.slice(end, Math.min(sentEnd, end + contextLength))

  const occurrence = tokenBoundedIndexes(source, exact).indexOf(start)

  return {
    v: 1,
    space,
    quote: {
      exact,
      ...(prefix.length > 0 ? { prefix } : {}),
      ...(suffix.length > 0 ? { suffix } : {}),
    },
    position: { start, end },
    ...(occurrence >= 0 ? { occurrence } : {}),
    contentHash: contentHash(exact, prefix, suffix),
  }
}

/** Build durable locators for many citations sharing one `source` + options. */
export function toDurableLocators(
  citations: Citation[],
  source: string,
  options: DurableLocatorOptions = {},
): DurableLocator[] {
  return citations.map((citation) => toDurableLocator(citation, source, options))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/utils/durableLocator.test.ts`
Expected: PASS — all `toDurableLocator` and `toDurableLocators` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/durableLocator.ts tests/utils/durableLocator.test.ts
git commit -m "feat(utils): add toDurableLocator/toDurableLocators builder"
```

---

### Task 5: Wire public exports

**Files:**
- Modify: `src/utils/index.ts`
- Test: `tests/utils/durableLocator.entry.test.ts`

- [ ] **Step 1: Write the failing entry-point smoke test**

Create `tests/utils/durableLocator.entry.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { toDurableLocator, toDurableLocators } from "@/utils"
import type { DurableLocator, DurableLocatorOptions } from "@/utils"

describe("eyecite-ts/utils durable-locator exports", () => {
  it("re-exports the builder functions from the entry point", () => {
    expect(typeof toDurableLocator).toBe("function")
    expect(typeof toDurableLocators).toBe("function")
  })

  it("the types are usable from the entry point", () => {
    const opts: DurableLocatorOptions = { space: "original" }
    const loc: DurableLocator = toDurableLocator(
      extractCitations("We cite 410 U.S. 113 here.")[0]!,
      "We cite 410 U.S. 113 here.",
      opts,
    )
    expect(loc.quote.exact).toBe("410 U.S. 113")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/utils/durableLocator.entry.test.ts`
Expected: FAIL — `toDurableLocator` is not exported from `@/utils` (import is `undefined`).

- [ ] **Step 3: Add the exports**

Edit `src/utils/index.ts`. Find this line:

```ts
export type { CaseGroup, ContextOptions, SurroundingContext } from "./types"
```

Replace it with:

```ts
export type {
  CaseGroup,
  ContextOptions,
  DurableLocator,
  DurableLocatorOptions,
  SurroundingContext,
} from "./types"
```

Then add, after the existing `export { getSurroundingContext } from "./context"` line:

```ts
export { toDurableLocator, toDurableLocators } from "./durableLocator"
```

(Do NOT export `tokenBoundedIndexes` or `contentHash` — they remain internal helpers per the design.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/utils/durableLocator.entry.test.ts`
Expected: PASS — 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/index.ts tests/utils/durableLocator.entry.test.ts
git commit -m "feat(utils): export durable-locator API from /utils entry"
```

---

### Task 6: Changeset and full verification

**Files:**
- Create: `.changeset/citation-durable-locators.md`

- [ ] **Step 1: Create the changeset**

Create `.changeset/citation-durable-locators.md`:

```md
---
"eyecite-ts": minor
---

Add `toDurableLocator` / `toDurableLocators` to `eyecite-ts/utils`. They turn each extracted citation into a portable, W3C-style durable locator (TextQuoteSelector + TextPositionSelector) — a quote plus sentence-bounded context, a document-order occurrence ordinal, and a content hash — that survives edits to the source document. eyecite produces the locator; resolving it back to a range is left to the consumer.
```

- [ ] **Step 2: Run the full verification suite**

Run: `pnpm exec vitest run tests/utils/`
Expected: PASS — all utils tests, including the four new files.

Run: `pnpm typecheck`
Expected: PASS — no type errors.

Run: `pnpm lint`
Expected: PASS — no lint errors. (Do NOT run `pnpm format`.)

- [ ] **Step 3: Commit**

```bash
git add .changeset/citation-durable-locators.md
git commit -m "chore(changeset): durable locators for citations"
```

---

## Notes for the implementer

- **Run only `pnpm lint`, never `pnpm format`** — the latter reformats ~116 unrelated files.
- The repo has persistent working-tree drift in `package.json` / `pnpm-lock.yaml`. **Never stage them**; `git add` only the exact files listed per task.
- All work happens on the existing `feat/citation-durable-locator` branch (already created).
- `@/` is the path alias for `src/`; tests use it.
- `extractCitations(text)` returns `Citation[]`. `cites[0]` is `Citation | undefined` under `noUncheckedIndexedAccess`, so use `cites[0]!`.
- If `getSurroundingContext` ever needs its sentence-boundary finders shared more directly, factor `findSentenceStart`/`findSentenceEnd` out of `context.ts` rather than duplicating — but the current plan reuses the public `getSurroundingContext` and needs no such refactor.
