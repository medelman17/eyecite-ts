---
"eyecite-ts": minor
---

feat: `analyzeDocument` API — prose offsets, quote attribution, citation graph

Adds a sibling function to `extractCitations` that projects the extraction output into a richer `Document` view for document-understanding consumers.

```ts
import { extractCitations, analyzeDocument } from "eyecite-ts"

const cites = extractCitations(text, { resolve: true })
const doc = analyzeDocument(text, cites)
// doc.proseSpans          — Span[] for prose between citations
// doc.precedingProse      — Map<citationIndex, Span>
// doc.followingProse      — Map<citationIndex, Span>
// doc.quoteAttributions   — quoted-text zones paired with citations
// doc.citationGraph       — { nodes, edges: Edge[] } with 7 typed edge kinds
// doc.footnoteZones?      — present when extractCitations was called
//                            with detectFootnotes: true
```

**Three new capabilities:**

- **Prose offsets** — geometric inverse complement of citations. Top-level array + per-citation views. Uses `fullSpan` (when available) to bound citations so case names aren't mislabeled as prose.

- **Quote attribution** — every quoted-text zone (paired `"..."` / `"..."` / markdown `>`) gets attribution attempted. Three kinds: `block-quote` (Bluebook Rule 5 canonical form), `adjacent` (inline quote in same sentence as a citation), `parenthetical` (quote inside an explanatory parenthetical). Confidence stratified per kind (0.85–0.98). Unattributed zones still surface with `citationIndex` undefined.

- **Citation graph** — every relationship eyecite-ts already computes (`resolvedTo`, `antecedentIndex`, `groupId` parallels, `subsequentHistoryOf`, `pinciteInheritedFrom`, `stringCitationGroupId`, parenthetical nesting) projected into a unified typed-edge graph. Seven edge kinds: `resolves-to | antecedent | parallel | history-of | pincite-inherit | string-cite | in-parenthetical-of`.

**New type — `AnalyzedFootnoteZone`** — the document-level footnote zone (with `citationIndices`). The simpler `FootnoteZone` from the footnotes module remains unchanged. Use `AnalyzedFootnoteZone` when you need the analysis enrichment; the existing `FootnoteZone` when you only need positional info.

**No breaking changes.** `extractCitations` continues to return `Citation[]` unchanged. The new API is additive.

**Three pure refactors land in this PR** to support the new module:

- `detectQuoteZones` moves from `DocumentResolver.ts` to `src/utils/detectQuoteZones.ts`.
- `getCitationStart` / `getCitationEnd` move from `detectStringCites.ts` to `src/utils/citationBounds.ts`.
- `computeParenDepths` moves from `DocumentResolver` (private method) to `src/utils/parenDepths.ts`.

Same algorithms; now reusable.

See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md` for the full design and `docs/research/2026-05-19-document-understanding-api.md` for the legal-tech / NLP / academic-bibliometrics reference validation.
