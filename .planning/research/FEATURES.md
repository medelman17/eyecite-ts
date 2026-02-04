# Feature Research: Legal Citation Extraction

**Domain:** Legal technology — citation extraction and text annotation
**Researched:** February 4, 2026
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users expect eyecite-ts to have for feature parity with Python eyecite. Missing these = product feels incomplete for JavaScript/TypeScript ecosystem.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Full case citation extraction** | Core use case: "Bush v. Gore, 531 U.S. 98, 99-100 (2000)" format parsing | HIGH | Parser must handle court codes, year, reporter names, volumes, page numbers, pinpoint citations |
| **Short-form citation recognition** | Users commonly cite "531 U.S., at 99" after first full citation | MEDIUM | Pattern matching against previously identified full citations |
| **Statutory citation extraction** | Legal documents heavily reference statutes: "Mass. Gen. Laws ch. 1, § 2" | MEDIUM | State/federal code structure varies; requires code abbreviation database |
| **Journal/law review citations** | Academic legal writing cites journals: "1 Minn. L. Rev. 1" | LOW | Pattern matching for journal name + volume + page |
| **Id. citation resolution** | Critical shorthand in legal writing: "Id., at 101" → links to immediately preceding citation | MEDIUM | Requires maintaining citation context and antecedent tracking |
| **Supra citation resolution** | Case name + "supra": "Bush, supra, at 100" → links to earlier full citation | HIGH | Must match partial case names to full citations across document |
| **Text cleaning** | Remove HTML, OCR artifacts, normalize whitespace for better extraction | MEDIUM | Handle common legal document formats (PDFs, scans, OCR) |
| **Citation annotation** | Insert markup around extracted citations for linking/highlighting | MEDIUM | Preserve original text offset for re-mapping to cleaned text |
| **Accurate citation detection** | eyecite achieves 99.9977% accuracy on 55M+ citations | HIGH | Requires comprehensive reporter database and pattern validation |

### Differentiators (Competitive Advantage)

Features that set eyecite-ts apart in the JavaScript/TypeScript ecosystem. Not expected, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zero runtime dependencies** | npm package with <50KB gzipped (~150KB uncompressed) | HIGH | Constraint requires custom regex/parsing, no complex libraries. Massive competitive advantage for browser distribution. |
| **Browser-native extraction** | Run citation extraction in-browser without backend dependency | HIGH | Currently dominated by Python (eyecite, LexNLP) or limited JS tools. Browser support differentiates for privacy-conscious legal tech. |
| **Node.js + browser dual support** | Single package works in both environments without code duplication | MEDIUM | TypeScript's cross-platform capabilities; most libraries pick one. |
| **Real-time citation highlighting as-you-type** | Enable live annotation in code editors, legal document viewers | MEDIUM | Low-latency extraction enables interactive UX eyecite-py can't match. |
| **Streaming citation extraction** | Process large documents incrementally without buffering entire text | MEDIUM | Web worker integration for non-blocking processing. |
| **Citation linking to external sources** | Automatically generate links to CourtListener, Google Scholar, etc. | MEDIUM | Enhances utility for legal research workflows; eyecite-py focuses only on extraction. |
| **Multi-format document support** | Native support for extracting from PDFs, DOCX, plain text in browser | HIGH | Would require PDF.js + docx libraries (adds dependencies). Feasible but increases scope. |
| **International citation support** | Extend beyond US-only to Canadian, UK, Australian citations | HIGH | Not in Python eyecite currently; ecosystem wants this. Requires new reporter databases. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build. Common mistakes in legal citation extraction.

| Feature | Why Requested | Why Problematic | What to Do Instead |
|---------|---------------|-----------------|-------------------|
| **Machine learning-based citation detection** | "Better accuracy than regex!" claims. Tempting for hard cases. | ML models add massive dependencies (TensorFlow.js, ML5), blow size budget, require training data, hallucinate citations (problem in legal tech). Fragile across legal document variations. | Stick with curated regex + reporter database. Eyecite already achieves 99.9977% — regex is proven, maintainable. |
| **Citation validation against live legal databases** | "Link to real case, verify it exists" sounds useful. | Requires API calls (CourtListener, Google Scholar), latency, external dependencies, rate limiting. Creates backend requirement contradicting "zero dependencies." Network failures break extraction. | Provide utility functions for *optional* linking, but don't couple extraction to external validation. |
| **Automatic citation sentiment analysis** | "Flag citations as positive/negative authority" — legal research firms want this. | Requires NLP models or heuristics that hallucinate. Legal context is nuanced. "Negative" citation might be distinguishing, not weakening. Generates liability if misclassified. | Out of scope. Extract citations cleanly; let consuming apps add interpretation. |
| **International/non-US citation formats** | "We need Canadian/UK citations!" Seems like natural expansion. | Each jurisdiction has unique citation rules (completely different from US). Would require separate parser modules for each, bloating bundle size. Testing complexity explodes. Better as separate npm packages. | Launch with US-only (matches Python eyecite MVP). Plan modular architecture for international packages as future libraries (e.g., `@eyecite/citations-ca`). |
| **Real-time document OCR preprocessing** | "Fix the OCR before extraction!" — attractive for scanned PDFs. | OCR is complex (tesseract.js is large), error-prone, outside domain expertise. Creates false promise of quality extraction from bad scans. | Accept OCR quality as input constraint. Provide optional text cleaning (remove common OCR artifacts), but document limitations. |
| **Citation clustering/deduplication** | "Merge duplicate citations with slight formatting variations." | Creates false positives (two genuinely different citations misidentified as duplicates). Legal citation precision is critical. | Extract as-is, preserve original text. Let consuming apps handle deduplication based on context. |

