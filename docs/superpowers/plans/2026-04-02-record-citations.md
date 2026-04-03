# Record Citation Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract record citations (R. at, Tr., Dkt., Ex., Compl., etc.) from legal briefs as a separate `extractRecordCitations()` function, with `extractAllCitations()` to merge authority + record results and feed them into the resolver so `Id.` can resolve to record citations.

**Architecture:** Separate two-pass extraction. `extractRecordCitations()` runs its own clean→tokenize→extract pipeline using record-specific patterns. `extractAllCitations()` merges both result sets with span-conflict resolution. The `DocumentResolver` is updated to allow `Id.` to resolve to record citations as antecedents.

**Tech Stack:** TypeScript, Vitest, existing eyecite-ts pipeline (clean/tokenize/extract pattern)

**Spec:** `docs/superpowers/specs/2026-04-02-record-citations-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/citation.ts` | Modify (lines 6-17, 535-546, 551-559) | Add `RecordCitation`, `RecordType`, update unions |
| `src/types/guards.ts` | Modify (lines 12-23) | Add `"record"` to `isFullCitation` |
| `src/patterns/recordPatterns.ts` | Create | All record citation regex patterns (4 groups) |
| `src/patterns/index.ts` | Modify (line ~7) | Re-export `recordPatterns` |
| `src/extract/extractRecord.ts` | Create | Token→RecordCitation extractor + declarant backward search |
| `src/extract/index.ts` | Modify (line ~11) | Re-export `extractRecord` |
| `src/recordIndex.ts` | Create | `extractRecordCitations()`, `extractAllCitations()` public API |
| `src/resolve/DocumentResolver.ts` | Modify (lines 129-156) | Update `resolveId()` to accept record citation antecedents |
| `src/index.ts` | Modify (lines 27-57, 71-73) | Export new types + functions |
| `tests/extract/extractRecord.test.ts` | Create | Unit tests for extractor |
| `tests/patterns/recordPatterns.test.ts` | Create | Pattern matching tests |
| `tests/integration/recordCitations.test.ts` | Create | Full pipeline integration tests |
| `tests/extract/recordCollisions.test.ts` | Create | Collision/disambiguation tests |
| `tests/extract/recordRegression.test.ts` | Create | Authority extraction unchanged with extractAllCitations |
| `tests/integration/recordBoundary.test.ts` | Create | Boundary cases: Reply variants, document edges, ¶ forms |
| `tests/integration/extractAllMerge.test.ts` | Create | Merge + resolution tests |

---

### Task 1: Add RecordCitation Type and Update Unions

**Files:**
- Modify: `src/types/citation.ts:6-17,535-559`
- Modify: `src/types/guards.ts:12-23`
- Test: `pnpm typecheck`

- [ ] **Step 1: Add RecordType and RecordCitation to `src/types/citation.ts`**

After the `ConstitutionalCitation` interface (around line 478), add:

```typescript
/**
 * Type of record document being cited.
 */
export type RecordType =
  | "record"                  // R.
  | "joint_appendix"          // J.A., JA
  | "petition_appendix"       // Pet. App.
  | "appendix"                // App., A.
  | "supplemental_appendix"   // S.A., SA
  | "addendum"                // Addend.
  | "brief"                   // Br.
  | "transcript"              // Tr., Trial Tr.
  | "hearing_transcript"      // Hr'g Tr.
  | "sentencing_transcript"   // Sent. Tr.
  | "plea_transcript"         // Plea Tr.
  | "argument_transcript"     // Arg. Tr.
  | "deposition"              // Dep., Dep. Tr.
  | "docket"                  // Dkt., Doc., DE
  | "ecf"                     // ECF, ECF No.
  | "exhibit"                 // Ex., PX, DX, GX
  | "complaint"               // Compl., Am. Compl.
  | "answer"                  // Ans.
  | "affidavit"               // Aff.
  | "declaration"             // Decl.
  | "motion"                  // Mot.
  | "opposition"              // Opp'n, Opp.
  | "reply"                   // Reply (requires party prefix or ¶)
  | "memorandum"              // Mem.
  | "stipulation"             // Stip., Jt. Stip.
  | "interrogatory"           // Interrog.
  | "request_for_admission"   // RFA, Req. Admis.
  | "statement_of_facts"      // SMF, SOMF, SUF, RSMF, CSOF
  | "clerks_record"           // CR (Texas)
  | "reporters_record"        // RR (Texas)
  | "clerks_transcript"       // CT (California)
  | "reporters_transcript"    // RT (California)

/**
 * Record citation — references a document within the case's own record.
 *
 * Unlike authority citations (cases, statutes), record citations point to the
 * trial record, not published law, and are never shepardized.
 *
 * @example "R. at 45"
 * @example "Smith Dep. 45:3"
 * @example "Compl. ¶ 10"
 * @example "ECF No. 12-2"
 * @example "Pet. App. 12a"
 */
export interface RecordCitation extends CitationBase {
  type: "record"
  recordType: RecordType

  /** Party prefix: "Def.", "Pl.", "Gov't", "Resp.", "Pet." */
  party?: string
  /** Declarant/deponent name from backward search: "Smith", "Dr. Jones" */
  declarant?: string

  /** Page number (page-ref and transcript groups) */
  page?: number
  /** End page for ranges: R. at 45-52 → pageEnd=52 */
  pageEnd?: number
  /** Page suffix letter: "a" in Pet. App. 12a */
  pageSuffix?: string
  /** End page suffix: "a" in Pet. App. 12a-32a → pageEndSuffix="a" */
  pageEndSuffix?: string

  /** Line number (transcripts: Tr. 50:1-15 → line=1) */
  line?: number
  /** End line for ranges: Tr. 50:1-15 → lineEnd=15 */
  lineEnd?: number

  /** Paragraph number (pleadings: Compl. ¶ 10) */
  paragraph?: number
  /** End paragraph for ranges: Compl. ¶¶ 10-12 → paragraphEnd=12 */
  paragraphEnd?: number

  /** Docket/ECF entry number */
  entryNumber?: number
  /** ECF attachment number: ECF 12-2 → attachmentNumber=2 */
  attachmentNumber?: number

  /** Exhibit designation: "A" in Ex. A, "5" in Ex. 5 */
  designation?: string

  /** Volume for multi-volume records: 2CR4 → volume=2 */
  volume?: number
}
```

- [ ] **Step 2: Add `"record"` to `CitationType` (line 6)**

Change the `CitationType` union to include `"record"`:

```typescript
export type CitationType =
  | "case"
  | "statute"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "constitutional"
  | "record"
  | "id"
  | "supra"
  | "shortFormCase"
```

- [ ] **Step 3: Add `RecordCitation` to the `Citation` union (line 535)**

```typescript
export type Citation =
  | FullCaseCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | RecordCitation
  | IdCitation
  | SupraCitation
  | ShortFormCaseCitation
```

- [ ] **Step 4: Add `"record"` to `FullCitationType` (line 551)**

```typescript
export type FullCitationType =
  | "case"
  | "statute"
  | "journal"
  | "neutral"
  | "publicLaw"
  | "federalRegister"
  | "statutesAtLarge"
  | "constitutional"
  | "record"
```

- [ ] **Step 5: Add `"record"` to `FullCitation` union**

Find the `FullCitation` type (around line 563) and add `RecordCitation`:

```typescript
export type FullCitation =
  | FullCaseCitation
  | StatuteCitation
  | JournalCitation
  | NeutralCitation
  | PublicLawCitation
  | FederalRegisterCitation
  | StatutesAtLargeCitation
  | ConstitutionalCitation
  | RecordCitation
```

- [ ] **Step 6: Update `isFullCitation` guard in `src/types/guards.ts` (line 12)**

```typescript
export function isFullCitation(citation: Citation): citation is FullCitation {
  return (
    citation.type === "case" ||
    citation.type === "statute" ||
    citation.type === "journal" ||
    citation.type === "neutral" ||
    citation.type === "publicLaw" ||
    citation.type === "federalRegister" ||
    citation.type === "statutesAtLarge" ||
    citation.type === "constitutional" ||
    citation.type === "record"
  )
}
```

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no consumers use exhaustive switch yet for record)

- [ ] **Step 8: Commit**

```bash
git add src/types/citation.ts src/types/guards.ts
git commit -m "feat(types): add RecordCitation type and RecordType union (#74)"
```

---

### Task 2: Create Record Pattern Definitions

**Files:**
- Create: `src/patterns/recordPatterns.ts`
- Modify: `src/patterns/index.ts`
- Test: `tests/patterns/recordPatterns.test.ts`

- [ ] **Step 1: Write failing pattern test for page-reference group**

