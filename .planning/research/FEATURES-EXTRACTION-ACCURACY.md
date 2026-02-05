# Feature Research: Extraction Accuracy Features

**Domain:** Legal citation extraction — accuracy enhancements beyond v1.0-alpha
**Research Date:** 2026-02-05
**Scope:** 5 specific extraction features for subsequent milestone
**Confidence:** HIGH (Bluebook standards verified with official sources, patterns validated against legal documents)

---

## Executive Summary

This research examines 5 extraction accuracy features commonly requested for legal citation parsers:

1. **Parallel Citation Linking** — Detect that "531 U.S. 98, 121 S.Ct. 525, 148 L.Ed.2d 388 (2000)" all refer to the same case
2. **Full Citation Span** — Identify complete citation boundaries (case name through parentheticals)
3. **Party Name Extraction** — Parse "Bush v. Gore" → ["Bush", "Gore"], handle procedural variants
4. **Blank Page Numbers** — Recognize "586 U.S. ____" slip opinion format with underscores/dashes
5. **Complex Parentheticals** — Extract dates, docket numbers, per curiam flags, procedural history

**Key Finding:** All 5 features are standard Bluebook patterns (Rules 10.2-10.7) with established conventions. Python eyecite leaves most as out-of-scope:
- Parallel citations: Issue #76 (debated since 2020, unimplemented)
- Party names: Issue #193 (marked "very sloppy", unimplemented)
- Full span: Issue #135 (unresolved, workaround suggested)

eyecite-ts can differentiate by implementing these as first-class features rather than edge cases.

---

## Feature 1: Parallel Citation Linking

**Status:** Table Stakes for legal research tools
**Bluebook Authority:** Standard practice, no single rule; established across Rules 10.1-10.7
**Implementation Maturity:** Type system ready, logic missing
**Complexity:** HIGH

### What Is It

Automatically detect and link citations to the same case when published in multiple reporters. Example:

```
City of Indianapolis v. Edmond, 531 U.S. 32, 148 L.Ed.2d 333, 121 S.Ct. 447 (2000)
                        ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^
                        Official (U.S. Reports)
                                  Lexis (L.Ed.2d)
                                                    West (S.Ct.)
```

All three citations (531 U.S. 32, 148 L.Ed.2d 333, 121 S.Ct. 447) point to the same case.

### Why Expected