## Feature Dependencies

```
[Citation Extraction] (core)
    ├──requires──> [Reporter Database] (static data)
    └──enables───────> [Citation Annotation] (markup + positions)
                            └──requires──> [Text Cleaning] (reconcile positions)

[Short-Form Citation Resolution]
    └──requires──> [Citation Extraction] (need full citations to resolve against)

[Id. Citation Resolution]
    ├──requires──> [Citation Extraction]
    └──requires──> [Citation Context Tracking] (track preceding citation)

[Supra Citation Resolution]
    ├──requires──> [Citation Extraction]
    └──conflicts──> [Short-Form Resolution] (overlap in behavior, separate code path)

[Browser Distribution]
    └──requires──> [Zero Runtime Dependencies] (size constraint)
    └──requires──> [Type Definitions] (TS support for browser consumers)
```

### Dependency Notes

- **[Citation Extraction] requires [Reporter Database]:** Regex patterns alone aren't sufficient; patterns need validation against reporters_db to distinguish real citations from false positives. Database is static JSON, not a runtime dependency.

- **[Text Cleaning] enables [Citation Annotation]:** When input text is cleaned (HTML removed, whitespace normalized), positions shift. Annotation needs diffing to map cleaned positions back to original text.

- **[Short/Id/Supra Resolution] require [Citation Context]:** These features depend on tracking the citation sequence in the document. A stateful extractor maintains context as it iterates.

- **[Id/Supra] conflict for scoping:** Both reference previous citations, but via different mechanisms. They require separate resolution logic. Same extractor can handle both, but algorithms don't overlap.

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to achieve feature parity with Python eyecite and validate TypeScript/JavaScript adoption.

- [ ] **Full case citation extraction** — Core value, most common citation format
- [ ] **Statutory citation extraction** — Users expect this alongside case citations
- [ ] **Law journal citations** — Complete citation coverage for academic legal documents
- [ ] **Short-form recognition** — Essential for realistic legal documents
- [ ] **Id. citation resolution** — Most critical shorthand for legal writing
- [ ] **Text annotation** — Enables downstream linking/highlighting applications
- [ ] **Text cleaning** — Handle common OCR/HTML artifacts
- [ ] **Zero runtime dependencies** — Core competitive advantage; validates npm distribution
- [ ] **Browser + Node.js support** — Broad ecosystem reach

**Validation criteria:** Can drop into JavaScript legal tech projects. Produces identical citation extractions to Python eyecite on test corpus (>99.99% parity on 100K+ test citations).

### Add After Validation (v1.1-v1.5)

Features to add once core is working and users validate the library.

- [ ] **Supra citation resolution** — Users will request this after core works. ~10-15% of legal citations.
- [ ] **Streaming extraction** — Large document support without memory bloat
- [ ] **Enhanced HTML annotation** — Configurable markup (data attributes, classes) for consumption by legal doc viewers
- [ ] **Citation linking utilities** — Generate links to CourtListener, Google Scholar (optional, not bundled)
- [ ] **Performance optimization** — Benchmark against eyecite-py; optimize hot paths if slower

### Future Consideration (v2+)

Features to defer until product-market fit is established and dependency constraints relax.

