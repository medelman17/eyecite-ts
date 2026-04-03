# Record Citation Extraction — Design Spec

**Date:** 2026-04-02
**Issue:** #74
**Status:** Approved

## Overview

Add extraction of record citations — references to documents within a case's own record (transcripts, exhibits, docket entries, pleadings, appendices, etc.). These appear in appellate briefs, trial briefs, summary judgment motions, and other litigation filings.

Record citations are fundamentally different from authority citations: they reference the trial record, not published law, and are never shepherdized. This spec covers ~50 abbreviation forms across 7 categories of court documents.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Separate `extractRecordCitations()` function (Approach B) | Record citations are semantically different from authority citations. Separate entry point keeps existing pipeline untouched. |
| Name extraction | Backward search (like `extractCaseName`) | Consistent with existing pattern. `declarant?: string` field for depositions, affidavits, declarations. |
| Party prefixes | Captured as `party?: string` | `Def. Mot. 12` and `Pl. Mot. 12` are different documents. Must distinguish. |
| Resolution | `Id.` can resolve to record citations in v1 | Bluebook explicitly permits `Id.` for record cites. `extractAllCitations()` merges both sets for resolver input. |
| State-specific forms | Always active | TX (`CR`, `RR`) and CA (`CT`, `RT`) forms are distinctive enough with trailing numbers. No opt-in flag needed. |
| `A.` disambiguation | Support with low confidence (0.45), require no preceding volume number and no series suffix (`2d`, `3d`) | Distinguishes `A. 123` (appendix) from `123 A.2d 456` (Atlantic Reporter). |

---

## Type Definition

```typescript
interface RecordCitation extends CitationBase {
  type: "record"
  recordType: RecordType
  party?: string          // "Def.", "Pl.", "Gov't", etc.
  declarant?: string      // "Smith", "Jones" — backward search from abbreviation
  page?: number
  pageSuffix?: string     // "a" in "12a"
  line?: { start: number; end?: number }
  paragraph?: number
  paragraphEnd?: number   // for ranges: ¶¶ 10-12
  entryNumber?: number    // Dkt. No. 45, ECF No. 12
  attachmentNumber?: number // ECF 12-2 → 2
  designation?: string    // "A" in Ex. A (letter/number exhibit designation)
  volume?: number         // multi-volume records: 2CR4, Vol. 2
}

type RecordType =
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
  | "reply"                   // Reply
  | "memorandum"              // Mem.
  | "stipulation"             // Stip., Jt. Stip.
  | "interrogatory"           // Interrog.
  | "request_for_admission"   // RFA, Req. Admis.
  | "statement_of_facts"      // SMF, SOMF, SUF, RSMF, CSOF
  | "clerks_record"           // CR (Texas)
  | "reporters_record"        // RR (Texas)
  | "clerks_transcript"       // CT (California)
  | "reporters_transcript"    // RT (California)
```

---

## Architecture

### Public API

```typescript
// Standalone record citation extraction
export function extractRecordCitations(
  text: string,
  options?: RecordCitationOptions
): RecordCitation[]

// Merged extraction: authority + record citations
export function extractAllCitations(
  text: string,
  options?: ExtractAllOptions
): Citation[]  // sorted by span position

interface RecordCitationOptions {
  cleaners?: Cleaner[]
}

interface ExtractAllOptions {
  cleaners?: Cleaner[]
  // existing extractCitations options pass through
}
```

### File Structure

```
src/
  patterns/
    recordPatterns.ts          # Pattern definitions for all record citation forms
  extract/
    extractRecord.ts           # Extractor: token → RecordCitation + declarant backward search
  recordIndex.ts               # Public API: extractRecordCitations(), extractAllCitations()
  types/
    citation.ts                # Add RecordCitation, RecordType to existing types
```

### Entry Point

Both `extractRecordCitations` and `extractAllCitations` export from the main `eyecite-ts` entry point. No new package entry point needed.

### Type Union Update

`RecordCitation` is added to the `Citation` discriminated union and `"record"` is added to `CitationType`. This ensures `extractAllCitations()` returns a properly typed `Citation[]` that includes record citations, and `switch(citation.type)` remains exhaustive.

---

