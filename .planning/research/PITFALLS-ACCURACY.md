# Domain Pitfalls: Adding Extraction Accuracy Features

**Domain:** Legal citation extraction — adding parallel citation linking, full span extraction, party name extraction, blank page support, and complex parenthetical parsing to existing parser

**Researched:** February 2026

**Confidence:** HIGH (Official Python eyecite GitHub issues #76, #193; Bluebook citation standards; current system architecture analysis)

## Executive Summary

Adding extraction accuracy features to eyecite-ts requires careful integration with the existing dual-span position tracking system and strict type definitions. The five features interact in complex ways: parallel citations share parentheticals, party name extraction requires looking backward through text, full span extraction changes position boundaries, blank pages alter the type system, and complex parentheticals create ambiguity in court/date parsing.

The Python eyecite maintainers debated parallel citations for years (issue #76) without shipping, and explicitly acknowledged party name extraction as "one of those things that we just had to do a bad job on" (issue #193). These are not easy problems.

---

## Critical Pitfalls

### Pitfall 1: Parallel Citation Detection Breaking Position Tracking

**What goes wrong:**

When you extend `span` to cover multiple parallel citations (e.g., "500 U.S. 1, 136 S. Ct. 2, 200 L. Ed. 2d 3"), the single span now encompasses three separate citations. If you later add a case name or parenthetical, the span expands further. But your existing resolution system uses `span.originalStart/End` to map back to original text. When you have three citations with overlapping spans, the position mapping becomes ambiguous.

Example: You extract parallel citations and give them all the same `span` (the outermost bounds). Later, user code tries to highlight the citation at `originalStart: 100, originalEnd: 150`. Which of the three parallel cites does this refer to? The boundaries overlap; you've lost granularity.

**Why it happens:**

- The current system assumes one citation = one span. Changing this to one logical citation = three physical citations in text requires careful position boundaries.
- You must track whether a span represents one citation's full text or a group of parallel citations' combined text.
- The existing `TransformationMap` maps clean positions to original. When multiple citations share positions, the inverse lookup is ambiguous.
- Tests that worked for single citations now pass the wrong span boundaries to downstream code.

**How to avoid:**

1. **Keep positions per citation, not per group:**
   ```typescript
   interface FullCaseCitation extends CitationBase {
     // Existing: points to "500 U.S. 1"
     span: Span

     parallelCitations?: Array<{
       volume: number | string
       reporter: string
       page: number
       // NEW: each parallel has its own span
       span: Span
     }>
   }
   ```
   This preserves granularity: user code can highlight each cite independently.

2. **Test span boundaries extensively:**
   - Single parallel cite (e.g., "500 U.S. 1") — span should cover exact text
   - Double parallel (e.g., "500 U.S. 1, 136 S. Ct. 2") — primary span covers first, parallel has its own span
   - Verify that `originalStart/End` for each span points to correct substring in original text
   - Test with Unicode and HTML entities to ensure position mapping doesn't drift

3. **Document span semantics clearly:**
   - "span covers the primary citation text only, not parallels"
   - "Each parallel has independent span; use parallelCitations[i].span to highlight"
   - Add examples in JSDoc showing how to extract text for each parallel

4. **Validate in integration tests:**
   - Parse document with 50 parallel citations
   - For each citation, extract text using `originalText.substring(span.originalStart, span.originalEnd)`
   - Verify result matches `citation.text` exactly — if not, spans are misaligned

5. **Flag in roadmap research if position mapping changes:**
   - Question: Does adding parallel citations require position tracking refactor?
   - If yes, that's Phase 1 work (foundation), not Phase N (feature addition)

**Warning signs:**

- Spans point to wrong text when extracting (text mismatch: `originalText.substring(span.originalStart, span.originalEnd) !== citation.text`)
- Tests for parallel cites pass, but annotation code highlights wrong text
- Position accuracyin annotation degrades when document has parallel cites
- Different citations in same paragraph have overlapping `originalStart/End` bounds (suggests grouping instead of individual tracking)

**Phase to address:**

- **Phase 1 (Foundation):** Define span semantics for parallel citations before any implementation
- **Phase 2 (Parallel Linking):** Implement with position validation tests
- **Acceptance criteria:** 100% position accuracy on 20+ test cases with parallel citations; span boundaries non-overlapping across different citations

---

### Pitfall 2: Type System Breaking Changes When Adding Optional Fields

**What goes wrong:**

The current type system has `page: number` (required). When you add blank page support (e.g., "500 U.S. ___"), `page` becomes `number | string | undefined`. This is a breaking change: existing code assumes `page` is always a number:

```typescript
// User code written against v1.0-alpha:
citation.page + 10  // Assumes number
citation.page.toString().length  // Assumes number

// After your change, this breaks:
const citation = extractCase(token)
citation.page + 10  // ERROR: page could be undefined
```

Similar breaking changes occur when adding `partyName`, `fullSpan`, and `parenthetical` fields. Each field change requires either:
1. Deprecation + major version bump (x.0.0)
2. Discriminated union per page type (creates 3 sub-types of FullCaseCitation)
3. Making fields optional and adding type guards everywhere

**Why it happens:**

- TypeScript union types are powerful but create breaking changes when you expand them
- The library shipped v1.0-alpha with strict type contracts. Changing types requires versioning.
- You might add fields in isolation without realizing users depend on exact types
- Missing deprecation message means users upgrade and discover breaking changes in production

**How to avoid:**

1. **Plan breaking changes upfront in Phase 0 (Roadmap):**
   - Don't change `page: number` to `page: number | undefined` without major version bump
   - Document: "v1.1 is a BREAKING change: page may be undefined for pending citations"
   - Provide migration guide: "If you use `citation.page + 10`, wrap in `if (citation.page !== undefined)` first"

2. **Use discriminated unions to add variants without breaking existing:**
   ```typescript
   // Instead of changing existing type:
   export type FullCaseCitation = CaseWithPage | CaseWithBlankPage

   interface CaseWithPage extends CitationBase {
     type: "case"
     page: number  // Required, backward compatible
   }

   interface CaseWithBlankPage extends CitationBase {
     type: "caseBlank"  // Different type, doesn't break "case" type
     page: string  // "___" or "---"
   }
   ```
   Downside: Creates more types to maintain. But zero breaking changes to existing code.

3. **If changing existing type is unavoidable:**
   - Bump major version (v2.0.0)
   - Provide codemods or upgrade script to help users
   - Add deprecation warnings in v1.5 before v2.0 ships
   - Release on separate branch first (v2.0-beta)

4. **Test backward compatibility on each release:**
   - Compile user code from v1.0-alpha against new version
   - If types changed, explicitly check that compilation fails with clear error message
   - Document what changed and how to fix it

5. **Review type changes in code review before committing:**
   - Check: Does this change break existing type contract?
   - If yes: Does changelog mention major version bump?
   - If no: Block until versioning decision is made

**Warning signs:**

- New citation fields added without updating CHANGELOG with "BREAKING"
- Tests pass locally but user reports "types don't match v1.0"
- npm audit or bundlers report type mismatch errors
- Field is added as optional but code assumes it exists (no type narrowing)

**Phase to address:**

- **Phase 0 (Roadmap):** Document all breaking type changes, plan version bump
- **Phase 1 (Planning):** Create detailed type migration guide
- **Phase N (Implementation):** Implement with major version bump if types changed
- **Acceptance criteria:** Type changes documented in CHANGELOG with migration guide; existing user code either still compiles or fails with helpful error message

---

### Pitfall 3: Party Name Extraction Hitting Hard Tokenization Limits

**What goes wrong:**

The Python eyecite maintainers acknowledged (GitHub issue #193): "this is one of those things that we just had to do a bad job on." Party name extraction from text like "Lee County School Dist. No. 1 v. Gardner" naively extracts "1" (the last token before "v.") instead of "Lee County School Dist. No. 1".

Your extraction happens AFTER tokenization has already split text into tokens. By that point, you've lost context. You can't easily reconstruct a multi-word party name because the tokenizer saw "Lee" "County" "School" "Dist." "No." "1" as separate tokens, discarded the spaces, and you're left trying to reverse-engineer which ones form a party name.

Example: Text is:
```
"Lee County School Dist. No. 1 v. Gardner"
```

After tokenization/cleaning, you see:
```
"LeeCountySchoolDist.No.1v.Gardner"
```

Your extraction pattern might be: "find the last 2-3 tokens before v." But those tokens are concatenated; you can't tell where one ends and another begins. And "Dist." might match a reporter abbreviation, triggering false-positive court field extraction.

**Why it happens:**

- Party name extraction requires backward-scanning through original (not cleaned) text
- Current pipeline: clean → tokenize → extract. By extraction phase, original text position context is partially lost.
- Extractors work with token text, not original text. Reversing the transformation is unreliable.
- Periods and abbreviations create ambiguity: is "No." part of the party name, or an abbreviation to strip?
- Numeric designations ("No. 1", "Inc. 2") are hard to distinguish from page numbers or reporter series

**How to avoid:**

1. **Extract party names before extraction stage (during tokenization or in separate pass):**
   - Add `partyName` field to Token during tokenization, not during extraction
   - Use original text with full Unicode/whitespace preserved
   - Pattern: work backward from "v." in original text, capture words/abbreviations until you hit other punctuation or reasonable name boundary

2. **Define heuristic rules for party name boundaries:**
   ```typescript
   // In tokenization, before cleaning:
   const partyNamePattern = /(.+?)\s+v\.\s+(.+?)(?:\s*,\s*\d+|$)/

   // Capture group 1 = plaintiff, group 2 = defendant
   // But apply rules:
   // - Remove leading articles ("The Lee County...")
   // - Remove trailing abbreviations that aren't part of name ("Lee County School Dist. No. 1")
   // - Recognize business designations: "Inc.", "Corp.", "L.L.C."
   // - Stop at jurisdiction: "State of California v." -> strip "State of"
   ```

3. **Document limitations explicitly:**
   - "Party name extraction uses heuristics; accuracy ~85% for simple names, ~60% for complex names"
   - "Abbreviated names may not extract correctly (e.g., 'Corp.' vs full company name)"
   - "Multi-word party names with periods are error-prone; review manually for legal filings"
   - Consider adding confidence score to partyName extraction

4. **Test against real cases with edge cases:**
   - "Lee County School Dist. No. 1 v. Gardner" — should extract "Lee County School Dist. No. 1"
   - "United States v. Smith" — should extract "United States", not strip it
   - "Smith, et al. v. Doe, Inc." — should extract "Smith, et al.", not truncate
   - "In re Estate of Jones" — should recognize "In re" pattern, not extract as "Estate"
   - "U.S. ex rel. Foo v. Bar" — should handle "ex rel." correctly

5. **Consider alternative: Make party name a separate annotation pass:**
   - Extract citations first (current system)
   - Then, in a second pass, look around each citation for party name context
   - Return party name as separate optional field with lower confidence
   - Don't bake into citation extraction; treat as additional metadata layer

6. **Add confidence scoring:**
   ```typescript
   interface FullCaseCitation {
     partyName?: {
       plaintiff?: string
       defendant?: string
       confidence: number  // 0.0-1.0
     }
   }
   ```
   Let users see when extraction is uncertain.

**Warning signs:**

- Party name extraction is "11" instead of "United States"
- Party names with periods disappear ("Lee County Dist." becomes "Dist")
- Tests pass on simple names ("Smith v. Jones") but fail on complex ones
- Extracted party name looks like a page number (e.g., "1" or "123")
- Party name extraction conflicts with reporter detection (e.g., "P. v." parsed as "Pacific Reporter")

**Phase to address:**

- **Phase 1 (Foundation):** Document heuristic rules and limitations for party name extraction
- **Phase 3 (Party Names):** Implement with conservative heuristics; accept 60-80% accuracy
- **Acceptance criteria:** Correctly extracts party names for 80% of test cases; confidence scoring reflects uncertainty; documentation clearly states limitations

---

### Pitfall 4: Full Span Extraction Creating Unbounded Position Growth

**What goes wrong:**

Current span covers "volume-reporter-page" only (e.g., "500 F.2d 123" = positions 100-109). You want to extend span to include case name (backwards) and parenthetical (forwards).

Now span must cover "United States v. Smith, 500 F.2d 123 (9th Cir. 2020)" which is much larger. But where does the case name end? What if text is:

```
"In Smith, the court cited United States v. Smith, 500 F.2d 123 (9th Cir. 2020) for the proposition that..."
```

Should `span` include "In Smith"? Should it include "for the proposition that"? You need clear rules or spans will be overly broad (include extra text) or too narrow (miss real citation parts).

Without clear boundaries, span-expansion becomes:
- Plaintiff name: scan backward, how far? Comma-separated names, "et al.", organizational structure all create ambiguity.
- Court/year parenthetical: how many levels of parentheticals? "(...(with modifications)...)" — do you include all?
- Subsequent history: "aff'd", "rev'd", "vacated" — how many procedural steps? Stop after one? Until no more?

This cascades into position tracking drift: if your span boundaries are inconsistent, original positions calculated from expanded spans are wrong.

**Why it happens:**

- Full citation format per Bluebook includes: Party Name v. Party, Volume Reporter Page (Court Year) (Parenthetical)
- The current extraction only handles volume-reporter-page; everything else is optional metadata
- Expanding span requires defining boundaries that aren't in the original token regex
- No single regex can reliably capture all these components at once

**How to avoid:**

1. **Define span rules upfront before implementation:**
   ```typescript
   interface FullCaseCitation {
     // Primary span: covers "volume reporter page" only
     span: Span

     // Optional extended span: covers name, reporter, year, parenthetical
     fullSpan?: Span

     // Don't try to expand the primary span itself
   }
   ```
   Keep primary span unchanged for backward compatibility.

2. **For each component, document boundary rules:**
   - **Case name span:** Start at first letter of plaintiff name, end at "v." (inclusive)
   - **Court/year parenthetical:** From "(" after page, to matching ")"
   - **Subsequent history:** Up to next paragraph or major punctuation (e.g., "aff'd" but not "aff'd and remanded for further proceedings")
   - **Party name:** Back up from "v.", stop at common prefixes ("The", "State of") or start of sentence

3. **Test span boundaries against real citations:**
   - "United States v. Smith, 500 F.2d 123 (9th Cir. 2020)" — fullSpan should cover all
   - "In the case of Smith v. Jones, 100 N.E.2d 456" — fullSpan.start should NOT include "In the case of"
   - "(Smith v. Jones, 100 N.E.2d 456)" — fullSpan boundaries within parentheses
   - Multiple citations in sequence — fullSpan boundaries should not overlap

4. **Use lookahead/lookbehind carefully:**
   - Don't use greedy patterns that consume extra text
   - Prefer explicit boundary markers (punctuation, stop words)
   - Test on 100+ real legal documents to catch edge cases

5. **Position validation is critical:**
   - For every citation with `fullSpan`, extract text: `originalText.substring(fullSpan.originalStart, fullSpan.originalEnd)`
   - Verify result is a valid, complete citation (starts with name or number, ends with year/parenthetical or page)
   - Fail tests if extraction doesn't match expected format

6. **Consider optional fullSpan flag for opt-in use:**
   ```typescript
   extractCitations(text, { extractFullSpan: false })  // Default: backward compatible
   extractCitations(text, { extractFullSpan: true })   // Opt-in: includes fullSpan
   ```
   This gives users control and prevents breaking existing code.

**Warning signs:**

- fullSpan overlaps with adjacent text (includes extra words)
- fullSpan doesn't include all components (missing parenthetical or case name)
- Position boundaries mismatch: `originalText.substring(fullSpan.originalStart, fullSpan.originalEnd)` includes extra whitespace or punctuation
- fullSpan spans are wider than expected, suggesting pattern is too greedy

**Phase to address:**

- **Phase 1 (Foundation):** Define fullSpan boundary rules, scope any required refactoring to position system
- **Phase 4 (Full Span):** Implement with exhaustive position validation tests
- **Acceptance criteria:** fullSpan boundaries are precise (no extra text, all components included); position validation passes on 50+ real legal documents

---

### Pitfall 5: Blank Page Numbers Creating Type Ambiguity and Validation Confusion

**What goes wrong:**

Current type: `page: number`. You want to support pending/blank pages like "500 U.S. ___" (three underscores). So you change to `page: number | string | undefined`.

Now extraction code must handle three cases:
- `page: 123` — normal case
- `page: "___"` — blank U.S. Reports page (pending)
- `page: undefined` — page not mentioned? Or parsing failed?

The ambiguity creates validation confusion:
1. Is `page: undefined` valid or an error?
2. Can you do arithmetic on page? (`page + 10` fails if `page` is string or undefined)
3. What about parallel citations? Can one have page 123, another have page "___"?
4. Does blank page indicate "upcoming volume" or "case not yet paginated"? (Different legal meanings)

**Why it happens:**

- U.S. Reports citation format uses literal underscores: "573 U.S. ___" (volume 573, page pending)
- Your tokenization pattern didn't capture underscores as valid page number syntax
- Decision: change the type, or add a parallel citation format you don't yet support?
- Existing validation/comparison code assumes `page` is numeric and comparable

**How to avoid:**

1. **Extend tokenizer patterns to recognize blank page syntax:**
   ```typescript
   // Add to case citation pattern:
   const pageRegex = /(\d+|_{3,}|-{3,})/  // 3+ underscores OR 3+ dashes OR digits
   ```
   Recognize blank pages at tokenization, before extraction.

2. **Use discriminated types instead of union:**
   ```typescript
   export type FullCaseCitation = CaseWithPage | CaseWithBlankPage

   interface CaseWithPage {
     type: "case"
     page: number  // Always present, always numeric
     // ... rest of fields
   }

   interface CaseWithBlankPage {
     type: "caseBlank"
     page: string  // "___" or "---"
     // ... rest of fields
   }
   ```

   Now code can safely do:
   ```typescript
   if (citation.type === "case") {
     return citation.page + 10  // Safe, page is number
   }
   if (citation.type === "caseBlank") {
     return `${citation.page} (pending)`  // Safe, page is string
   }
   ```

3. **If union is unavoidable, use branded types:**
   ```typescript
   type NumericPage = number & { readonly __brand: 'NumericPage' }
   type BlankPage = (string | undefined) & { readonly __brand: 'BlankPage' }

   interface FullCaseCitation {
     page: NumericPage | BlankPage
   }

   function isNumericPage(page: NumericPage | BlankPage): page is NumericPage {
     return typeof page === 'number'
   }
   ```
   Requires type guards but prevents accidents.

4. **Document blank page semantics:**
   - "Blank pages (___) indicate pending U.S. Reports citations"
   - "page field is number for decided cases, string for pending cases"
   - "Check citation.type or use typeof check before arithmetic on page"
   - Provide helpers:
   ```typescript
   function getPageNumber(citation: FullCaseCitation): number | undefined {
     if (typeof citation.page === 'number') return citation.page
     return undefined
   }
   ```

5. **Extend tests to cover all three cases:**
   - Numeric page: `page: 123` — can add/subtract, compare
   - Blank page: `page: "___"` — display-only, cannot compute
   - Missing page: `page: undefined` — edge case, document when this occurs
   - Parallel citations with mixed types: `[{ page: 123 }, { page: "___" }]`

6. **Update validation and comparison logic:**
   - Searching by page range (e.g., "pages 100-150") must skip blank-page citations
   - Deduplication logic (is citation A same as citation B?) must handle blank pages
   - Confidence scoring might lower confidence for blank-page cites

**Warning signs:**

- Type errors in user code when page is accessed: `citation.page is number | string | undefined, cannot be used as number`
- Tests fail with "Cannot read property of undefined" when page is blank
- Comparison functions crash when comparing numeric vs. string pages
- New code has `// @ts-ignore` comments to suppress type errors on page field

**Phase to address:**

- **Phase 1 (Foundation):** Decide: discriminated type or union with guards? Plan version bump if changing type
- **Phase 2 (Blank Pages):** Implement with type safety; add validation for blank page formats
- **Acceptance criteria:** All type checks pass; comparison/validation code handles blank pages; documentation clearly explains page types

---

### Pitfall 6: Complex Parenthetical Parsing Creating Court/Date Ambiguity

**What goes wrong:**

Citation: "(2d Cir. Jan. 15, 2020)" — Your parser must extract:
- Court: "2d Cir."
- Date: Jan 15, 2020

But the existing code has `stripDateFromCourt()` which strips date from the parenthetical content. That function works for simple cases like "(2d Cir. 2020)" but creates ambiguity when dates have month/day:

```typescript
stripDateFromCourt("2d Cir. Jan. 15, 2020")
// Current: strips trailing " 2020", then looks for " , digit" pattern
// Result might be: "2d Cir. Jan. 15" or "2d Cir. Jan." depending on regex
```

The problem: Your regex patterns must correctly extract court with trailing month/day/year removed, but distinguish between:
- "2d Cir." (court) vs. "Jan." (part of date)
- "2020" (year) vs. "2020 case" (year with extra text)
- "C.D. Cal." (court) vs. "C.D." (partial court, missing jurisdiction)

Parentheticals also nest: "(...(explaining that...)...)" and contain multiple types of info:
```
(2d Cir. Jan. 15, 2020) (vacating and remanding) (Doe, J., dissenting)
```

Your parser might extract court from the first parenthetical and miss that subsequent parentheticals aren't court/date info.

**Why it happens:**

- Date formats vary: "2020", "Jan. 2020", "Jan. 15, 2020", "January 15, 2020"
- Court abbreviations vary: "2d Cir.", "C.D. Cal.", "D. Mass.", "Ct. Cl."
- Parentheticals are nested and multiple
- Patterns that work for the common case ("(2020)") fail on complex cases
- The distinction between court abbreviation and date marker (period) is subtle

**How to avoid:**

1. **Extract date and court in two separate operations, not sequentially:**
   ```typescript
   // BAD: Strip date, then assume what's left is court
   let courtContent = stripDateFromCourt("2d Cir. Jan. 15, 2020")

   // GOOD: Extract date and court independently
   const dateMatch = /(\d{1,2})?\.?\s*(Jan|Feb|...)\s+(\d{1,2},\s*)?(\d{4})/
   const dateContent = dateMatch.exec(parenContent)?.[0]

   const courtMatch = /([A-Z]\w*\s*(?:\.\s*)?)+Cir\./
   const courtContent = courtMatch.exec(parenContent)?.[0]
   ```

2. **Use explicit date patterns that capture the full date:**
   ```typescript
   // Pattern: "Month Day, Year" or "Month Year" or just "Year"
   const monthPattern = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
   const datePattern = new RegExp(
     `(?:${monthPattern}\\.?\\s+)?(\\d{1,2},\\s*)?(\\d{4})`,
     'i'
   )

   // Prefer capturing full match, then parse components
   const match = datePattern.exec(content)
   if (match) {
     const fullDate = match[0]  // "Jan. 15, 2020" or "Jan. 2020" or "2020"
     // Now remove this from parenthetical to find court
   }
   ```

3. **Validate court patterns against known courts:**
   - Don't assume "any letters + Cir." is a valid court
   - Check against list of federal circuit courts: "D.C.", "1st Cir.", "2d Cir.", ... "11th Cir.", "Fed. Cir."
   - Check state courts: "C.D. Cal.", "N.D. Ill." etc.
   - Allow custom courts via configuration

4. **Test complex parentheticals exhaustively:**
   - "(2d Cir. 2020)" → court: "2d Cir.", date: "2020"
   - "(2d Cir. Jan. 15, 2020)" → court: "2d Cir.", date: "Jan. 15, 2020"
   - "(C.D. Cal. Mar. 2020)" → court: "C.D. Cal.", date: "Mar. 2020"
   - "(2020)" → court: undefined, date: "2020"
   - "(vacated and remanded)" → court: undefined, date: undefined
   - "(Doe, J., dissenting)" → court: undefined, date: undefined
   - "(2d Cir. Jan. 15, 2020) (vacating)" → extract court/date from first paren, skip second

5. **Handle ambiguous parentheticals gracefully:**
   - If you can't parse court or date, leave undefined (don't guess)
   - Add confidence scoring: full court/date parsed = 1.0, partial = 0.7, unparseable = 0.4
   - Log ambiguous parentheticals as warnings so users can review

6. **Consider tokenizing parentheticals:**
   ```typescript
   // Instead of trying to parse in one regex:
   // 1. Extract parenthetical text
   const parenText = "(2d Cir. Jan. 15, 2020)"

   // 2. Tokenize by common separators
   const tokens = parenText.split(/\s*,\s*/).map(t => t.trim())
   // tokens = ["2d Cir. Jan. 15", "2020"]

   // 3. For each token, try to parse as date or court
   const date = parseDate(tokens)  // "2020"
   const court = parseCourt(tokens.filter(t => t !== date).join(" "))  // "2d Cir."
   ```

**Warning signs:**

- Court extraction returns "Jan." instead of "2d Cir."
- Year extracted as "15" instead of "2020"
- Date formats that include month/day are parsed incorrectly
- Tests pass for "(2020)" but fail for "(Jan. 15, 2020)"
- Parentheticals with multiple components ("(vacating) (2d Cir. 2020)") extract wrong court

**Phase to address:**

- **Phase 1 (Foundation):** Document parenthetical parsing rules and edge cases
- **Phase 5 (Complex Parentheticals):** Implement with date/court separated; validate on 50+ real cases
- **Acceptance criteria:** Correctly parses court and date for 90% of real cases; ambiguous parentheticals handled gracefully (log warning, leave fields undefined); tests cover all common formats

---

## Integration Pitfalls

### Pitfall 7: Parallel + Full Span Creating Nested Position Ambiguity

**What goes wrong:**

When you add BOTH parallel citations AND full span extraction, you have ambiguous position semantics:

```
Citation: "United States v. Smith, 500 U.S. 1, 136 S. Ct. 2 (2020)"

Option A: One logical citation, two reporters
- span covers full text (position 0-59)
- parallelCitations hold second reporter
- fullSpan also covers 0-59

Option B: Two separate citations
- citation1.span covers "500 U.S. 1" (position X-Y)
- citation1.parallelCitations[0].span covers "136 S. Ct. 2" (position Z-W)
- Both have same fullSpan (position 0-59)

Which is it? The specification is ambiguous.
```

Now consider annotation: If user wants to highlight the parallel citation (S. Ct. reporter), what positions do they use? `span` of primary? Span of parallel? `fullSpan`? Different interpretations lead to bugs.

**Why it happens:**

- You designed parallel citations without considering full span
- You added full span without revisiting parallel citations
- Feature interaction was not analyzed upfront

**How to avoid:**

1. **Design parallel + full span together:**
   - Before implementing either, write spec for both
   - Define: Can a parallel citation have its own full span, or only the primary?
   - Example spec: "Primary citation has span and optional fullSpan. Parallel citations have span only (no fullSpan)."

2. **In code review, flag feature interactions:**
   - When adding parallel citations: "Does this interact with full span or party name?"
   - When adding full span: "Does this interact with parallel citations or parentheticals?"
   - Create a feature interaction matrix in ROADMAP

3. **Test parallel + full span together:**
   - Parse: "United States v. Smith, 500 U.S. 1, 136 S. Ct. 2 (2020)"
   - Verify: primary citation has correct span AND fullSpan
   - Verify: parallel citation has correct span
   - Verify: no overlapping spans across citations
   - Verify: annotation can highlight either reporter independently

4. **Document expected behavior:**
   - "If you want to annotate primary reporter only, use citation.span"
   - "If you want to annotate the full case (name + primary reporter), use citation.fullSpan"
   - "If you want to annotate parallel reporter, use citation.parallelCitations[i].span"
   - Provide examples with expected output

**Warning signs:**

- Users report confusion about which span field to use for annotation
- Different citations in same document have inconsistent span semantics
- fullSpan overlaps with parallel citation span
- Tests for parallel + full span don't exist

**Phase to address:**

- **Phase 1 (Foundation):** Design parallel + full span interaction
- **Phase 2 (Parallel Linking) + Phase 4 (Full Span):** Test interaction during implementation
- **Acceptance criteria:** Spec clearly defines span semantics for all combinations; tests validate all cases; no overlapping spans

---

## Type System Pitfalls

### Pitfall 8: Party Name Field Creating New Attribution/Metadata Debt

**What goes wrong:**

You add `partyName` to FullCaseCitation. But party name extraction is unreliable (60-80% accuracy). Now:
- Is `partyName: undefined` a parsing failure, or just "not extracted"?
- Should users trust `partyName` for deduplication? (Might be wrong)
- Should `partyName` be in the confidence score, or separate?
- If party name doesn't match the case name in the citation, is that an error?

You've created new metadata that's optional, uncertain, and users don't know whether to trust it.

**How to avoid:**

1. **Add confidence/metadata alongside party name:**
   ```typescript
   interface FullCaseCitation {
     partyName?: {
       plaintiff?: string
       defendant?: string
       confidence: number
       extractionMethod: 'regex' | 'heuristic' | 'full_text_scan'
       warnings?: string[]
     }
   }
   ```
   Now users can see uncertainty and understand extraction approach.

2. **Document uncertainty explicitly:**
   - "party name extracted via heuristic; may be inaccurate for business entities"
   - "confidence 0.8+ indicates high-confidence extraction"
   - "For legal filings, verify party name manually"

3. **Provide validation helper:**
   ```typescript
   function validatePartyName(citation: FullCaseCitation, originalText: string): ValidationResult {
     // Check if partyName appears before citation in original text
     // Verify spelling consistency
     // Return confidence adjustment if validation suggests inaccuracy
   }
   ```

4. **Test against groundtruth:**
   - Compare extracted partyName against manually-verified data from 50+ cases
   - Measure precision/recall
   - Document: "X% of extractions match manual verification"

---

## Pitfalls Summary Table

| Pitfall | Severity | When It Breaks | Prevention Phase |
|---------|----------|----------------|-----------------|
| Position tracking with parallel cites | CRITICAL | Annotation code highlights wrong text | Phase 1 (design), Phase 2 (implement) |
| Type system breaking changes | CRITICAL | User code fails to compile after upgrade | Phase 0 (roadmap version planning) |
| Party name extraction accuracy | MODERATE | Legal filings fail due to wrong party name | Phase 1 (document limitations), Phase 3 (implement conservatively) |
| Full span boundaries unbounded | MODERATE | Span covers extra text, position drift | Phase 1 (define boundaries), Phase 4 (implement) |
| Blank page type ambiguity | MODERATE | Arithmetic on page fails, type confusion | Phase 1 (type design), Phase 2 (discriminate or guard) |
| Complex parenthetical parsing | MODERATE | Court/date extracted incorrectly | Phase 1 (pattern design), Phase 5 (implement) |
| Parallel + full span interaction | MODERATE | Span semantics ambiguous, user confusion | Phase 1 (design together), Phase 2-4 (test interaction) |
| Party name metadata trust | LOW | Users don't know if field is reliable | Phase 3 (add confidence/metadata) |

---

## Phase-Specific Mitigation

### Phase 1: Foundation & Roadmap
- [ ] Document breaking type changes; plan version bump
- [ ] Define span semantics for parallel, full, and party name
- [ ] Design party name extraction boundaries and limitations
- [ ] Specify blank page type handling (discriminated union or union with guards)
- [ ] Outline parenthetical parsing rules and edge cases
- [ ] Create feature interaction matrix (parallel ↔ full span, parallel ↔ party name, etc.)
- [ ] Accept LOW confidence on party name; explicitly document unreliability

### Phase 2: Parallel Citation Linking
- [ ] Add span per parallel citation, not per group
- [ ] Implement position validation tests (100% accuracy on boundaries)
- [ ] Test parallel + full span interaction
- [ ] Update documentation with new span semantics

### Phase 3: Party Name Extraction
- [ ] Implement with conservative heuristics (accept 60-80% accuracy)
- [ ] Add confidence scoring to partyName field
- [ ] Test against 50+ real cases with edge cases
- [ ] Document limitations and accuracy expectations in README

### Phase 4: Full Span Extraction
- [ ] Implement fullSpan as OPTIONAL field (backward compatible)
- [ ] Define and validate span boundaries against 50+ real documents
- [ ] Test interaction with parallel citations and parentheticals
- [ ] Validate positions with substring extraction

### Phase 5: Complex Parentheticals
- [ ] Separate court and date extraction logic
- [ ] Test on 50+ real cases with all date formats
- [ ] Add confidence scoring for ambiguous parentheticals
- [ ] Handle nested parentheticals gracefully

---

## Recovery Strategies

| Pitfall | Recovery Cost | Steps |
|---------|---------------|-------|
| **Positions wrong in parallel citations** | HIGH | (1) Audit span calculation, (2) Rebuild position maps with comprehensive tests, (3) Validate on 50+ docs, (4) Deploy with position revalidation flag |
| **Type changes break user code** | MEDIUM | (1) Release v2.0-beta with breaking changes, (2) Provide migration guide and codemods, (3) Accept feedback on types, (4) Publish v2.0 with clear changelog |
| **Party name extraction too inaccurate** | LOW | (1) Add confidence scoring, (2) Update docs to mark as unreliable, (3) Add manual verification helpers, (4) Lower user expectations in README |
| **Full span boundaries overly broad** | MEDIUM | (1) Identify boundary rules that are too greedy, (2) Refine patterns with stricter limits, (3) Re-validate on 50+ docs, (4) Adjust confidence if boundaries uncertain |
| **Blank page type confusion** | MEDIUM | (1) Commit to discriminated union or union with guards, (2) Add comprehensive type tests, (3) Provide type-safe helpers, (4) Document type semantics clearly |
| **Parenthetical parsing wrong court** | LOW | (1) Refactor to separate court/date extraction, (2) Validate against known court list, (3) Add test cases for all formats, (4) Lower confidence for ambiguous cases |

---

## Sources

- [eyecite GitHub Issue #76: Parallel Citation Linking](https://github.com/freelawproject/eyecite/issues/76) — Design debate on parallel citation detection timing and structure
- [eyecite GitHub Issue #193: Party Name Extraction](https://github.com/freelawproject/eyecite/issues/193) — Acknowledged limitations in plaintiff/defendant extraction
- [Bluebook Rule 10: Cases](https://tarlton.law.utexas.edu/bluebook-legal-citation/how-to-cite/cases) — Case citation format requirements
- [Case Names and Party Name Rules](https://libguides.udmercy.edu/c.php?g=739087&p=5285800) — Abbreviation and omission rules for party names
- [Blank Page Number Handling](https://law.gwu.libguides.com/scotus/tips) — Supreme Court citation format for pending page numbers
- [Court and Date Parenthetical Format](https://libguides.udmercy.edu/c.php?g=739087&p=5285799) — Structure and parsing of court/date parentheticals
- [Multiple Parentheticals in Citations](https://guides.library.lls.edu/c.php?g=497703&p=3407475) — Rules for multiple parenthetical types and ordering

---

*Pitfalls research for: eyecite-ts accuracy features milestone*

*Researched: February 2026*
