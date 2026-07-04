# Court-text conventions — the library's cleaning scope (decided 2026-07-04)

## The bound-volume rule

The dividing line for what eyecite-ts's internal cleaning handles versus what callers must pre-clean: **would this string appear in the official published text (the bound volume)?**

- **In scope (publication conventions)** — the library cleans these, span-mapped like HTML cleaning, and they are part of the domain: star pagination (`{**159 AD3d at 77}` — appears mid-sentence, even mid-holding), slip-opinion page markers (`[*2]`), footnote markers, and print-layout artifacts including hard line wraps and end-of-line hyphenation that can split a citation (`In-\nsurance Co.`). Documented conventions (e.g. the NY Law Reporting Bureau style manual) make this a closed, testable vocabulary.
- **Out of scope (acquisition debris)** — callers/pipelines strip what the retrieval container added: cover sheets, e-filing stamps (FILED / NYSCEF banners), index-number blocks, leaked file paths, PDF running heads/footers, OCR noise. These vary by source and acquisition method, not by court-publishing convention.

Every artifact-handling decision is **fixture-driven**: the corpus tranche below supplies the evidence; debates resolve by adding a fixture.

## Evidence base (sampled 2026-07-04)

- NY appellate slip opinion (HTML): citations fully intact; artifacts are structured and conventional — star pagination injected mid-sentence, `[*N]` markers, caption tables, citations wrapped in hyperlinks.
- NY trial-level "(U)" decision (PDF): scanned image, no text layer — text extraction yields cover-sheet metadata and page markers only. Consequence: scanned-tier documents are a *no-text* problem (upstream concern), not a dirty-text problem; the library's contract begins at text.

## Step-0 corpus tranche (feeds the v1 rewrite from day one)

~40 documents, committed through the existing corpus machinery (`corpus:fetch` → project → diff):

| Class | Count | What it exercises |
|---|---|---|
| NY Appellate Division slip ops, raw HTML | ~12 | markup handling + full publication-convention set (star pagination, `[*N]`, linked citations, caption tables) |
| NY trial-level slip ops, HTML | ~5 | style variety across court levels |
| Federal opinions via CourtListener `plain_text` | ~18 | real PDF-extraction texture: hard wraps, hyphenation mid-citation, page-break residue |
| Pathological | ~3 | near-empty scanned-PDF text (negative seed pinning graceful behavior), footnote-dense opinion, table-heavy opinion |

Requires one small NY-HTML fetcher alongside the existing CourtListener path; no other new infrastructure.

## Deferred (additive minor, per spec §8)

**Page-boundary emission**: star pagination is stripped for extraction in v1, but the boundaries it encodes (official-reporter page → text position) could be emitted as document data (`pages`-style, alongside `footnotes`). Deferred until a consumer needs pincite→location mapping; adding the field is non-breaking.