## Pattern Strategy

### Pattern Group 1: Page-Reference

```
[PARTY]? ABBREV [at]? PAGE[SUFFIX]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `R.` | `record` | "at" customary but optional |
| `J.A.`, `JA` | `joint_appendix` | 4 spacing variants: `J.A. 200`, `JA200`, `JA 200`, `J.A.200` |
| `Pet. App.` | `petition_appendix` | Page suffix letters: `12a`, `32a` |
| `App.` | `appendix` | |
| `A.` | `appendix` | Low confidence (0.45). Must NOT have preceding volume or trailing series suffix. |
| `S.A.`, `SA` | `supplemental_appendix` | |
| `Addend.` | `addendum` | |
| `Br.` | `brief` | Often has party prefix: `Resp. Br. 22` |
| `CR` | `clerks_record` | Texas. Multi-volume: `2CR4`. No period. |
| `RR` | `reporters_record` | Texas. Multi-volume: `2RR45`. No period. |
| `Supp. CR` | `clerks_record` | Texas supplemental. |
| `Supp. RR` | `reporters_record` | Texas supplemental. |
| `CT` | `clerks_transcript` | California. |
| `RT` | `reporters_transcript` | California. Page:line optional. |
| `ALCR` | `clerks_record` | Texas Rule 34.5(a) appendix. |

### Pattern Group 2: Paragraph-Reference

```
[NAME]? [PARTY]? ABBREV ¶¶? NUM[-NUM]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Compl.` | `complaint` | |
| `Am. Compl.` | `complaint` | |
| `Ans.`, `Answer` | `answer` | |
| `Aff.` | `affidavit` | Declarant backward search applies. |
| `Decl.` | `declaration` | Declarant backward search applies. |
| `Mot.` | `motion` | |
| `Opp'n`, `Opp.` | `opposition` | |
| `Reply` | `reply` | |
| `Mem.` | `memorandum` | |
| `Stip.`, `Jt. Stip.` | `stipulation` | |
| `Interrog.` | `interrogatory` | Uses "No." instead of ¶. |
| `RFA`, `Req. Admis.` | `request_for_admission` | Uses "No." instead of ¶. |
| `SMF`, `SUF` | `statement_of_facts` | |
| `SOMF` | `statement_of_facts` | |
| `RSMF`, `Resp. SMF` | `statement_of_facts` | |
| `CSOF` | `statement_of_facts` | |

### Pattern Group 3: Entry-Reference

```
[PARTY]? ABBREV [No.]? NUM[-NUM]? [at PAGE]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Dkt.`, `Dkt. No.` | `docket` | |
| `Doc.`, `Doc. No.` | `docket` | |
| `DE` | `docket` | |
| `ECF`, `ECF No.` | `ecf` | Attachment: `ECF 12-2` → entryNumber=12, attachmentNumber=2 |
| `Ex.` | `exhibit` | Letter or number designation. |
| `Pl. Ex.`, `PX` | `exhibit` | |
| `Def. Ex.`, `DX` | `exhibit` | |
| `GX`, `Gov't Ex.` | `exhibit` | |

### Pattern Group 4: Transcript (hybrid — page or page:line)

```
[NAME]? ABBREV PAGE[:LINE[-LINE]]?
```

| Abbreviation(s) | `recordType` | Notes |
|---|---|---|
| `Tr.`, `Trial Tr.` | `transcript` | |
| `Hr'g Tr.` | `hearing_transcript` | |
| `Sent. Tr.` | `sentencing_transcript` | |
| `Plea Tr.` | `plea_transcript` | |
| `Arg. Tr.` | `argument_transcript` | |
| `Dep.`, `Dep. Tr.` | `deposition` | Declarant backward search applies. |

### Pattern Ordering

Longer/more-specific abbreviations match first:
1. Multi-word compounds: `Pet. App.`, `Am. Compl.`, `ECF No.`, `Hr'g Tr.`, `Dep. Tr.`, etc.
2. Single abbreviations with periods: `Compl.`, `Aff.`, `Decl.`, `Dkt.`, etc.
3. Short/ambiguous forms: `R.`, `A.`, `Ex.`, `Br.`, `CR`, `RR`, etc.