Create `tests/patterns/recordPatterns.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { recordPatterns } from "@/patterns/recordPatterns"

function findMatches(text: string, patternId: string): string[] {
  const pattern = recordPatterns.find((p) => p.id === patternId)
  if (!pattern) throw new Error(`Pattern not found: ${patternId}`)
  // Reset lastIndex for global regex
  pattern.regex.lastIndex = 0
  const matches: string[] = []
  let m: RegExpExecArray | null
  while ((m = pattern.regex.exec(text)) !== null) {
    matches.push(m[0])
  }
  return matches
}

describe("recordPatterns", () => {
  describe("page-reference patterns", () => {
    it("matches R. at PAGE", () => {
      expect(findMatches("R. at 45", "record-page")).toContainEqual("R. at 45")
    })

    it("matches R. PAGE (without at)", () => {
      expect(findMatches("R. 45", "record-page")).toContainEqual("R. 45")
    })

    it("matches J.A. PAGE variants", () => {
      expect(findMatches("J.A. 200", "record-page")).toContainEqual("J.A. 200")
      expect(findMatches("JA 200", "record-page")).toContainEqual("JA 200")
      expect(findMatches("JA200", "record-page")).toContainEqual("JA200")
    })

    it("matches Pet. App. with suffix", () => {
      expect(findMatches("Pet. App. 12a", "record-page")).toContainEqual("Pet. App. 12a")
    })

    it("matches App. PAGE", () => {
      expect(findMatches("App. 15", "record-page")).toContainEqual("App. 15")
    })

    it("matches S.A. and SA", () => {
      expect(findMatches("S.A. 15", "record-page")).toContainEqual("S.A. 15")
      expect(findMatches("SA 15", "record-page")).toContainEqual("SA 15")
    })

    it("matches Br. with party prefix", () => {
      expect(findMatches("Resp. Br. 22", "record-page")).toContainEqual("Resp. Br. 22")
    })

    it("matches page ranges", () => {
      expect(findMatches("R. at 45-52", "record-page")).toContainEqual("R. at 45-52")
    })

    it("matches A. PAGE (low confidence form)", () => {
      expect(findMatches("A. 123", "record-appendix-a")).toContainEqual("A. 123")
    })

    it("does NOT match A.2d (Atlantic Reporter)", () => {
      expect(findMatches("123 A.2d 456", "record-appendix-a")).toEqual([])
    })

    it("does NOT match A. with series suffix", () => {
      expect(findMatches("A. 2d", "record-appendix-a")).toEqual([])
    })
  })

  describe("Texas/California state patterns", () => {
    it("matches CR PAGE", () => {
      expect(findMatches("CR 123", "record-state")).toContainEqual("CR 123")
    })

    it("matches multi-volume 2CR4", () => {
      expect(findMatches("2CR4", "record-state")).toContainEqual("2CR4")
    })

    it("matches RR PAGE", () => {
      expect(findMatches("RR 123", "record-state")).toContainEqual("RR 123")
    })

    it("matches CT and RT (California)", () => {
      expect(findMatches("CT 150", "record-state")).toContainEqual("CT 150")
      expect(findMatches("RT 200", "record-state")).toContainEqual("RT 200")
    })

    it("matches Supp. CR and Supp. RR", () => {
      expect(findMatches("Supp. CR 10", "record-state")).toContainEqual("Supp. CR 10")
      expect(findMatches("Supp. RR 22", "record-state")).toContainEqual("Supp. RR 22")
    })

    it("matches ALCR", () => {
      expect(findMatches("ALCR 5", "record-state")).toContainEqual("ALCR 5")
    })
  })

  describe("paragraph-reference patterns", () => {
    it("matches Compl. ¶ NUM", () => {
      expect(findMatches("Compl. ¶ 10", "record-paragraph")).toContainEqual("Compl. ¶ 10")
    })

    it("matches paragraph ranges with ¶¶", () => {
      expect(findMatches("Compl. ¶¶ 10-12", "record-paragraph")).toContainEqual(
        "Compl. ¶¶ 10-12",
      )
    })

    it("matches Am. Compl.", () => {
      expect(findMatches("Am. Compl. ¶ 15", "record-paragraph")).toContainEqual(
        "Am. Compl. ¶ 15",
      )
    })

    it("matches Aff. with declarant name", () => {
      expect(findMatches("Jones Aff. ¶ 2", "record-paragraph")).toContainEqual("Aff. ¶ 2")
    })

    it("matches Decl.", () => {
      expect(findMatches("Decl. ¶ 8", "record-paragraph")).toContainEqual("Decl. ¶ 8")
    })

    it("matches Mot., Opp'n, Mem.", () => {
      expect(findMatches("Mot. ¶ 5", "record-paragraph")).toContainEqual("Mot. ¶ 5")
      expect(findMatches("Opp'n ¶ 3", "record-paragraph")).toContainEqual("Opp'n ¶ 3")
      expect(findMatches("Mem. ¶ 7", "record-paragraph")).toContainEqual("Mem. ¶ 7")
    })

    it("matches Jt. Stip.", () => {
      expect(findMatches("Jt. Stip. ¶ 5", "record-paragraph")).toContainEqual("Jt. Stip. ¶ 5")
    })

    it("matches SMF, SOMF, SUF with ¶", () => {
      expect(findMatches("SMF ¶ 5", "record-paragraph")).toContainEqual("SMF ¶ 5")
      expect(findMatches("SOMF ¶ 3", "record-paragraph")).toContainEqual("SOMF ¶ 3")
    })

    it("matches Interrog. No. and RFA No.", () => {
      expect(findMatches("Interrog. No. 5", "record-paragraph")).toContainEqual("Interrog. No. 5")
      expect(findMatches("RFA No. 12", "record-paragraph")).toContainEqual("RFA No. 12")
    })

    it("does NOT match bare Reply 5", () => {
      expect(findMatches("Reply 5", "record-reply")).toEqual([])
    })

    it("matches Reply ¶ 5", () => {
      expect(findMatches("Reply ¶ 5", "record-reply")).toContainEqual("Reply ¶ 5")
    })

    it("matches Def. Reply 5 (party prefix, no ¶)", () => {
      expect(findMatches("Def. Reply 5", "record-reply")).toContainEqual("Reply 5")
    })

    it("matches (Reply 5) (parenthetical, no ¶)", () => {
      expect(findMatches("(Reply 5)", "record-reply")).toContainEqual("Reply 5")
    })
  })

  describe("entry-reference patterns", () => {
    it("matches Dkt. No. NUM", () => {
      expect(findMatches("Dkt. No. 45", "record-entry")).toContainEqual("Dkt. No. 45")
    })

    it("matches Dkt. NUM", () => {
      expect(findMatches("Dkt. 45", "record-entry")).toContainEqual("Dkt. 45")
    })

    it("matches ECF No. NUM", () => {
      expect(findMatches("ECF No. 12", "record-entry")).toContainEqual("ECF No. 12")
    })

    it("matches ECF with attachment", () => {
      expect(findMatches("ECF 12-2", "record-entry")).toContainEqual("ECF 12-2")
    })

    it("matches Doc. NUM with at PAGE", () => {
      expect(findMatches("Doc. 45 at 3", "record-entry")).toContainEqual("Doc. 45 at 3")
    })

    it("matches DE NUM", () => {
      expect(findMatches("DE 45", "record-entry")).toContainEqual("DE 45")
    })

    it("matches Ex. with letter designation", () => {
      expect(findMatches("Ex. A", "record-entry")).toContainEqual("Ex. A")
    })

    it("matches Ex. with number designation", () => {
      expect(findMatches("Ex. 5", "record-entry")).toContainEqual("Ex. 5")
    })

    it("matches PX, DX, GX", () => {
      expect(findMatches("PX 5", "record-entry")).toContainEqual("PX 5")
      expect(findMatches("DX 3", "record-entry")).toContainEqual("DX 3")
      expect(findMatches("GX 5", "record-entry")).toContainEqual("GX 5")
    })
  })

  describe("transcript patterns", () => {
    it("matches Tr. PAGE", () => {
      expect(findMatches("Tr. 50", "record-transcript")).toContainEqual("Tr. 50")
    })

    it("matches Tr. PAGE:LINE", () => {
      expect(findMatches("Tr. 50:1", "record-transcript")).toContainEqual("Tr. 50:1")
    })

    it("matches Tr. PAGE:LINE-LINE", () => {
      expect(findMatches("Tr. 50:1-15", "record-transcript")).toContainEqual("Tr. 50:1-15")
    })

    it("matches Trial Tr.", () => {
      expect(findMatches("Trial Tr. 13:5", "record-transcript")).toContainEqual("Trial Tr. 13:5")
    })

    it("matches Hr'g Tr.", () => {
      expect(findMatches("Hr'g Tr. 22:5-10", "record-transcript")).toContainEqual(
        "Hr'g Tr. 22:5-10",
      )
    })

    it("matches Sent. Tr., Plea Tr., Arg. Tr.", () => {
      expect(findMatches("Sent. Tr. 14:3", "record-transcript")).toContainEqual("Sent. Tr. 14:3")
      expect(findMatches("Plea Tr. 8:1-5", "record-transcript")).toContainEqual("Plea Tr. 8:1-5")
      expect(findMatches("Arg. Tr. 15:20", "record-transcript")).toContainEqual("Arg. Tr. 15:20")
    })

    it("matches Dep. PAGE:LINE", () => {
      expect(findMatches("Dep. 13:5", "record-transcript")).toContainEqual("Dep. 13:5")
    })

    it("matches Dep. Tr.", () => {
      expect(findMatches("Dep. Tr. 45:10", "record-transcript")).toContainEqual("Dep. Tr. 45:10")
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/patterns/recordPatterns.test.ts`
Expected: FAIL — cannot import `recordPatterns`

- [ ] **Step 3: Create `src/patterns/recordPatterns.ts`**