- [ ] **International citation support** — Modular packages for CA, UK, AU. Separate concern from US extraction.
- [ ] **Advanced text cleaning** — PDF/DOCX parsing. Requires heavy dependencies; defer until feature request volume justifies them.
- [ ] **Citation validation against external APIs** — Optional integration with legal databases. Adds network dependency; post-MVP.
- [ ] **Sentiment/authority analysis** — Out of domain. Extract cleanly; let consumers add interpretation.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Full case citations | HIGH | HIGH | P1 | Phase 1 |
| Text cleaning | HIGH | MEDIUM | P1 | Phase 1 |
| Citation annotation | HIGH | MEDIUM | P1 | Phase 1 |
| Statutory citations | HIGH | MEDIUM | P1 | Phase 1 |
| Short-form recognition | MEDIUM | MEDIUM | P1 | Phase 1 |
| Id. resolution | HIGH | MEDIUM | P2 | Phase 2 |
| Journal citations | MEDIUM | LOW | P1 | Phase 1 |
| Supra resolution | MEDIUM | HIGH | P2 | Phase 2 |
| Streaming extraction | MEDIUM | MEDIUM | P2 | Phase 2 |
| Citation linking | MEDIUM | LOW | P3 | Phase 3 |
| Streaming/web workers | MEDIUM | MEDIUM | P3 | Phase 3 |
| International support | LOW | HIGH | P3 | Future |
| Citation validation APIs | LOW | MEDIUM | P3 | Future |

**Priority key:**
- **P1:** Must have for v1.0 launch (feature parity + browser advantage)
- **P2:** Should have by v1.1-v1.5 (complete feature set)
- **P3:** Nice to have, future consideration (ecosystem expansion)

## Competitor Feature Analysis

| Feature | Python eyecite | LexNLP | Citation.js (JS) | Our Approach (eyecite-ts) |
|---------|---|---|---|---|
| **Full case citations** | ✓ (primary) | ✓ (subset) | ✓ (US-only) | ✓ (primary) |
| **Statutory citations** | ✓ | ✓ (broader: contracts, regulations) | Limited | ✓ |
| **Short-form recognition** | ✓ | Implicit | Limited | ✓ |
| **Id. resolution** | ✓ | N/A | N/A | ✓ |
| **Supra resolution** | ✓ | N/A | N/A | ✓ (v1.1) |
| **Journal citations** | ✓ | ✓ | ✓ | ✓ |
| **Text annotation** | ✓ | N/A | Limited | ✓ |
| **Text cleaning** | ✓ | ✓ (more comprehensive) | Limited | ✓ (focused on citations) |
| **Browser-native** | ✗ (Python only) | ✗ (Python only) | ✓ | ✓ |
| **Zero dependencies** | ✗ (uses reporters_db, regex modules) | ✗ (heavy NLP libraries) | ✓ (mostly) | ✓ |
| **Size (gzipped)** | N/A (Python) | ~30MB+ (with deps) | ~200KB | <50KB |
| **International support** | US-only | US-focused (some EU contracts) | Limited | US-only initially |
| **Live editing support** | ✗ (document-oriented) | ✗ | Possible | ✓ (design for it) |

**Competitive positioning:** eyecite-ts is the only library combining Python eyecite's accuracy with browser-native extraction and sub-50KB footprint. No Python/npm bridge needed; JavaScript/TypeScript projects get native extraction without backend dependency.

## Sources

### Official Documentation
- [Eyecite Official Project](https://free.law/projects/eyecite)
- [Eyecite GitHub Repository](https://github.com/freelawproject/eyecite)
- [Eyecite API Documentation](https://freelawproject.github.io/eyecite/)
- [Eyecite Whitepaper (PDF)](https://free.law/pdf/eyecite-whitepaper.pdf)
- [Eyecite JOSS Publication](https://joss.theoj.org/papers/10.21105/joss.03617)

### Ecosystem Surveys & Legal Tech Context
- [Survey on Legal Information Extraction: Current Status and Open Challenges (Springer Nature, 2025)](https://link.springer.com/article/10.1007/s10115-025-02600-5)
- [Natural Language Processing for the Legal Domain: A Survey of Tasks, Datasets (arXiv, 2024)](https://arxiv.org/pdf/2410.21306)
- [Legal RAG Hallucinations Research (Stanford)](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf)

### Competing Libraries & Alternatives
- [LexNLP by LexPredict (GitHub)](https://github.com/LexPredict/lexpredict-lexnlp)
- [Citation.js by Unit States (GitHub)](https://github.com/unitedstates/citation)
- [CiteSight (GitHub)](https://github.com/JaySmith502/CiteSight)
- [LexNLP Features & Documentation (ContraxSuite)](https://contraxsuite.com/lexnlp-features/)

### Legal Tech & Citation Challenges
- [Legal Technology Trends 2026 (Rev)](https://www.rev.com/blog/legal-technology-trends)
- [9 Best Legal AI Tools for Lawyers in 2026 (Spellbook)](https://www.spellbook.legal/learn/legal-ai-tools)
- [Citation Extraction Performance & Accuracy Requirements (Multiple Sources)](https://springsapps.com/knowledge/using-ai-for-legal-research-how-it-works-and-best-solutions)

---

*Feature research for: Legal citation extraction (eyecite-ts)*
*Researched: February 4, 2026*
*Confidence: HIGH — Based on official eyecite documentation, ecosystem surveys, and established legal tech standards*