---

## Declarant Backward Search

Follows the `extractCaseName` architectural pattern.

**When:** After matching the citation core for depositions, affidavits, and declarations.

**How:** From the start of the abbreviation, search backward up to 50 characters for capitalized words. Stop at sentence boundaries (`. [A-Z]`), semicolons, opening parentheses, or commas followed by non-name text.

**Examples:**
- `Smith Dep. 45:3` → declarant: `Smith`
- `Dr. Smith Dep. 45:3` → declarant: `Dr. Smith`
- `Jones & Doe Aff. ¶ 2` → declarant: `Jones & Doe`
- `The Jefferson Aff. ¶ 2` → declarant: `Jefferson` (strip leading article)
- `Def. Smith Decl. ¶ 8` → party: `Def.`, declarant: `Smith`

**Fallback:** If no clean name boundary found, leave `declarant` as `undefined`. Best-effort, not required.

---

## Resolution Integration

### `extractAllCitations()`

Merges authority citations (`extractCitations()`) and record citations (`extractRecordCitations()`) into a single array sorted by span position. This merged array is the input to `resolveCitations()`.

### `DocumentResolver` Changes

- Record citations become valid antecedents for `Id.` resolution.
- When `Id.` resolves to a record citation, the resolved reference carries forward the `recordType`.
- Only `Id.` can resolve to record citations. `supra` and short-form case citations cannot.
- Same scope boundary rules as authority citations (paragraph/footnote scope).

This is a surgical change: add `"record"` to the set of types eligible as `Id.` antecedents in the resolver.

---

## Confidence Scoring

### Base Confidence by Distinctiveness

| Tier | Confidence | Forms |
|---|---|---|
| High (0.85) | Multi-word compounds | `Pet. App.`, `ECF No.`, `Hr'g Tr.`, `Sent. Tr.`, `Plea Tr.`, `Arg. Tr.`, `Jt. Stip.`, `Am. Compl.`, `Dep. Tr.`, `Trial Tr.`, `Dkt. No.`, `Doc. No.`, `Req. Admis.`, `Supp. CR`, `Supp. RR` |
| Medium (0.65) | Abbreviation + distinctive pinpoint | `Tr.` + page:line, `Compl.` + ¶, `Aff.` + ¶, `Decl.` + ¶, `Dkt.` + number, `J.A.` + page, `S.A.` + page, `CR`/`RR` + number, `SMF`/`SOMF` + ¶ |
| Lower (0.45) | Short/ambiguous forms | `R. at`, `A.`, `Ex.`, `Doc.`, `DE`, `Br.`, `Mot.`, `Opp'n`, `Reply`, `Mem.`, `Ans.` |

### Confidence Bumps

- **+0.1** if wrapped in parentheses — `(R. at 45.)` is more likely a citation than bare `R. at 45`
- **+0.05** if party prefix present — `Def. Mot. 12` is more clearly a record cite than `Mot. 12`

---

## Testing Strategy

### Unit Tests (`tests/extract/extractRecord.test.ts`)

- One `describe` block per record type category (page-ref, para-ref, entry-ref, transcript)
- Mock tokens with `createIdentityMap()`, same pattern as existing extractors
- Test each abbreviation variant, pinpoint parsing, party prefix, declarant backward search
- Edge cases: missing page, page suffix letters, line ranges, paragraph ranges, multi-volume (TX)

### Integration Tests (`tests/integration/recordCitations.test.ts`)

- Full pipeline: raw text → `extractRecordCitations()` → validate structured output
- Mixed text containing both authority and record citations
- `extractAllCitations()` → `resolveCitations()` with `Id.` resolving to record citations

### Collision Tests (`tests/extract/recordCollisions.test.ts`)

- `A.` vs Atlantic Reporter: `123 A.2d 456` should NOT match as record citation
- `Ex.` in non-citation context
- `R.` as a person's initial
- Authority + record citations in same sentence don't interfere

---

## Abbreviation Catalog Reference

Full catalog of ~50 abbreviation forms with format examples, collision analysis, and frequency assessment is in the companion spike document: [`2026-04-02-record-citations-spike.md`](./2026-04-02-record-citations-spike.md).