```typescript
import type { Pattern } from "./casePatterns"

// ============================================================================
// Party prefixes — consumed by extractor, not in pattern match
// (patterns capture the abbreviation + pinpoint only; party prefix is a
//  backward-search concern handled in the extractor)
// ============================================================================

// ============================================================================
// Pattern Group 1: Page-Reference
// [PARTY]? ABBREV [at]? PAGE[-PAGE]?[SUFFIX]?
// ============================================================================

/**
 * Abbreviation alternation for page-reference record citations.
 *
 * Ordered longest-first to prevent shorter prefixes from stealing matches.
 * Handles spacing variants (J.A. vs JA, S.A. vs SA).
 *
 * A\. is listed last with a negative lookbehind for digits and negative
 * lookahead for series suffixes (2d, 3d, 4th) to avoid matching Atlantic Reporter.
 */
const PAGE_REF_ABBREVS = [
  "Pet\\.\\s?App\\.",  // Pet. App.
  "Addend\\.",         // Addend.
  "J\\.A\\.",          // J.A.
  "S\\.A\\.",          // S.A.
  "App\\.",            // App.
  "Br\\.",             // Br.
  "JA",                // JA (no period)
  "SA",                // SA (no period)
  "R\\.",              // R.
  // A. is NOT here — it has its own pattern with disambiguation guards
].join("|")

/**
 * Page-reference pattern.
 * Matches: R. at 45, J.A. 200, JA200, Pet. App. 12a, App. 15, Br. 14, R. at 45-52
 * A. requires NO preceding digit (to avoid "123 A.2d") and NO trailing series suffix.
 */
const PAGE_REF_REGEX = new RegExp(
  `(?:(?<=^|[\\s(])(?:${PAGE_REF_ABBREVS}))`
  + `\\s?(?:at\\s)?`                       // optional "at "
  + `(\\d+[a-z]?)(?:-(\\d+[a-z]?))?`       // page[suffix][-page[suffix]]
  + `(?=[\\s).,;:]|$)`,                     // lookahead boundary
  "g",
)

/**
 * A. (appendix short form) — separated from PAGE_REF_REGEX because it needs
 * disambiguation guards to avoid matching Atlantic Reporter (A.2d, A.3d).
 *
 * Guards:
 * - Negative lookbehind: no preceding digit (rejects "123 A.2d")
 * - Negative lookahead on captured page: no series suffix (rejects "A. 2d")
 *
 * Matches: A. 123, A. at 45, A. 12a
 * Rejects: 123 A.2d 456, A. 3d, 5 A. 2d
 */
const A_DOT_REGEX = new RegExp(
  `(?<=^|[\\s(])(?<!\\d\\s)`          // no preceding digit
  + `A\\.`
  + `\\s?(?:at\\s)?`                   // optional "at "
  + `(\\d+[a-z]?)(?:-(\\d+[a-z]?))?`  // page[suffix][-page[suffix]]
  + `(?!\\s?(?:2d|3d|4th))`           // no trailing series suffix
  + `(?=[\\s).,;:]|$)`,
  "g",
)

/**
 * State-specific page-reference pattern (Texas CR/RR, California CT/RT).
 * Matches: CR 123, 2CR4, RR 123, 2RR45, CT 150, RT 200, Supp. CR 10, ALCR 5
 */
const STATE_RECORD_REGEX = new RegExp(
  `(?:(?<=^|[\\s(])`
  + `(?:`
  +   `(?:Supp\\.\\s)?(?:CR|RR)`  // [Supp.] CR/RR (Texas)
  +   `|ALCR`                      // Texas Rule 34.5(a)
  +   `|CT|RT`                     // California
  + `)`
  + `|`
  + `(\\d+)(?:CR|RR)`             // multi-volume: 2CR, 3RR (digit prefix)
  + `)`
  + `\\s?(\\d+)`                   // page number
  + `(?=[\\s).,;:]|$)`,
  "g",
)

// ============================================================================
// Pattern Group 2: Paragraph-Reference
// [NAME]? [PARTY]? ABBREV ¶¶? NUM[-NUM]?  or  ABBREV No. NUM
// ============================================================================

const PARA_REF_ABBREVS = [
  "Am\\.\\s?Compl\\.",  // Am. Compl.
  "Jt\\.\\s?Stip\\.",   // Jt. Stip.
  "Req\\.\\s?Admis\\.", // Req. Admis.
  "Resp\\.\\s?SMF",     // Resp. SMF
  "Compl\\.",            // Compl.
  "Interrog\\.",         // Interrog.
  "Opp(?:'n|\\.)\\b",   // Opp'n or Opp.
  "Decl\\.",             // Decl.
  "Stip\\.",             // Stip.
  "Memo?\\.",            // Mem. or Memo.
  "Mot\\.",              // Mot.
  "Aff\\.",              // Aff.
  "Answer\\b",           // Answer (full word)
  "Ans\\.",              // Ans.
  "RSMF",                // RSMF
  "SOMF",                // SOMF
  "CSOF",                // CSOF
  "SMF",                 // SMF
  "SUF",                 // SUF
].join("|")

/**
 * Paragraph-reference pattern.
 * Matches: Compl. ¶ 10, Compl. ¶¶ 10-12, Jt. Stip. ¶ 5, Interrog. No. 5, RFA No. 12
 *
 * Reply is NOT in this alternation — it requires special handling (party prefix,
 * parenthetical wrapping, or ¶ symbol) to avoid false positives.
 */
const PARA_REF_REGEX = new RegExp(
  `(?<=^|[\\s(])`
  + `(?:${PARA_REF_ABBREVS})`
  + `\\s?`
  + `(?:`
  +   `¶¶?\\s?(\\d+)(?:-(\\d+))?`  // ¶ NUM or ¶¶ NUM-NUM
  +   `|No\\.\\s?(\\d+)`            // No. NUM (for Interrog., RFA)
  + `)`
  + `(?=[\\s).,;:]|$)`,
  "g",
)

/**
 * Reply-specific pattern — requires party prefix OR parenthetical wrapping OR ¶ symbol.
 * Bare "Reply 5" is excluded.
 *
 * Three match paths:
 * 1. Reply ¶ NUM — paragraph symbol present (standalone or with party prefix)
 * 2. PARTY Reply NUM — party prefix present (no ¶ required)
 * 3. (Reply NUM — opening paren present (parenthetical wrapping)
 */
const REPLY_REGEX = new RegExp(
  `(?:`
  // Path 1: Reply with ¶ symbol (party prefix optional, handled by backward search)
  + `(?<=^|[\\s(])Reply\\s?¶¶?\\s?(\\d+)(?:-(\\d+))?`
  + `|`
  // Path 2: Party prefix + Reply + bare number (no ¶ required)
  + `(?<=(?:Def\\.|Defs\\.|Pl\\.|Pls\\.|Pet\\.|Resp\\.)\\s)Reply\\s(\\d+)(?:-(\\d+))?`
  + `|`
  // Path 3: Parenthetical-wrapped Reply + bare number
  + `(?<=\\()Reply\\s(\\d+)(?:-(\\d+))?`
  + `)`
  + `(?=[\\s).,;:]|$)`,
  "g",
)

/**
 * RFA (bare acronym) — also matches RFA No. NUM
 */
const RFA_REGEX = new RegExp(
  `(?<=^|[\\s(])`
  + `RFA`
  + `\\s?(?:No\\.\\s?)?(\\d+)`
  + `(?=[\\s).,;:]|$)`,
  "g",
)

// ============================================================================
// Pattern Group 3: Entry-Reference
// [PARTY]? ABBREV [No.]? NUM[-NUM]? [at PAGE]?
// ============================================================================

const ENTRY_REF_ABBREVS = [
  "ECF\\s?No\\.",  // ECF No.
  "Dkt\\.\\s?No\\.", // Dkt. No.
  "Doc\\.\\s?No\\.", // Doc. No.
  "Dkt\\.",          // Dkt.
  "Doc\\.",          // Doc.
  "ECF",             // ECF (without No.)
  "DE",              // DE
].join("|")

/**
 * Entry-reference pattern for docket/ECF citations.
 * Matches: Dkt. No. 45, ECF 12-2, Doc. 45 at 3, DE 45
 */
const ENTRY_REF_REGEX = new RegExp(
  `(?<=^|[\\s(])`
  + `(?:${ENTRY_REF_ABBREVS})`
  + `\\s?(\\d+)(?:-(\\d+))?`           // entry number [-attachment]
  + `(?:\\s?at\\s?(\\d+))?`             // optional "at PAGE"
  + `(?=[\\s).,;:]|$)`,
  "g",
)

/**
 * Exhibit pattern — handles Ex., PX, DX, GX, Gov't Ex., Pl. Ex., Def. Ex.
 * Matches: Ex. A, Ex. 5, PX 5, DX 3, GX 5
 * Designation can be a letter (A-Z) or number.
 */
const EXHIBIT_REGEX = new RegExp(
  `(?<=^|[\\s(])`
  + `(?:Gov't\\s?Ex\\.|Pl\\.\\s?Ex\\.|Def\\.\\s?Ex\\.|Ex\\.|PX|DX|GX)`
  + `\\s?([A-Z]|\\d+)`                 // designation: letter or number
  + `(?:\\s?at\\s?(\\d+))?`             // optional "at PAGE"
  + `(?=[\\s).,;:]|$)`,
  "g",
)

// ============================================================================
// Pattern Group 4: Transcript
// [NAME]? ABBREV PAGE[:LINE[-LINE]]?
// ============================================================================

const TRANSCRIPT_ABBREVS = [
  "Trial\\s?Tr\\.",  // Trial Tr.
  "Hr'g\\s?Tr\\.",   // Hr'g Tr.
  "Sent\\.\\s?Tr\\.",// Sent. Tr.
  "Plea\\s?Tr\\.",   // Plea Tr.
  "Arg\\.\\s?Tr\\.", // Arg. Tr.
  "Dep\\.\\s?Tr\\.", // Dep. Tr.
  "Dep\\.",           // Dep. (without Tr.)
  "Tr\\.",            // Tr. (bare — last, most ambiguous)
].join("|")

/**
 * Transcript pattern.
 * Matches: Tr. 50, Tr. 50:1, Tr. 50:1-15, Hr'g Tr. 22:5-10, Smith Dep. 45:3
 */
const TRANSCRIPT_REGEX = new RegExp(
  `(?<=^|[\\s(])`
  + `(?:${TRANSCRIPT_ABBREVS})`
  + `\\s?(\\d+)`                        // page
  + `(?::(\\d+)(?:-(\\d+))?)?`          // optional :line[-line]
  + `(?=[\\s).,;:]|$)`,
  "g",
)

// ============================================================================
// Exported Pattern Array
// ============================================================================

export const recordPatterns: Pattern[] = [
  // Group 1: Page-reference
  {
    id: "record-page",
    regex: PAGE_REF_REGEX,
    description: "Record page-reference citations (R. at, J.A., Pet. App., App., Br., etc.)",
    type: "record",
  },
  {
    id: "record-appendix-a",
    regex: A_DOT_REGEX,
    description: "A. (appendix short form) with Atlantic Reporter disambiguation",
    type: "record",
  },
  {
    id: "record-state",
    regex: STATE_RECORD_REGEX,
    description: "State-specific record citations (TX: CR/RR, CA: CT/RT)",
    type: "record",
  },
  // Group 2: Paragraph-reference
  {
    id: "record-paragraph",
    regex: PARA_REF_REGEX,
    description: "Record paragraph-reference citations (Compl., Aff., Decl., Mot., etc.)",
    type: "record",
  },
  {
    id: "record-reply",
    regex: REPLY_REGEX,
    description: "Reply citations requiring ¶ symbol (bare Reply NUM excluded)",
    type: "record",
  },
  {
    id: "record-rfa",
    regex: RFA_REGEX,
    description: "Request for Admission citations (RFA No. NUM)",
    type: "record",
  },
  // Group 3: Entry-reference
  {
    id: "record-entry",
    regex: ENTRY_REF_REGEX,
    description: "Docket/ECF entry-reference citations (Dkt., ECF, Doc., DE)",
    type: "record",
  },
  {
    id: "record-exhibit",
    regex: EXHIBIT_REGEX,
    description: "Exhibit citations (Ex., PX, DX, GX)",
    type: "record",
  },
  // Group 4: Transcript
  {
    id: "record-transcript",
    regex: TRANSCRIPT_REGEX,
    description: "Transcript citations (Tr., Hr'g Tr., Dep., etc.)",
    type: "record",
  },
]
```

- [ ] **Step 4: Export from `src/patterns/index.ts`**

Add to `src/patterns/index.ts`:

```typescript
export * from "./recordPatterns"
```

- [ ] **Step 5: Run pattern tests**

Run: `pnpm exec vitest run tests/patterns/recordPatterns.test.ts`
Expected: Most tests PASS. Some may need regex tuning — fix iteratively until all pass.

- [ ] **Step 6: Run full test suite to confirm no regressions**

Run: `pnpm exec vitest run`
Expected: All existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/patterns/recordPatterns.ts src/patterns/index.ts tests/patterns/recordPatterns.test.ts
git commit -m "feat(patterns): add record citation regex patterns (#74)"
```

---

### Task 3: Create Record Extractor with Declarant Backward Search

**Files:**
- Create: `src/extract/extractRecord.ts`
- Modify: `src/extract/index.ts`
- Test: `tests/extract/extractRecord.test.ts`

- [ ] **Step 1: Write failing extractor unit tests**

Create `tests/extract/extractRecord.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractRecord } from "@/extract/extractRecord"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../helpers/transformationMap"

describe("extractRecord", () => {
  const tmap = createIdentityMap()

  describe("page-reference extraction", () => {
    it("extracts R. at PAGE", () => {
      const token: Token = {
        text: "R. at 45",
        span: { cleanStart: 0, cleanEnd: 8 },
        type: "record",
        patternId: "record-page",
      }
      const citation = extractRecord(token, tmap, "R. at 45")
      expect(citation.type).toBe("record")
      expect(citation.recordType).toBe("record")
      expect(citation.page).toBe(45)
      expect(citation.confidence).toBeLessThanOrEqual(0.55) // lower tier + no parens
    })

    it("extracts J.A. PAGE", () => {
      const token: Token = {
        text: "J.A. 200",
        span: { cleanStart: 0, cleanEnd: 8 },
        type: "record",
        patternId: "record-page",
      }
      const citation = extractRecord(token, tmap, "J.A. 200")
      expect(citation.recordType).toBe("joint_appendix")
      expect(citation.page).toBe(200)
    })

    it("extracts Pet. App. PAGE with suffix", () => {
      const token: Token = {
        text: "Pet. App. 12a",
        span: { cleanStart: 0, cleanEnd: 13 },
        type: "record",
        patternId: "record-page",
      }
      const citation = extractRecord(token, tmap, "Pet. App. 12a")
      expect(citation.recordType).toBe("petition_appendix")
      expect(citation.page).toBe(12)
      expect(citation.pageSuffix).toBe("a")
      expect(citation.confidence).toBeGreaterThanOrEqual(0.85) // multi-word compound
    })

    it("extracts page ranges", () => {
      const token: Token = {
        text: "R. at 45-52",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "record",
        patternId: "record-page",
      }
      const citation = extractRecord(token, tmap, "R. at 45-52")
      expect(citation.page).toBe(45)
      expect(citation.pageEnd).toBe(52)
    })

    it("extracts A. PAGE with low confidence", () => {
      const token: Token = {
        text: "A. 123",
        span: { cleanStart: 0, cleanEnd: 6 },
        type: "record",
        patternId: "record-appendix-a",
      }
      const citation = extractRecord(token, tmap, "A. 123")
      expect(citation.recordType).toBe("appendix")
      expect(citation.confidence).toBeLessThanOrEqual(0.55) // lower tier
    })
  })

  describe("state-specific extraction", () => {
    it("extracts CR PAGE (Texas)", () => {
      const token: Token = {
        text: "CR 123",
        span: { cleanStart: 0, cleanEnd: 6 },
        type: "record",
        patternId: "record-state",
      }
      const citation = extractRecord(token, tmap, "CR 123")
      expect(citation.recordType).toBe("clerks_record")
      expect(citation.page).toBe(123)
    })

    it("extracts multi-volume 2CR4", () => {
      const token: Token = {
        text: "2CR4",
        span: { cleanStart: 0, cleanEnd: 4 },
        type: "record",
        patternId: "record-state",
      }
      const citation = extractRecord(token, tmap, "2CR4")
      expect(citation.recordType).toBe("clerks_record")
      expect(citation.volume).toBe(2)
      expect(citation.page).toBe(4)
    })
  })

  describe("paragraph-reference extraction", () => {
    it("extracts Compl. ¶ NUM", () => {
      const token: Token = {
        text: "Compl. ¶ 10",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, "Compl. ¶ 10")
      expect(citation.recordType).toBe("complaint")
      expect(citation.paragraph).toBe(10)
    })

    it("extracts paragraph ranges", () => {
      const token: Token = {
        text: "Compl. ¶¶ 10-12",
        span: { cleanStart: 0, cleanEnd: 16 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, "Compl. ¶¶ 10-12")
      expect(citation.paragraph).toBe(10)
      expect(citation.paragraphEnd).toBe(12)
    })

    it("extracts Interrog. No. NUM", () => {
      const token: Token = {
        text: "Interrog. No. 5",
        span: { cleanStart: 0, cleanEnd: 15 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, "Interrog. No. 5")
      expect(citation.recordType).toBe("interrogatory")
      expect(citation.paragraph).toBe(5)
    })
  })

  describe("entry-reference extraction", () => {
    it("extracts Dkt. No. NUM", () => {
      const token: Token = {
        text: "Dkt. No. 45",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "record",
        patternId: "record-entry",
      }
      const citation = extractRecord(token, tmap, "Dkt. No. 45")
      expect(citation.recordType).toBe("docket")
      expect(citation.entryNumber).toBe(45)
    })

    it("extracts ECF with attachment number", () => {
      const token: Token = {
        text: "ECF 12-2",
        span: { cleanStart: 0, cleanEnd: 8 },
        type: "record",
        patternId: "record-entry",
      }
      const citation = extractRecord(token, tmap, "ECF 12-2")
      expect(citation.recordType).toBe("ecf")
      expect(citation.entryNumber).toBe(12)
      expect(citation.attachmentNumber).toBe(2)
    })

    it("extracts entry with at PAGE", () => {
      const token: Token = {
        text: "Doc. 45 at 3",
        span: { cleanStart: 0, cleanEnd: 12 },
        type: "record",
        patternId: "record-entry",
      }
      const citation = extractRecord(token, tmap, "Doc. 45 at 3")
      expect(citation.entryNumber).toBe(45)
      expect(citation.page).toBe(3)
    })
  })

  describe("exhibit extraction", () => {
    it("extracts Ex. with letter designation", () => {
      const token: Token = {
        text: "Ex. A",
        span: { cleanStart: 0, cleanEnd: 5 },
        type: "record",
        patternId: "record-exhibit",
      }
      const citation = extractRecord(token, tmap, "Ex. A")
      expect(citation.recordType).toBe("exhibit")
      expect(citation.designation).toBe("A")
    })

    it("extracts PX NUM", () => {
      const token: Token = {
        text: "PX 5",
        span: { cleanStart: 0, cleanEnd: 4 },
        type: "record",
        patternId: "record-exhibit",
      }
      const citation = extractRecord(token, tmap, "PX 5")
      expect(citation.recordType).toBe("exhibit")
      expect(citation.designation).toBe("5")
    })
  })

  describe("transcript extraction", () => {
    it("extracts Tr. PAGE:LINE-LINE", () => {
      const token: Token = {
        text: "Tr. 50:1-15",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, "Tr. 50:1-15")
      expect(citation.recordType).toBe("transcript")
      expect(citation.page).toBe(50)
      expect(citation.line).toBe(1)
      expect(citation.lineEnd).toBe(15)
    })

    it("extracts Hr'g Tr. with high confidence", () => {
      const token: Token = {
        text: "Hr'g Tr. 22:5-10",
        span: { cleanStart: 0, cleanEnd: 17 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, "Hr'g Tr. 22:5-10")
      expect(citation.recordType).toBe("hearing_transcript")
      expect(citation.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it("extracts Dep. PAGE:LINE", () => {
      const token: Token = {
        text: "Dep. 13:5",
        span: { cleanStart: 0, cleanEnd: 9 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, "Dep. 13:5")
      expect(citation.recordType).toBe("deposition")
      expect(citation.page).toBe(13)
      expect(citation.line).toBe(5)
    })
  })

  describe("declarant backward search", () => {
    it("extracts declarant name from preceding text", () => {
      const text = "See Smith Dep. 45:3 for details"
      const token: Token = {
        text: "Dep. 45:3",
        span: { cleanStart: 10, cleanEnd: 19 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, text)
      expect(citation.declarant).toBe("Smith")
    })

    it("extracts multi-word declarant", () => {
      const text = "See Dr. Smith Dep. 45:3"
      const token: Token = {
        text: "Dep. 45:3",
        span: { cleanStart: 14, cleanEnd: 23 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, text)
      expect(citation.declarant).toBe("Dr. Smith")
    })

    it("separates party prefix from declarant", () => {
      const text = "See Def. Smith Decl. ¶ 8"
      const token: Token = {
        text: "Decl. ¶ 8",
        span: { cleanStart: 15, cleanEnd: 24 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, text)
      expect(citation.party).toBe("Def.")
      expect(citation.declarant).toBe("Smith")
    })

    it("strips leading article from declarant", () => {
      const text = "the Jefferson Aff. ¶ 2"
      const token: Token = {
        text: "Aff. ¶ 2",
        span: { cleanStart: 14, cleanEnd: 22 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, text)
      expect(citation.declarant).toBe("Jefferson")
    })

    it("returns undefined declarant when no name found", () => {
      const text = "the Dep. 45:3"
      const token: Token = {
        text: "Dep. 45:3",
        span: { cleanStart: 4, cleanEnd: 13 },
        type: "record",
        patternId: "record-transcript",
      }
      const citation = extractRecord(token, tmap, text)
      expect(citation.declarant).toBeUndefined()
    })
  })

  describe("confidence scoring", () => {
    it("bumps confidence when wrapped in parentheses", () => {
      const text = "(R. at 45.)"
      const token: Token = {
        text: "R. at 45",
        span: { cleanStart: 1, cleanEnd: 9 },
        type: "record",
        patternId: "record-page",
      }
      const citation = extractRecord(token, tmap, text)
      // Base 0.45 + 0.1 paren bump = 0.55
      expect(citation.confidence).toBeGreaterThanOrEqual(0.5)
    })

    it("bumps confidence when party prefix present", () => {
      const text = "Def. Mot. ¶ 5"
      const token: Token = {
        text: "Mot. ¶ 5",
        span: { cleanStart: 5, cleanEnd: 13 },
        type: "record",
        patternId: "record-paragraph",
      }
      const citation = extractRecord(token, tmap, text)
      // Base 0.45 + 0.05 party bump
      expect(citation.confidence).toBeGreaterThanOrEqual(0.45)
      expect(citation.party).toBe("Def.")
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/extract/extractRecord.test.ts`
Expected: FAIL — cannot import `extractRecord`

- [ ] **Step 3: Implement `src/extract/extractRecord.ts`**

This is the core extractor implementation. The function signature:

```typescript
import type { RecordCitation, RecordType } from "../types/citation"
import type { Token } from "../tokenize/tokenizer"
import type { TransformationMap } from "../types/span"
import { resolveOriginalSpan } from "../types/span"

// ============================================================================
// Abbreviation → RecordType mapping tables
// ============================================================================

const PAGE_REF_MAP: Record<string, RecordType> = {
  "R.": "record",
  "J.A.": "joint_appendix",
  "JA": "joint_appendix",
  "Pet. App.": "petition_appendix",
  "App.": "appendix",
  "A.": "appendix",
  "S.A.": "supplemental_appendix",
  "SA": "supplemental_appendix",
  "Addend.": "addendum",
  "Br.": "brief",
}

const STATE_MAP: Record<string, RecordType> = {
  "CR": "clerks_record",
  "RR": "reporters_record",
  "CT": "clerks_transcript",
  "RT": "reporters_transcript",
  "ALCR": "clerks_record",
  "Supp. CR": "clerks_record",
  "Supp. RR": "reporters_record",
}

const PARA_REF_MAP: Record<string, RecordType> = {
  "Compl.": "complaint",
  "Am. Compl.": "complaint",
  "Ans.": "answer",
  "Answer": "answer",
  "Aff.": "affidavit",
  "Decl.": "declaration",
  "Mot.": "motion",
  "Opp'n": "opposition",
  "Opp.": "opposition",
  "Reply": "reply",
  "Mem.": "memorandum",
  "Memo.": "memorandum",
  "Stip.": "stipulation",
  "Jt. Stip.": "stipulation",
  "Interrog.": "interrogatory",
  "Req. Admis.": "request_for_admission",
  "RFA": "request_for_admission",
  "SMF": "statement_of_facts",
  "SUF": "statement_of_facts",
  "SOMF": "statement_of_facts",
  "RSMF": "statement_of_facts",
  "CSOF": "statement_of_facts",
  "Resp. SMF": "statement_of_facts",
}

const ENTRY_MAP: Record<string, RecordType> = {
  "Dkt.": "docket",
  "Dkt. No.": "docket",
  "Doc.": "docket",
  "Doc. No.": "docket",
  "DE": "docket",
  "ECF": "ecf",
  "ECF No.": "ecf",
}

const TRANSCRIPT_MAP: Record<string, RecordType> = {
  "Tr.": "transcript",
  "Trial Tr.": "transcript",
  "Hr'g Tr.": "hearing_transcript",
  "Sent. Tr.": "sentencing_transcript",
  "Plea Tr.": "plea_transcript",
  "Arg. Tr.": "argument_transcript",
  "Dep.": "deposition",
  "Dep. Tr.": "deposition",
}

// ============================================================================
// Confidence tiers
// ============================================================================

/** Multi-word compounds — highest confidence */
const HIGH_CONFIDENCE: Set<string> = new Set([
  "Pet. App.", "ECF No.", "Hr'g Tr.", "Sent. Tr.", "Plea Tr.",
  "Arg. Tr.", "Jt. Stip.", "Am. Compl.", "Dep. Tr.", "Trial Tr.",
  "Dkt. No.", "Doc. No.", "Req. Admis.", "Supp. CR", "Supp. RR",
  "Resp. SMF", "Gov't Ex.",
])

/** Abbreviation + distinctive pinpoint — medium confidence */
const MEDIUM_CONFIDENCE: Set<string> = new Set([
  "J.A.", "JA", "S.A.", "SA", "Compl.", "Aff.", "Decl.", "Dkt.",
  "CR", "RR", "CT", "RT", "ALCR", "SMF", "SOMF", "SUF", "RSMF",
  "CSOF", "Stip.", "Interrog.", "RFA",
])

// Everything else (R., A., Ex., Doc., DE, Br., Mot., etc.) → lower confidence

const PAREN_BUMP = 0.1
const PARTY_BUMP = 0.05

// ============================================================================
// Party prefix detection
// ============================================================================

const PARTY_PREFIXES = [
  "Def.", "Defs.", "Pl.", "Pls.", "Pet.", "Resp.", "Gov't",
  "Appellant", "Appellee", "Petitioner", "Respondent",
]

const PARTY_RE = new RegExp(
  `(${PARTY_PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s+$`,
)

// ============================================================================
// Declarant backward search
// ============================================================================

/** Record types that support declarant backward search */
const DECLARANT_TYPES: Set<RecordType> = new Set([
  "deposition", "affidavit", "declaration",
])

const LEADING_ARTICLE_RE = /^(?:the|a|an)\s+/i
const BOUNDARY_RE = /(?:\n\n|;|\(|\d\.\s)/

/**
 * Search backward from citation start for a declarant name.
 * Follows the extractCaseName architectural pattern.
 */
function extractDeclarant(
  cleanedText: string,
  coreStart: number,
  maxLookback = 50,
): string | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  let preceding = cleanedText.substring(searchStart, coreStart).trimEnd()

  // Find the last boundary and truncate
  let lastBoundary = -1
  let m: RegExpExecArray | null
  const boundarySearch = new RegExp(BOUNDARY_RE.source, "g")
  while ((m = boundarySearch.exec(preceding)) !== null) {
    lastBoundary = m.index + m[0].length
  }
  if (lastBoundary !== -1) {
    preceding = preceding.substring(lastBoundary)
  }

  // Strip trailing party prefix if present (already captured separately)
  preceding = preceding.replace(PARTY_RE, "").trimEnd()

  // Take the last sequence of capitalized words (name-like tokens)
  // Allows: letters, periods (Dr.), apostrophes (O'Brien), ampersands (&), hyphens
  const nameMatch = /(?:[A-Z][A-Za-z.''-]+(?:\s+(?:&\s+)?[A-Z][A-Za-z.''-]+)*)$/.exec(preceding)
  if (!nameMatch) return undefined

  let name = nameMatch[0].trim()
  // Strip leading article
  name = name.replace(LEADING_ARTICLE_RE, "").trim()

  return name || undefined
}

// ============================================================================
// Main extractor
// ============================================================================

/**
 * Extracts a RecordCitation from a token.
 *
 * @param token - Token from the tokenizer
 * @param transformationMap - Position mapping for clean→original conversion
 * @param cleanedText - Full cleaned text (for backward search)
 */
export function extractRecord(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): RecordCitation {
  const { text, span, patternId } = token
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  const fullSpan = {
    cleanStart: span.cleanStart,
    cleanEnd: span.cleanEnd,
    originalStart,
    originalEnd,
  }

  // Dispatch to pattern-group-specific parser
  switch (patternId) {
    case "record-page":
      return parsePageRef(text, fullSpan, cleanedText, span.cleanStart)
    case "record-state":
      return parseStateRef(text, fullSpan, cleanedText, span.cleanStart)
    case "record-paragraph":
    case "record-reply":
    case "record-rfa":
      return parseParaRef(text, fullSpan, patternId, cleanedText, span.cleanStart)
    case "record-entry":
      return parseEntryRef(text, fullSpan, cleanedText, span.cleanStart)
    case "record-exhibit":
      return parseExhibitRef(text, fullSpan, cleanedText, span.cleanStart)
    case "record-transcript":
      return parseTranscriptRef(text, fullSpan, cleanedText, span.cleanStart)
    default:
      // Fallback — return minimal citation
      return buildCitation(text, fullSpan, "record", 0.3)
  }
}

// ============================================================================
// Pattern-group parsers
// ============================================================================

// Each parser function:
// 1. Re-runs a more detailed regex on token.text to extract fields
// 2. Maps the abbreviation to a RecordType
// 3. Computes confidence
// 4. Calls extractDeclarant / detectPartyPrefix if applicable
// 5. Returns RecordCitation
//
// parsePageRef is implemented in full as a reference. The remaining five
// parsers (parseStateRef, parseParaRef, parseEntryRef, parseExhibitRef,
// parseTranscriptRef) follow the same structure — dispatch on abbreviation,
// parse fields from the matched text, compute confidence, return via
// buildCitation().

/** Regex to re-parse a page-reference token into structured fields. */
const PAGE_REF_DETAIL = /^(Pet\.\s?App\.|Addend\.|J\.A\.|S\.A\.|App\.|Br\.|JA|SA|R\.|A\.)\s?(?:at\s)?(\d+)([a-z])?(?:-(\d+)([a-z])?)?$/

function parsePageRef(
  text: string,
  span: RecordCitation["span"],
  cleanedText: string | undefined,
  cleanStart: number,
): RecordCitation {
  const m = PAGE_REF_DETAIL.exec(text)
  if (!m) return buildCitation(text, span, "record", 0.3)

  const abbrev = m[1]
  const recordType = PAGE_REF_MAP[abbrev] ?? "record"
  const page = parseInt(m[2], 10)
  const pageSuffix = m[3] || undefined
  const pageEnd = m[4] ? parseInt(m[4], 10) : undefined
  const pageEndSuffix = m[5] || undefined

  // Confidence tier
  let confidence: number
  if (HIGH_CONFIDENCE.has(abbrev)) {
    confidence = 0.85
  } else if (MEDIUM_CONFIDENCE.has(abbrev)) {
    confidence = 0.65
  } else {
    confidence = 0.45
  }

  // Confidence bumps
  let party: string | undefined
  if (cleanedText) {
    party = detectPartyPrefix(cleanedText, cleanStart)
    if (party) confidence += PARTY_BUMP
    if (cleanStart > 0 && cleanedText[cleanStart - 1] === "(") {
      confidence += PAREN_BUMP
    }
  }

  return buildCitation(text, span, recordType, Math.min(confidence, 1.0), {
    page,
    pageEnd,
    pageSuffix,
    pageEndSuffix,
    party,
  })
}

// parseStateRef, parseParaRef, parseEntryRef, parseExhibitRef,
// parseTranscriptRef each follow the same pattern as parsePageRef:
// 1. Define a detail regex matching the token text
// 2. Extract the abbreviation → look up RecordType in the corresponding *_MAP
// 3. Parse numeric fields (page, line, paragraph, entryNumber, etc.)
// 4. Compute confidence from HIGH/MEDIUM/LOWER tiers
// 5. Call extractDeclarant() for DECLARANT_TYPES
// 6. Call detectPartyPrefix() and apply bumps
// 7. Return via buildCitation()
//
// Each is ~30-50 lines following parsePageRef's structure.

/**
 * Detect a party prefix in the text immediately before the citation.
 */
function detectPartyPrefix(
  cleanedText: string,
  coreStart: number,
): string | undefined {
  const searchStart = Math.max(0, coreStart - 30)
  const preceding = cleanedText.substring(searchStart, coreStart)
  const m = PARTY_RE.exec(preceding)
  return m ? m[1] : undefined
}

function buildCitation(
  text: string,
  span: RecordCitation["span"],
  recordType: RecordType,
  confidence: number,
  fields: Partial<RecordCitation> = {},
): RecordCitation {
  return {
    type: "record",
    recordType,
    text,
    span,
    matchedText: text,
    confidence,
    processTimeMs: 0,
    patternsChecked: 0,
    ...fields,
  }
}
```

The `parsePageRef`, `parseStateRef`, `parseParaRef`, `parseEntryRef`, `parseExhibitRef`, and `parseTranscriptRef` helper functions each:
1. Run a detailed regex on `token.text` to extract structured fields
2. Look up the abbreviation in the corresponding `*_MAP` table to get `recordType`
3. Compute base confidence from `HIGH_CONFIDENCE` / `MEDIUM_CONFIDENCE` sets
4. Call `detectPartyPrefix()` on preceding text if applicable
5. Call `extractDeclarant()` for deposition/affidavit/declaration types
6. Apply confidence bumps (parenthetical, party prefix)
7. Return via `buildCitation()`

Implement all six parsers following this pattern. Each is ~30-50 lines of regex parsing and field mapping.

- [ ] **Step 4: Export from `src/extract/index.ts`**

Add to `src/extract/index.ts`:

```typescript
export * from "./extractRecord"
```

- [ ] **Step 5: Run extractor tests**

Run: `pnpm exec vitest run tests/extract/extractRecord.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add src/extract/extractRecord.ts src/extract/index.ts tests/extract/extractRecord.test.ts
git commit -m "feat(extract): add record citation extractor with declarant search (#74)"
```

---

### Task 4: Create Public API — `extractRecordCitations()` and `extractAllCitations()`

**Files:**
- Create: `src/recordIndex.ts`
- Modify: `src/index.ts`
- Test: `tests/integration/recordCitations.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/recordCitations.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractRecordCitations, extractAllCitations, extractCitations } from "eyecite-ts"

describe("extractRecordCitations", () => {
  it("extracts record citations from appellate brief text", () => {
    const text = "The record shows (R. at 45) that Smith testified (Tr. 50:1-15)."
    const citations = extractRecordCitations(text)
    expect(citations).toHaveLength(2)
    expect(citations[0].recordType).toBe("record")
    expect(citations[0].page).toBe(45)
    expect(citations[1].recordType).toBe("transcript")
    expect(citations[1].page).toBe(50)
    expect(citations[1].line).toBe(1)
    expect(citations[1].lineEnd).toBe(15)
  })

  it("extracts docket and exhibit citations from trial brief text", () => {
    const text = "Plaintiff's motion (Dkt. No. 45) relies on Ex. A and Compl. ¶ 10."
    const citations = extractRecordCitations(text)
    expect(citations).toHaveLength(3)
    const types = citations.map((c) => c.recordType)
    expect(types).toContain("docket")
    expect(types).toContain("exhibit")
    expect(types).toContain("complaint")
  })

  it("extracts Texas state-specific record citations", () => {
    const text = "The clerk's record establishes (CR 123) and the testimony (2RR45) confirms."
    const citations = extractRecordCitations(text)
    expect(citations.length).toBeGreaterThanOrEqual(2)
    const cr = citations.find((c) => c.recordType === "clerks_record")
    expect(cr).toBeDefined()
    expect(cr!.page).toBe(123)
    const rr = citations.find((c) => c.recordType === "reporters_record")
    expect(rr).toBeDefined()
    expect(rr!.volume).toBe(2)
    expect(rr!.page).toBe(45)
  })

  it("extracts declarant names via backward search", () => {
    const text = "As Smith Dep. 45:3 shows and Jones Aff. ¶ 2 confirms."
    const citations = extractRecordCitations(text)
    const dep = citations.find((c) => c.recordType === "deposition")
    expect(dep?.declarant).toBe("Smith")
    const aff = citations.find((c) => c.recordType === "affidavit")
    expect(aff?.declarant).toBe("Jones")
  })
})

describe("extractAllCitations", () => {
  it("returns both authority and record citations sorted by position", () => {
    const text = "In Smith v. Jones, 500 F.2d 123 (2d Cir. 1970), the court noted (R. at 45)."
    const all = extractAllCitations(text)
    expect(all.length).toBeGreaterThanOrEqual(2)
    const types = all.map((c) => c.type)
    expect(types).toContain("case")
    expect(types).toContain("record")
    // Sorted by span position
    for (let i = 1; i < all.length; i++) {
      expect(all[i].span.cleanStart).toBeGreaterThanOrEqual(all[i - 1].span.cleanStart)
    }
  })

  it("resolves span conflicts by confidence (authority wins ties)", () => {
    // This text contains "A. 123" which could be appendix or part of a case cite
    const text = "See A. 123 for the appendix reference."
    const all = extractAllCitations(text)
    // Should not produce duplicate overlapping citations
    const spans = all.map((c) => [c.span.cleanStart, c.span.cleanEnd])
    for (let i = 1; i < spans.length; i++) {
      // No full containment overlap
      const prev = spans[i - 1]
      const curr = spans[i]
      const overlaps = curr[0] < prev[1] && curr[1] > prev[0]
      if (overlaps) {
        // Both should have warnings
        expect(all[i].warnings?.length).toBeGreaterThan(0)
      }
    }
  })

  it("produces same authority results as extractCitations alone", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2d Cir. 1970). Doe v. Roe, 600 F.2d 789 (9th Cir. 1971)."
    const authorityOnly = extractCitations(text)
    const all = extractAllCitations(text)
    const authorityFromAll = all.filter((c) => c.type !== "record")
    expect(authorityFromAll.length).toBe(authorityOnly.length)
    for (let i = 0; i < authorityOnly.length; i++) {
      expect(authorityFromAll[i].type).toBe(authorityOnly[i].type)
      expect(authorityFromAll[i].span.cleanStart).toBe(authorityOnly[i].span.cleanStart)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/recordCitations.test.ts`
Expected: FAIL — cannot import `extractRecordCitations`

- [ ] **Step 3: Implement `src/recordIndex.ts`**

```typescript
import type { RecordCitation } from "./types/citation"
import type { Citation } from "./types/citation"
import type { ExtractOptions } from "./extract/extractCitations"
import { cleanText } from "./clean"
import { tokenize } from "./tokenize"
import { recordPatterns } from "./patterns/recordPatterns"
import { extractRecord } from "./extract/extractRecord"
import { extractCitations } from "./extract/extractCitations"
import { resolveCitations } from "./resolve"

export interface RecordCitationOptions {
  cleaners?: ExtractOptions["cleaners"]
}

export interface ExtractAllOptions extends ExtractOptions {}

/**
 * Extract record citations from legal text.
 *
 * Record citations reference documents within a case's own record
 * (transcripts, exhibits, docket entries, pleadings, appendices, etc.).
 *
 * This runs a separate pipeline from `extractCitations()` — it does not
 * extract authority citations (cases, statutes, etc.).
 */
export function extractRecordCitations(
  text: string,
  options?: RecordCitationOptions,
): RecordCitation[] {
  // Phase 1: Clean
  const { cleaned, transformationMap } = cleanText(text, options?.cleaners)

  // Phase 2: Tokenize with record patterns only
  const tokens = tokenize(cleaned, recordPatterns)

  // Phase 3: Extract
  const citations: RecordCitation[] = []
  for (const token of tokens) {
    try {
      const citation = extractRecord(token, transformationMap, cleaned)
      citations.push(citation)
    } catch {
      // Skip tokens that fail extraction
    }
  }

  return citations
}

/**
 * Extract both authority and record citations, merged and sorted by position.
 *
 * Runs `extractCitations()` and `extractRecordCitations()` independently,
 * then merges results with span-conflict resolution.
 *
 * IMPORTANT: Resolution (if `resolve: true`) runs AFTER the merge so that
 * `Id.` can resolve to record citations. We must NOT pass `resolve` through
 * to `extractCitations` — that would resolve against only authority citations,
 * defeating the purpose of the merged pipeline.
 */
export function extractAllCitations(
  text: string,
  options?: ExtractAllOptions,
): Citation[] {
  // Strip resolve from options — we handle it after merging
  const { resolve, ...extractOpts } = options ?? {}

  const authority = extractCitations(text, { ...extractOpts, resolve: false })
  const record = extractRecordCitations(text, { cleaners: extractOpts?.cleaners })
  const merged = mergeAndDedup([...authority, ...record])

  if (resolve) {
    return resolveCitations(merged, text, options)
  }
  return merged
}

/**
 * Merge citations from two passes, resolve span conflicts.
 *
 * Rules:
 * 1. Sort by cleanStart
 * 2. If two citations fully overlap, higher confidence wins; authority wins ties
 * 3. Partial overlaps: keep both, add warning
 */
function mergeAndDedup(citations: Citation[]): Citation[] {
  if (citations.length <= 1) return citations

  // Sort by span start position
  citations.sort((a, b) => a.span.cleanStart - b.span.cleanStart)

  const result: Citation[] = []
  for (const citation of citations) {
    const prev = result[result.length - 1]
    if (!prev) {
      result.push(citation)
      continue
    }

    const prevEnd = prev.span.cleanEnd
    const currStart = citation.span.cleanStart
    const currEnd = citation.span.cleanEnd

    // No overlap
    if (currStart >= prevEnd) {
      result.push(citation)
      continue
    }

    // Full containment: one span fully inside the other
    const prevContainsCurr = currStart >= prev.span.cleanStart && currEnd <= prevEnd
    const currContainsPrev = prev.span.cleanStart >= currStart && prevEnd <= currEnd

    if (prevContainsCurr || currContainsPrev) {
      // Higher confidence wins; authority wins ties
      const prevScore = prev.confidence + (prev.type !== "record" ? 0.001 : 0)
      const currScore = citation.confidence + (citation.type !== "record" ? 0.001 : 0)

      if (currScore > prevScore) {
        result[result.length - 1] = citation // replace prev
      }
      // else keep prev (already in result)
      continue
    }

    // Partial overlap — keep both with warnings
    const warning = { message: "Overlapping span with adjacent record citation" }
    prev.warnings = [...(prev.warnings || []), warning]
    citation.warnings = [...(citation.warnings || []), warning]
    result.push(citation)
  }

  return result
}
```

- [ ] **Step 4: Export from `src/index.ts`**

Add these exports to `src/index.ts`:

In the type exports section (around line 27), add `RecordCitation` and `RecordType`:

```typescript
export type {
  // ... existing exports ...
  RecordCitation,
  RecordType,
} from "./types"
```

In the main API section (around line 72), add:

```typescript
export { extractRecordCitations, extractAllCitations } from "./recordIndex"
export type { RecordCitationOptions, ExtractAllOptions } from "./recordIndex"
```

- [ ] **Step 5: Run integration tests**

Run: `pnpm exec vitest run tests/integration/recordCitations.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/recordIndex.ts src/index.ts tests/integration/recordCitations.test.ts
git commit -m "feat: add extractRecordCitations() and extractAllCitations() public API (#74)"
```

---

### Task 5: Update DocumentResolver for Id. → Record Citation Resolution

**Files:**
- Modify: `src/resolve/DocumentResolver.ts:129-156`
- Test: `tests/integration/extractAllMerge.test.ts`

- [ ] **Step 1: Write failing resolution test**

Create `tests/integration/extractAllMerge.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractAllCitations, resolveCitations } from "eyecite-ts"

describe("Id. resolution to record citations", () => {
  it("resolves Id. to immediately preceding record citation", () => {
    const text = "The record shows (R. at 45). Id. at 50."
    const citations = extractAllCitations(text)
    const resolved = resolveCitations(citations, text)

    const idCite = resolved.find((c) => c.type === "id")
    expect(idCite).toBeDefined()
    expect(idCite!.resolution).toBeDefined()
    expect(idCite!.resolution!.resolvedTo).toBeDefined()

    // The Id. should resolve to the R. at 45 citation
    const antecedentIndex = idCite!.resolution!.resolvedTo
    const antecedent = resolved[antecedentIndex!]
    expect(antecedent.type).toBe("record")
  })

  it("resolves Id. to authority citation when it is closer than record citation", () => {
    const text = "See R. at 45. Then Smith v. Jones, 500 F.2d 123 (2d Cir. 1970). Id. at 130."
    const citations = extractAllCitations(text)
    const resolved = resolveCitations(citations, text)

    const idCite = resolved.find((c) => c.type === "id")
    expect(idCite).toBeDefined()
    const antecedentIndex = idCite!.resolution!.resolvedTo
    const antecedent = resolved[antecedentIndex!]
    // Should resolve to the case citation, not the record citation
    expect(antecedent.type).toBe("case")
  })

  it("resolves chained Id. through record citation", () => {
    const text = "The record shows (R. at 45). Id. at 50. Id."
    const citations = extractAllCitations(text)
    const resolved = resolveCitations(citations, text)

    const idCites = resolved.filter((c) => c.type === "id")
    expect(idCites.length).toBe(2)
    // Both should resolve (first to R., second to first Id. → R.)
    expect(idCites[0].resolution?.resolvedTo).toBeDefined()
    expect(idCites[1].resolution?.resolvedTo).toBeDefined()
  })
})

describe("extractAllCitations merge semantics", () => {
  it("does not produce duplicate citations for non-overlapping spans", () => {
    const text = "Compl. ¶ 10. Smith v. Jones, 500 F.2d 123 (2d Cir. 1970)."
    const all = extractAllCitations(text)
    // Should have exactly one record + one case citation
    expect(all.filter((c) => c.type === "record")).toHaveLength(1)
    expect(all.filter((c) => c.type === "case")).toHaveLength(1)
  })
})

describe("extractAllCitations with resolve: true", () => {
  it("resolves Id. to record citation when resolve option is passed", () => {
    const text = "The record shows (R. at 45). Id. at 50."
    const all = extractAllCitations(text, { resolve: true })

    const idCite = all.find((c) => c.type === "id")
    expect(idCite).toBeDefined()
    // Must resolve to R. at 45, not fail — this verifies resolution
    // runs AFTER the merge (not before, on only authority citations)
    expect(idCite!.resolution).toBeDefined()
    expect(idCite!.resolution!.resolvedTo).toBeDefined()

    const antecedent = all[idCite!.resolution!.resolvedTo!]
    expect(antecedent.type).toBe("record")
  })

  it("authority resolution is unchanged when no record citations present", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2d Cir. 1970). Id. at 130."
    const all = extractAllCitations(text, { resolve: true })

    const idCite = all.find((c) => c.type === "id")
    expect(idCite).toBeDefined()
    expect(idCite!.resolution!.resolvedTo).toBeDefined()

    const antecedent = all[idCite!.resolution!.resolvedTo!]
    expect(antecedent.type).toBe("case")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/extractAllMerge.test.ts`
Expected: FAIL — `Id.` does not resolve to record citation (only resolves to `type === "case"`)

- [ ] **Step 3: Update `resolveId()` in `src/resolve/DocumentResolver.ts`**

Change the `resolveId` method (lines 129-156) from:

```typescript
private resolveId(_citation: IdCitation): ResolutionResult | undefined {
  const currentIndex = this.context.citationIndex

  // Find most recent full case citation (Id. only resolves to case citations, not statutes/journals)
  let antecedentIndex: number | undefined
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = this.citations[i]
    if (candidate.type === "case") {
      antecedentIndex = i
      break
    }
  }

  // Check if we have a previous case citation
  if (antecedentIndex === undefined) {
    return this.createFailureResult("No preceding full case citation found")
  }
```

To:

```typescript
private resolveId(_citation: IdCitation): ResolutionResult | undefined {
  const currentIndex = this.context.citationIndex

  // Find most recent full citation that Id. can refer to.
  // Id. resolves to case citations and record citations (Bluebook permits
  // Id. for record cites). It does NOT resolve to statutes, journals, etc.
  let antecedentIndex: number | undefined
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = this.citations[i]
    if (candidate.type === "case" || candidate.type === "record") {
      antecedentIndex = i
      break
    }
  }

  if (antecedentIndex === undefined) {
    return this.createFailureResult("No preceding case or record citation found")
  }
```

This is a two-line change: add `|| candidate.type === "record"` to the condition, and update the error message.

- [ ] **Step 4: Also update the context tracking in `resolve()` (line 108)**

In the `resolve()` method, the `default` branch currently only calls `trackFullCitation` for full citations via `isFullCitation()`. Since we added `"record"` to `isFullCitation` in Task 1, this already works — record citations will be tracked as full citations. Verify this by checking that `isFullCitation` includes `"record"` (done in Task 1 Step 6).

No code change needed here — just verification.

- [ ] **Step 5: Run resolution tests**

Run: `pnpm exec vitest run tests/integration/extractAllMerge.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `pnpm exec vitest run`
Expected: All tests PASS (including all existing resolution tests).

- [ ] **Step 7: Commit**

```bash
git add src/resolve/DocumentResolver.ts tests/integration/extractAllMerge.test.ts
git commit -m "feat(resolve): allow Id. to resolve to record citations (#74)"
```

---

### Task 6: Add Collision and Regression Tests

**Files:**
- Create: `tests/extract/recordCollisions.test.ts`

- [ ] **Step 1: Write collision tests**

Create `tests/extract/recordCollisions.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractAllCitations, extractCitations, extractRecordCitations } from "eyecite-ts"

describe("record citation collisions", () => {
  describe("A. vs Atlantic Reporter", () => {
    it("does NOT match 123 A.2d 456 as a record citation", () => {
      const text = "See 123 A.2d 456 (Pa. 2020)."
      const records = extractRecordCitations(text)
      const appendix = records.find((c) => c.type === "record" && c.recordType === "appendix")
      expect(appendix).toBeUndefined()
    })

    it("does NOT match 123 A.3d 456 as a record citation", () => {
      const text = "See 123 A.3d 456 (Pa. 2020)."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "appendix")).toHaveLength(0)
    })

    it("DOES match standalone A. 123", () => {
      const text = "See A. 123 for the appendix."
      const records = extractRecordCitations(text)
      const appendix = records.find((c) => c.recordType === "appendix")
      expect(appendix).toBeDefined()
      expect(appendix!.page).toBe(123)
    })
  })

  describe("Ex. in non-citation context", () => {
    it("does not match 'Ex.' without a following designation", () => {
      const text = "For example, the court held that the statute applies."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "exhibit")).toHaveLength(0)
    })
  })

  describe("authority + record coexistence", () => {
    it("extracts both authority and record from mixed text", () => {
      const text =
        "Smith v. Jones, 500 F.2d 123 (2d Cir. 1970). The record shows (R. at 45). "
        + "See also Compl. ¶ 10 and Dkt. No. 78."
      const all = extractAllCitations(text)
      expect(all.filter((c) => c.type === "case").length).toBeGreaterThanOrEqual(1)
      expect(all.filter((c) => c.type === "record").length).toBeGreaterThanOrEqual(3)
    })

    it("existing authority extraction is unchanged with extractAllCitations", () => {
      const text =
        "Smith v. Jones, 500 F.2d 123 (2d Cir. 1970). "
        + "Doe v. Roe, 600 F.2d 789 (9th Cir. 1971). "
        + "42 U.S.C. § 1983."
      const authorityOnly = extractCitations(text)
      const all = extractAllCitations(text)
      const authorityFromAll = all.filter((c) => c.type !== "record")

      expect(authorityFromAll.length).toBe(authorityOnly.length)
      for (let i = 0; i < authorityOnly.length; i++) {
        expect(authorityFromAll[i].type).toBe(authorityOnly[i].type)
        expect(authorityFromAll[i].text).toBe(authorityOnly[i].text)
      }
    })
  })

  describe("bare Reply false positive prevention", () => {
    it("does NOT match bare 'Reply 5'", () => {
      const text = "In Reply 5 the defendant argued otherwise."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(0)
    })

    it("DOES match Reply ¶ 5", () => {
      const text = "As noted in Reply ¶ 5."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(1)
    })

    it("DOES match Def. Reply 5 (party prefix)", () => {
      const text = "See Def. Reply 5."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(1)
    })

    it("DOES match (Reply 5) (parenthetical)", () => {
      const text = "The court noted (Reply 5)."
      const records = extractRecordCitations(text)
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Run collision tests**

Run: `pnpm exec vitest run tests/extract/recordCollisions.test.ts`
Expected: PASS

- [ ] **Step 3: Write regression tests**

Create `tests/extract/recordRegression.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractAllCitations, extractCitations } from "eyecite-ts"

describe("record citation regression — authority extraction unchanged", () => {
  const testCases = [
    "Smith v. Jones, 500 F.2d 123 (2d Cir. 1970).",
    "Doe v. Roe, 600 F.2d 789 (9th Cir. 1971). Id. at 800.",
    "42 U.S.C. § 1983.",
    "123 A.2d 456 (Pa. 2020).",
    "U.S. Const. art. III, § 2.",
    "Pub. L. No. 111-148, 124 Stat. 119.",
    "75 Fed. Reg. 1234 (Jan. 8, 2010).",
    "See Smith, supra, at 130.",
  ]

  for (const text of testCases) {
    it(`unchanged authority output for: "${text.substring(0, 50)}..."`, () => {
      const authorityOnly = extractCitations(text)
      const all = extractAllCitations(text)
      const authorityFromAll = all.filter((c) => c.type !== "record")

      expect(authorityFromAll.length).toBe(authorityOnly.length)
      for (let i = 0; i < authorityOnly.length; i++) {
        expect(authorityFromAll[i].type).toBe(authorityOnly[i].type)
        expect(authorityFromAll[i].span.cleanStart).toBe(authorityOnly[i].span.cleanStart)
        expect(authorityFromAll[i].span.cleanEnd).toBe(authorityOnly[i].span.cleanEnd)
        expect(authorityFromAll[i].text).toBe(authorityOnly[i].text)
      }
    })
  }
})
```

- [ ] **Step 4: Write boundary tests**

Create `tests/integration/recordBoundary.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { extractRecordCitations } from "eyecite-ts"

describe("record citation boundary cases", () => {
  describe("Reply disambiguation variants", () => {
    it("rejects bare Reply NUM", () => {
      const records = extractRecordCitations("Reply 5 was filed.")
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(0)
    })

    it("accepts Reply ¶ NUM", () => {
      const records = extractRecordCitations("Reply ¶ 5.")
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(1)
    })

    it("accepts Reply ¶¶ NUM-NUM", () => {
      const records = extractRecordCitations("Reply ¶¶ 5-8.")
      const reply = records.find((c) => c.recordType === "reply")
      expect(reply).toBeDefined()
      expect(reply!.paragraph).toBe(5)
      expect(reply!.paragraphEnd).toBe(8)
    })

    it("accepts parenthetical-wrapped (Reply ¶ 5.)", () => {
      const records = extractRecordCitations("(Reply ¶ 5.)")
      expect(records.filter((c) => c.recordType === "reply")).toHaveLength(1)
    })

    it("accepts Def. Reply 5 (party prefix, no ¶)", () => {
      const records = extractRecordCitations("See Def. Reply 5.")
      const reply = records.find((c) => c.recordType === "reply")
      expect(reply).toBeDefined()
    })

    it("accepts (Reply 5) (parenthetical, no ¶)", () => {
      const records = extractRecordCitations("The court noted (Reply 5).")
      const reply = records.find((c) => c.recordType === "reply")
      expect(reply).toBeDefined()
    })
  })

  describe("document start and end boundaries", () => {
    it("matches citation at start of text", () => {
      const records = extractRecordCitations("R. at 45 shows the evidence.")
      expect(records).toHaveLength(1)
      expect(records[0].recordType).toBe("record")
    })

    it("matches citation at end of text", () => {
      const records = extractRecordCitations("The evidence is at Tr. 50:1")
      expect(records).toHaveLength(1)
      expect(records[0].recordType).toBe("transcript")
    })

    it("matches citation in parentheses at end", () => {
      const records = extractRecordCitations("As shown (R. at 45.)")
      expect(records).toHaveLength(1)
    })
  })

  describe("paragraph symbol variants", () => {
    it("handles ¶ with space", () => {
      const records = extractRecordCitations("Compl. ¶ 10")
      expect(records[0]?.paragraph).toBe(10)
    })

    it("handles ¶ without space", () => {
      const records = extractRecordCitations("Compl. ¶10")
      expect(records[0]?.paragraph).toBe(10)
    })

    it("handles ¶¶ ranges", () => {
      const records = extractRecordCitations("Compl. ¶¶ 10-12")
      expect(records[0]?.paragraph).toBe(10)
      expect(records[0]?.paragraphEnd).toBe(12)
    })
  })
})
```

- [ ] **Step 5: Run all new tests**

Run: `pnpm exec vitest run tests/extract/recordCollisions.test.ts tests/extract/recordRegression.test.ts tests/integration/recordBoundary.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite as regression check**

Run: `pnpm exec vitest run`
Expected: All tests PASS — no regressions.

- [ ] **Step 7: Commit**

```bash
git add tests/extract/recordCollisions.test.ts tests/extract/recordRegression.test.ts tests/integration/recordBoundary.test.ts
git commit -m "test: add record citation collision, regression, and boundary tests (#74)"
```

---

### Task 7: Typecheck, Lint, Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (or fix any lint issues)

- [ ] **Step 3: Run format**

Run: `pnpm format`
Expected: Files formatted.

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: PASS — ESM + CJS + DTS all build.

- [ ] **Step 5: Run size check**

Run: `pnpm size`
Expected: PASS — within bundle size limits.

- [ ] **Step 6: Run full test suite one final time**

Run: `pnpm exec vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Commit any formatting/lint fixes**

```bash
git add src/ tests/
git commit -m "chore: lint and format record citation implementation (#74)"
```

---

### Task 8: Create Changeset

**Files:**
- Create: `.changeset/*.md` (via `pnpm changeset`)

- [ ] **Step 1: Create changeset**

Run: `pnpm changeset`

Select: **major** — `"record"` in CitationType union is a breaking change for consumers with exhaustive `switch(citation.type)` statements.

Summary:

```
Add record citation extraction for legal briefs (R. at, Tr., Dkt., Ex., Compl., etc.)

New APIs:
- `extractRecordCitations(text)` — standalone record citation extraction
- `extractAllCitations(text)` — merged authority + record extraction

New type: `RecordCitation` with `type: "record"` added to the `Citation` union.

BREAKING: Consumers with exhaustive `switch(citation.type)` statements will
need to add a `"record"` case. `Id.` citations can now resolve to record
citations as antecedents.
```

- [ ] **Step 2: Commit changeset**

```bash
git add .changeset
git commit -m "chore: add changeset for record citation extraction (#74)"
```