**Legal Research Standard:** [Legal Citation Help: Parallel Citations](https://jdadvising.com/legal-citation-help-parallel-citations/) and [Citing Federal Cases](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases) explain that parallel citations enable readers to find cases in whichever reporter they have access to. Legal professionals expect citation tools to recognize these as equivalent.

**Common Patterns:**
- **Supreme Court (3-way):** U.S. Reports (official) + Supreme Court Reporter (West) + Lawyers' Edition (Lexis)
- **Federal Appeals:** Federal Reporter (official) + unofficial West/Lexis parallels
- **State Cases:** Official state reporter + West Regional reporter + Lexis
- **Pattern recognition:** Same volume/page for official, different volume/page for parallels

### Detection Algorithm

1. **Identify consecutive citations:** Look for citations on same line or within 2 lines
2. **Match court/year:** All citations must have same court code and year
3. **Validate reporter pairs:** Consult reporter database — only link if reporter pair is known parallel relationship
4. **Extract as alternative reporters:** Store all as `parallelCitations` array in primary citation

### Edge Cases & Tricky Parts

| Edge Case | Difficulty | Handling |
|-----------|-----------|----------|
| **Multiple dashes/spacing** | Medium | Citations may be separated by ", " or ", compare " or new line — need flexible gap detection |
| **Parenthetical variations** | Medium | Parallel citations may have different parentheticals: "(9th Cir. 2020)" vs "(2020)" — must normalize to detect same court/year |
| **Independent vs. parallel** | High | Risk: Link unrelated citations. Example: "500 F.2d 123, compare 600 F.3d 456" are NOT parallel. Must verify reporter pair is known parallel, not just consecutive citations. |
| **Reporter abbreviation variants** | Medium | Same reporter may be written "F. 2d" (spaced) or "F.2d" (compact). Normalization required before lookup. |
| **Missing year in subsequent citations** | Medium | Some formats: "531 U.S. 32, 121 S.Ct. 525 (2000)" where year only appears once. Must propagate year context. |
| **Three or more parallels** | Low | Standard practice; algorithm handles naturally as array. |

### Current State in eyecite-ts

**Type System:** `FullCaseCitation` includes optional field:
```typescript
parallelCitations?: Array<{
  volume: number | string
  reporter: string
  page: number
}>
```

**Implementation:** Field exists but NO extraction logic. Currently unused.

**Test Coverage:** No tests for parallel citation detection.

### Differentiation from Python eyecite

Python eyecite Issue #76 "Support parallel citations" (opened ~2020):
- **Status:** Unresolved, not implemented
- **Workaround suggested:** "Implement custom resolution function"
- **Conclusion:** Out of scope for eyecite maintainers

**eyecite-ts opportunity:** Make this a first-class feature, not a workaround.

### MVP Approach

**Phase 1 (Minimal):**
- Detect consecutive citations with matching court/year
- Validate against reporter parallel database (requires data enhancement)
- Return as `parallelCitations` array
- Confidence score: 0.95 (high, but not 1.0 due to edge case risk)

**Phase 2 (Extended):**
- Add `isParallel: boolean` flag
- Merge parallel citations into single entity for some use cases
- Support 3+ parallel reporters

### Dependencies

- **Reporter database metadata:** Requires mapping which reporters are parallel to which (not in current reporters-db)
- **Parallel lookup table:** ~20-30 reporter pair mappings (US/S.Ct./L.Ed.2d, Federal/F., etc.)
- **Lookahead detection:** Already have; extend to detect consecutive citation boundaries

### Open Questions

1. Should "parallel citations" be returned as alternatives of primary citation, or as separate linked entities?
2. Which reporter pair relationships to support? (Supreme Court 3-way? All federal? State reporters?)
3. How to handle edge case where parallel citations aren't consecutive? (Example: "531 U.S. 32 ... later in text ... 121 S.Ct. 525") — Skip? Lower confidence?

---

## Feature 2: Full Citation Span Detection

**Status:** Differentiator for document understanding
**Bluebook Authority:** Rule 10.1 (structure of case citations) — case name + reporter + page + parenthetical
**Implementation Maturity:** Partial (have reporter span; missing case name + parenthetical)
**Complexity:** MEDIUM

### What Is It

Correctly identify complete citation boundaries from case name through all parentheticals. Example:

```
Bush v. Gore, 531 U.S. 98, 105 (2000) (per curiam).
^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^
case name       volume-reporter-page    court/year + additional parenthetical

Full span: [start of "Bush"] to [end of "curiam)."]
```

**Current eyecite-ts behavior:** Only captures "531 U.S. 98" (reporter portion). Case name and parentheticals excluded.

### Why Expected

**Legal Document Standards:** [Cases - Bluebook Legal Citation](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/cases) — "A complete case citation consists of: (1) the name of the case, (2) the volume of the reporter, (3) the page reference, and (4) parenthetical information identifying the court and year of decision."

**Use Cases:**
- **Proper hyperlinking:** Link entire citation to legal database, not just "531 U.S."
- **Document annotation:** Markup full citation boundary for legal document viewers
- **Citation extraction accuracy:** Distinguish "Smith v. Jones, 500 F.2d 123 (2020)" from following text
- **Span tracking:** Match citations to document positions for re-rendering

### Detection Algorithm

1. **Look backward from reporter:** Find case name preceding reporter abbreviation
   - Stop at case name boundary: "v." between party names, "In re", "Ex parte", etc.
   - Validate: starts with capital letter, contains party separator

2. **Look forward from page number:** Find parenthetical end
   - Detect balanced parentheses: `( ... )`
   - Handle nested parentheticals: `(holding ... (citing ...))`
   - Stop at closing `)` followed by period or end-of-citation marker

3. **Merge spans:** Combine case name + reporter + parenthetical as unified span

### Edge Cases & Tricky Parts

| Edge Case | Difficulty | Handling |
|-----------|-----------|----------|
| **Missing case name** | High | Some citations are shortened: "500 F.2d at 125" (no case name). Detect via reporter position; mark span as partial. |
| **Multiple parentheticals** | Medium | "(2d Cir. 2020) (holding ...)" — both are part of full citation. Detect both parenthesis pairs. |
| **Nested parentheticals** | Medium | "(holding that X (citing Y))" — must track parenthesis depth, not stop at first ")". |
| **Case names with punctuation** | Medium | "Barenblatt v. United States" — must not stop at period in "U.S." abbreviation. Validate: period inside reporter abbreviation = not citation end. |
| **Commas in case names** | Medium | Rare but possible: "Jones, Inc. v. Smith" — comma is part of name, not separator. |
| **OCR artifacts** | High | Scanned documents may have extra spaces: "Bush v. Gore , 531 U.S." (space before comma). Normalize whitespace before boundary detection. |
| **Multiple citations on same line** | Medium | "Compare 500 F.2d 123 (2020) with 600 F.3d 456 (2021)" — must detect two separate spans, not one. |

### Current State in eyecite-ts

**Current Span:**
```typescript
span: {
  cleanStart: number    // Start of "531 U.S. 98"
  cleanEnd: number      // End of "98"
  originalStart: number // Same in original text
  originalEnd: number
}
```

**Missing:**
- Case name start detection
- Parenthetical end detection
- Unified full citation span field

**Possible implementation:**
```typescript
fullSpan?: {
  start: number    // Start of case name
  end: number      // End of last parenthetical
}
```

### MVP Approach

**Phase 1 (Minimal):**
- Extend backward to case name start
- Extend forward to closing parenthesis
- Mark with confidence 0.8 (some ambiguity edge cases will occur)
- Flag cases where case name detection was uncertain

**Phase 2 (Extended):**
- Improve case name boundary detection
- Handle nested/multiple parentheticals
- Confidence → 0.95

### Dependencies

- **Case name extractor:** New component (Party Name Extraction Feature below)
- **Parenthetical boundary detector:** New component
- **Lookahead/lookbehind:** Already have in tokenizer

### Open Questions

1. Should full span include leading whitespace/punctuation before case name?
2. How to handle shortened citations (no case name) for full span calculation?
3. Should full span be optional field, or always present?

---

## Feature 3: Party Name Extraction

**Status:** Table Stakes for legal research
**Bluebook Authority:** Rule 10.2 (Case Names) — comprehensive party name rules
**Implementation Maturity:** Not implemented
**Complexity:** MEDIUM-HIGH

### What Is It

Parse case name to extract named parties. Example:

```
Bush v. Gore                    → ["Bush", "Gore"]
In re Smith                     → [null, "Smith"] or procedural: "In re"
Ex parte Jones                  → [null, "Jones"] or procedural: "Ex parte"
United States v. Miller         → ["United States", "Miller"]
Doe v. State of California      → ["Doe", "California"] (omit "State of")
Estate of Smith v. Jones, Inc.  → ["Smith", "Jones"] (omit procedural/entity descriptors)
```

### Why Expected

**Legal Citation Standard:** [Case Name - University of Detroit Mercy](https://libguides.udmercy.edu/c.php?g=739087&p=5285800) — Bluebook Rule 10.2 is foundational. Legal professionals expect tools to parse case names according to these rules.

**Use Cases:**
- **Citation deduplication:** Two citations to same case may have slight name variations; extraction enables matching
- **Legal research filtering:** "Find all cases involving Smith as party"
- **Citation network analysis:** Build networks of parties across cases
- **Document understanding:** Know which parties are involved in cited case

### Bluebook Rule 10.2: Party Name Rules

| Rule | Application | Example |
|------|-------------|---------|
| **Only first party on each side** | Omit "et al.", "and others" | Bush v. Gore, Inc. → "Bush v. Gore" |
| **Omit given names** | Use last name only | "John Smith v. Mary Jones" → "Smith v. Jones" |
| **Never abbreviate "United States"** | Always write out fully | ~~"U.S. v. Miller"~~ → "United States v. Miller" |
| **Omit geographic designations** | Remove "State of", "City of" except when party identifies jurisdiction | "Doe v. State of California" → "Doe v. California" |
| **Omit words indicating multiple parties** | et al., and others, etc. | Removed in citation form |
| **Procedural phrases:** "In re", "ex rel." | Abbreviated/italicized, not parties | Treated separately |
| **Don't omit partnership names** | Entire business entity name preserved | "Jones & Brown, Inc." kept intact |
| **Property as party:** Use common name | Used as-is | "Marbury v. Madison" (not "petition v. secretary") |

### Edge Cases & Tricky Parts

| Edge Case | Difficulty | Handling |
|-----------|-----------|----------|
| **"In re" vs "ex rel."** | Medium | Both are procedural phrases, always italicized per Rule 10.2.1. Not actual parties. How to model: separate `procedural` field? Or exclude from party names entirely? |
| **Abbreviations not yet standardized** | High | Older cases use non-standard abbreviations. "U.S." vs "United States" — Rule 10.2 says write out. But what if source document has abbreviation? |
| **Government entities as parties** | Medium | "State of California", "County of New York", "Secretary of State" — Rule 10.2 says omit geographic designation, but what does "State" reduce to? Just "California"? |
| **"Doe" as placeholder name** | Medium | Real case names may be "Doe v. Jones" (actual party named Doe). Don't confuse with John Doe placeholder. Treat as actual party. |
| **Multi-word proper names** | Medium | "United States", "New York", "United Kingdom" — must extract complete names, not split on spaces. |
| **Abbreviations like Inc., Ltd., Corp.** | Medium | Part of entity name; keep them. Rule 10.2.2: "do not omit any portion of a partnership name." |
| **Corporate variants** | Low | Different documents may reference same corporation as "ABC Corp", "ABC Corp.", "ABC Corporation" — capture as-found; let user handle normalization. |
| **Case names in quotation marks** | Low | Some documents quote case name: *"Bush v. Gore"* (with italics/quotes). Strip formatting; extract party names. |

### Current State in eyecite-ts

**FullCaseCitation type:** No party name fields.

**Current approach:**
- Capture matched text from citation pattern
- Case name NOT extracted separately from full citation text

### Detection Algorithm

1. **Find case name from citation text:** Use captured group from regex pattern
2. **Split on "v." or "ex rel." :** Identify party separator
3. **Apply Rule 10.2 omissions:** Remove given names, geographic designations, procedural phrases
4. **Return as structured data:**
   ```typescript
   FullCaseCitation {
     ...
     parties?: {
       plaintiff?: string
       defendant?: string
       procedural?: string  // "In re", "Ex parte", null if not applicable
     }
   }
   ```

### MVP Approach

**Phase 1 (Minimal):**
- Extract plaintiff and defendant names by splitting on "v."
- Apply basic Rule 10.2 omissions:
  - Remove given names (use last name only)
  - Remove "State of", "City of" prefix
  - Handle "United States" (write out fully)
- Return with confidence 0.8 (some ambiguity cases will occur)

**Phase 2 (Extended):**
- Handle "In re", "Ex parte", "ex rel." as procedural markers
- More sophisticated geographic designation removal
- Handle entity abbreviations (Inc., Corp., LLC)
- Confidence → 0.9

**Phase 3 (Complete):**
- Multi-word name detection
- Ambiguity resolution with fuzzy matching
- Confidence → 0.95+

### Dependencies

- **Case name extraction:** Must have access to case name portion of citation (depends on Feature 2: Full Citation Span)
- **Regex pattern for name splitting:** New regex for "v." separator detection

### Open Questions

1. **In re / Ex parte handling:** Should these be returned as separate `procedural` field, or included as part of party names?
2. **Abbreviation standardization:** Should extraction standardize "U.S." → "United States"? Or extract as-found and let consumer normalize?
3. **Geographic designation omission:** How aggressive? Omit all location prefixes (State of, County of, City of)? Or more conservative approach?
4. **Confidence scoring:** How to score ambiguous cases? Should party extraction be marked LOW confidence when uncertainty exists?

---

## Feature 4: Blank Page Number Handling

**Status:** Table Stakes for slip opinion citations
**Bluebook Authority:** Rules 10.3 (Blank Pages) — slip opinion format
**Implementation Maturity:** Not implemented
**Complexity:** LOW-MEDIUM

### What Is It

Recognize and extract citations with blank page number placeholders used for slip opinions before official pagination assigned. Examples:

```
586 U.S. ____ (2019)           Four underscores
--- S.Ct. --- (2020)            Three dashes
— F.3d — (2021)                Em-dashes
```

All indicate page number not yet assigned; citation valid even without known page.

### Why Expected

**Bluebook Standard:** [Pages, Paragraphs, and Pincites](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites) — "The U.S. Supreme Court invites readers to cite cases as 586 U.S. ___ (year) when the official U.S. Reports page numbers haven't yet been assigned to newly released opinions."

**Legal Practice:**
- Supreme Court releases slip opinions with blank page numbers
- As of August 2024: All slip opinions from October 2022 Term and before have moved to official U.S. Reports format
- Federal district courts still use unpublished slip opinion format with blanks
- Lawyers cite these regularly before official pagination

### Detection Challenge

**Current eyecite-ts:** Tokenizer patterns expect numeric page: `\d+` (digits).

**Problem:** Blank placeholders are non-numeric: `____`, `---`, `—`. Regex fails to match.

**Example failure:**
```
Input: "McKee v. Cosby, 586 U.S. ____ (2019)"
Regex: /(\d+)\s+([A-Z.]+)\s+(\d+)/  ← Expects digits for page
Result: No match (blank is not digits)
```

### Detection Algorithm

Modify tokenizer pattern to accept blank placeholders as page equivalent:

```typescript
// Current pattern (simplified)
/(\d+)\s+(U\.S\.)\s+(\d+)/

// Updated pattern
/(\d+)\s+(U\.S\.)\s+(?:(\d+)|_{4,}|—+|−+)/
//                    ^^^^^^ ^^^^^ ^^^^^
//                    digits OR underscores OR dashes
```

### Edge Cases & Tricky Parts

| Edge Case | Difficulty | Handling |
|-----------|-----------|----------|
| **OCR artifacts vs. real blanks** | High | Scanned PDF may have missing text that looks like blank page number. Real blanks are intentional placeholders; OCR artifacts are errors. Hard to distinguish. Recommendation: Extract both; mark OCR-likely cases with lower confidence. |
| **Multiple blank formats** | Low | "____" (4 underscores), "———" (dashes), "—" (em-dash) — regex `_{4,}` and `—+` handles all. |
| **Spaces instead of underscores** | Medium | Some formats use blank space: "586 U.S.  (2019)" with two spaces where page should be. Could be OCR artifact or real format. Detect pattern: reporter followed by parenthesis with no page between. |
| **Pincite after blank** | Medium | "586 U.S. ____ at 5 (slip op. at 5)" — pincite references slip opinion page. Capture blank page + separate pincite field. |
| **Multiple blanks in reporter** | Low | Rare: "--- S.Ct. --- (2020)" where volume AND page blank. Handle as edge case; extract with lower confidence. |

### Current State in eyecite-ts

**Tokenizer patterns:** No support for blank page numbers.

**Extractor:** Would not process matched token (no token exists).

**Confidence scoring:** Not applicable (no match attempted).

### Approach

**Phase 1 (Minimal):**
1. Add blank placeholder patterns to tokenizer: `_{4,}`, `—+`, `−+`
2. Parse as valid page alternative
3. Set page field to null or string: `page: null` (to indicate unknown)
4. Mark confidence 0.8 (lower than standard citations, since page is unknown)

**Phase 2 (Extended):**
1. Add slip opinion flag: `isSlipOpinion: boolean`
2. Extract pincite if present: "at X" format
3. Link to neutral citation if available: "2020 U.S. LEXIS 12345"

### Dependencies

- **Tokenizer regex update:** Add blank page pattern to existing case pattern
- **Type system:** Add `isSlipOpinion` flag to FullCaseCitation (optional)
- **No database changes needed:** No reporter validation required

### Open Questions

1. Should blank page number be stored as `null` or as string `"____"`?
2. Should slip opinion flag be added as separate field, or just rely on confidence score?
3. How to distinguish OCR artifacts (blanks due to scanning errors) from real slip opinions?

---

## Feature 5: Complex Parentheticals Parsing

**Status:** Nice-to-have for advanced legal research tools
**Bluebook Authority:** Rules 10.4-10.7 (Parenthetical information)
**Implementation Maturity:** Not implemented
**Complexity:** MEDIUM (parsing varied formats; structuring is harder)

### What Is It

Extract and structure additional information in parentheticals beyond basic court/year. Five types:

| Type | Example | Purpose |
|------|---------|---------|
| **Court/Year (mandatory)** | `(2d Cir. 2020)` `(D. Mass. 2021)` `(2000)` | Identify deciding court and year |
| **Per Curiam / Opinion** | `(per curiam)` `(majority)` `(J. Breyer, dissenting)` | Flag opinion type/authorship |
| **Procedural History** | `(aff'd, 500 F.3d 123)` `(rev'd)` `(cert. denied)` | Case outcome and history |
| **Full Dates** | `(D. Mass. Jan. 15, 2021)` `(9th Cir. Mar. 3, 2020)` | Complete date for unpublished cases |
| **Docket Number** | `(No. 20-1234)` `(Docket No. 2021-12345)` | Case docket identifier |
| **Explanatory** | `(holding that X requires Y)` `(noting that ...)` | Free-form explanation |

### Why Expected

**Legal Citation Standard:** [Parentheticals - Bluebook Citation](https://library.famu.edu/c.php?g=276158&p=1842451) and [PARENTHETICALS Bluebook Handout](https://www.law.georgetown.edu/wp-content/uploads/2018/07/Parentheticals-Bluebook-Handout-Revision-Karl-Bock-2016.pdf) — Rule 10.6 covers parenthetical structure and ordering.

**Use Cases:**
- **Authority weight analysis:** Per curiam vs. majority opinion affects citation weight
- **Procedural history:** Overruled, reversed, or affirmed status changes citation value
- **Docket linking:** Link to full case records using docket number
- **Unpublished case dating:** Full date distinguishes multiple rulings from same date

### Parsing Challenges

**Complexity:** HIGH because parentheticals are free-form within Bluebook constraints.

#### Court/Year (Medium complexity)

**Patterns:**
- "Circuit Number + Cir. + Year": `(2d Cir. 2020)` `(11th Cir. 2019)`
- "District + Year": `(D. Mass. 2021)` `(N.D. Ill. 2020)`
- "SCOTUS (Year only)": `(2000)` (Supreme Court year only)
- Court abbreviations vary: `S.D.N.Y.` (Southern District New York)

**Edge case:** Full date format for unpublished: `(D. Mass. Jan. 15, 2021, No. 20-1234)` — must parse month, day, year, docket in same parenthetical.

#### Per Curiam / Opinion Type (Low complexity)

**Patterns:**
- `(per curiam)` — unsigned majority opinion
- `(per curiam), (S. Sotomayor, dissenting)` — justice name + opinion type
- `(majority)` `(dissent)` — explicit labels
- Just justice name: `(Breyer, J.)` — implies opinion author

**Handling:** Flags or string capture sufficient.

#### Procedural History (Medium complexity)

**Patterns:**
- Simple: `(aff'd)` `(rev'd)` `(vacated)` `(cert. denied)`
- With next case: `(aff'd, 500 F.3d 123 (2d Cir. 2021))`
- Multiple history: `(aff'd on other grounds by 600 F.3d 456)`

**Tricky part:** Procedural history may contain nested citation. Must extract that citation too.

#### Full Dates (Low complexity)

**Patterns:**
- `(D. Mass. Jan. 15, 2021)` — Month Day, Year
- `(5th Cir. March 3, 2020)` — Full date with month name
- `(N.D. Ill. 2/15/2021)` — Numeric date format

**Handling:** Parse month, day, year; return as structured date.

#### Docket Number (Low complexity)

**Patterns:**
- `(No. 20-1234)` — Most common
- `(Docket No. 2021-12345)` — More explicit
- Sometimes with "Case No.", "Civ. No.", etc.

**Regex:** `/(?:No\.|Docket No\.|Case No\.)\s+([A-Z0-9-]+)/`

#### Explanatory Parentheticals (High complexity)

**Patterns:**
- Start with present participle: `(holding that ...)` `(arguing ...)` `(noting ...)`
- Or quoted text: `(quoting "exact phrase from opinion")`
- Free-form: Could be anything explaining why case cited

**Handling:** No good structural parsing. Just capture as raw text with confidence flag.

### Current State in eyecite-ts

**FullCaseCitation type:**
```typescript
court?: string      // Court abbreviation (e.g., "2d Cir.")
year?: number       // Year (e.g., 2020)
// NO other parenthetical fields
```

**Missing:**
- Per curiam flag
- Procedural history
- Full date parsing
- Docket number
- Explanatory text capture

### MVP Approach

**Phase 1 (Minimal):**
- Extract and store parenthetical as raw string: `parenthetical?: string`
- Add flags:
  - `isPerCuriam: boolean`
  - `isMajority?: boolean`
- Add docket number: `docketNumber?: string`
- Leave other parsing for Phase 2

```typescript
FullCaseCitation {
  ...
  parenthetical?: string        // Raw text: "(2d Cir. 2020)"
  isPerCuriam: boolean          // Flag: per curiam opinion?
  docketNumber?: string         // Extracted: "20-1234"
}
```

**Phase 2 (Extended):**
- Parse full date: Extract month, day from parenthetical
- Detect procedural history: `aff'd`, `rev'd`, etc.
- Link procedural history to next case citation if present

**Phase 3 (Complete):**
- Parse all Bluebook-compliant parenthetical formats
- Validate parenthetical format against Bluebook rules
- High confidence (~0.95) only for standard formats

### Dependencies

- **Parenthetical text extraction:** Must capture full parenthetical from citation (depends on Feature 2: Full Citation Span)
- **Date parsing:** Month name → number conversion
- **Docket number regex:** Already have simple pattern

### Open Questions

1. **Storage approach:** Raw string + flags, or fully structured object?
2. **Explanatory parentheticals:** Just capture raw text, or attempt semantic parsing?
3. **Nested procedural history citations:** Should docket number extraction also link to next case citation?
4. **Confidence scoring:** How to score complex parentheticals with unrecognized formats?

---

## Feature Dependencies Map

How the 5 features build on each other:

```
┌─────────────────────────────────────────────────────┐
│  Full Citation Span Detection (Feature 2)           │
│  ├─ Enables: Party Name, Complex Parentheticals    │
│  └─ Required by: Feature 5 (parenthetical parsing)  │
└─────────────────────────────────────────────────────┘
           ↓
    ┌────────────────────────┐
    │ Party Name Extraction  │
    │ (Feature 3)            │
    └────────────────────────┘
           ↓
    ┌────────────────────────────────────────┐
    │ Parallel Citation Linking (Feature 1)  │
    │ └─ Uses parties + full span to match   │
    └────────────────────────────────────────┘

┌──────────────────────────┐
│ Blank Page Numbers       │
│ (Feature 4)              │
│ Independent; no deps     │
└──────────────────────────┘

┌──────────────────────────────────┐
│ Complex Parentheticals (Feature 5)│
│ └─ Requires: Full Citation Span   │
└──────────────────────────────────┘
```

**Build Order Recommendation:**
1. Feature 2 (Full Citation Span) — Foundation; needed by 3 other features
2. Feature 3 (Party Names) — Builds on Feature 2
3. Feature 4 (Blank Page Numbers) — Quick win; independent
4. Feature 1 (Parallel Linking) — Builds on Features 2-3
5. Feature 5 (Complex Parentheticals) — Builds on Feature 2

---

## Feature Comparison Table

| Feature | Complexity | Value | Dependencies | Recommended Phase |
|---------|-----------|-------|--------------|-------------------|
| Parallel Citation Linking | HIGH | MEDIUM-HIGH | Reporter DB + Features 2-3 | Phase 2 |
| Full Citation Span | MEDIUM | HIGH | Case name detection | Phase 1 |
| Party Name Extraction | MEDIUM-HIGH | MEDIUM | Feature 2 | Phase 1 |
| Blank Page Numbers | LOW-MEDIUM | MEDIUM | Tokenizer update | Phase 1 |
| Complex Parentheticals | MEDIUM | LOW-MEDIUM | Feature 2 | Phase 2-3 |

---

## Confidence & Sources

### Research Methodology

**Information Sources:**
- **Bluebook Official:** Rules 10.2-10.7 via university law library guides (high authority)
- **Authoritative References:** Georgetown Law, University of Detroit Mercy Law, Tarlton Law Library
- **Practical Standards:** Published examples from legal citation guides
- **Existing Tool Analysis:** Python eyecite issues/documentation, Citation.js features

**Confidence Assessment:**

| Area | Level | Notes |
|------|-------|-------|
| Bluebook Rules | HIGH | Official rules documented; university guides authoritative |
| Standard Patterns | HIGH | Multiple sources agree on parallel citation formats, party name rules, etc. |
| Edge Cases | MEDIUM | Real-world documents may have variations beyond Bluebook |
| Implementation Complexity | MEDIUM | Estimation based on pattern matching analysis; actual complexity may vary |
| Existing Tool Gaps | MEDIUM-HIGH | Python eyecite issues #76, #135, #193 confirmed; not implemented |

### Official Sources

#### Bluebook Standards (Authoritative)
- [Cases - Bluebook Legal Citation](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/cases) — Rules 10.2-10.7
- [Case Name - University of Detroit Mercy](https://libguides.udmercy.edu/c.php?g=739087&p=5285800) — Rule 10.2 application
- [Pages, Paragraphs, and Pincites](https://tarlton.law.utexas.edu/bluebook-legal-citation/pages-paragraphs-pincites) — Blank page rules
- [Court & Date](https://library.famu.edu/c.php?g=276158&p=1842445) — Rules 10.4-10.5
- [Parentheticals](https://library.famu.edu/c.php?g=276158&p=1842451) — Rule 10.6

#### Legal Citation Guides
- [Parallel Citations - Legal Citation Help](https://jdadvising.com/legal-citation-help-parallel-citations/)
- [Legal Citation Basics - Cornell Law](https://www.law.cornell.edu/citation/4-300)
- [Citing Federal Cases - University of South Carolina](https://guides.law.sc.edu/LRAWSpring/LRAW/citingfedcases)
- [PARENTHETICALS - Georgetown Law](https://www.law.georgetown.edu/wp-content/uploads/2018/07/Parentheticals-Bluebook-Handout-Revision-Karl-Bock-2016.pdf)
- [Everything You Wanted to Know About the Bluebook - Georgetown Law](https://www.law.georgetown.edu/wp-content/uploads/2022/05/Everything-Bluebook-10.4.21-JELfcd.pdf)

#### Existing Tools
- [Python eyecite GitHub](https://github.com/freelawproject/eyecite) — Issue tracking confirms unimplemented features
- [eyecite-ts GitHub](https://github.com/medelman17/eyecite-ts) — Current implementation status
- [Citation.js](https://github.com/unitedstates/citation) — Alternative JS implementation

---

## Summary for Roadmap Planning

### Priority Ranking for Subsequent Milestone

**High Priority (Phase 1):**
1. **Full Citation Span Detection** — Foundation for 3 other features; enables proper document understanding
2. **Party Name Extraction** — Medium complexity; high value for legal research tools
3. **Blank Page Number Handling** — Low complexity; solves slip opinion handling gap

**Medium Priority (Phase 2):**
4. **Parallel Citation Linking** — High value for legal research; requires Feature 2 first
5. **Complex Parentheticals (Basic)** — Start with per curiam flag + docket extraction

**Nice-to-Have (Phase 3):**
- Complex Parentheticals (Full) — Complete Bluebook-compliant parsing

### Expected Effort & Timeline

- **Phase 1 (Features 2, 3, 4):** 3-4 weeks
  - Full span: ~1 week (case name detection + parenthetical boundary)
  - Party names: ~1.5 weeks (Rule 10.2 extraction + edge cases)
  - Blank pages: ~3-4 days (tokenizer pattern + confidence scoring)

- **Phase 2 (Features 1, 5 basic):** 3-4 weeks
  - Parallel linking: ~1.5 weeks (reporter DB enhancement + linking logic)
  - Parentheticals basic: ~1 week (per curiam + docket extraction)

### Competitive Advantage

Implementing these features positions eyecite-ts as:
- **More complete than Python eyecite** (which leaves parallel citations, party names, full span out-of-scope)
- **More accurate for legal research** (understands full citation context)
- **More usable for document understanding** (proper boundaries, structured data)

All while maintaining zero runtime dependencies and <50KB gzipped core.

