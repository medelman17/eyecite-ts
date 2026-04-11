# Short-Form Resolution

Guide to resolving short-form citations (Id., supra, short-form case) to their full antecedents.

## Convenience API

The simplest way to resolve citations is passing `{ resolve: true }` to `extractCitations`:

```typescript
import { extractCitations } from "eyecite-ts"

const text = `
  Smith v. Jones, 500 F.2d 123 (2020).
  Id. at 125.
  Smith, supra, at 130.
  500 F.2d at 140.
`

const citations = extractCitations(text, { resolve: true })

// citations[1] is Id. — resolves to index 0 (Smith v. Jones)
console.log(citations[1].resolution)
// { resolvedTo: 0, confidence: 1.0 }
```

## Power-User API

For fine-grained control, extract first and then resolve separately:

```typescript
import { extractCitations, resolveCitations } from "eyecite-ts"

const citations = extractCitations(text)

const resolved = resolveCitations(citations, text, {
  scopeStrategy: "paragraph",
  fuzzyPartyMatching: true,
  partyMatchThreshold: 0.8,
  reportUnresolved: true,
})
```

## Resolution Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scopeStrategy` | `'paragraph' \| 'section' \| 'footnote' \| 'none'` | `'none'` | How far back to search for antecedents |
| `autoDetectParagraphs` | `boolean` | `true` | Auto-detect paragraph boundaries from text |
| `paragraphBoundaryPattern` | `RegExp` | `/\n\n+/` | Pattern to detect paragraphs |
| `fuzzyPartyMatching` | `boolean` | `true` | Enable fuzzy party name matching for supra |
| `partyMatchThreshold` | `number` | `0.8` | Similarity threshold (0-1) for fuzzy matching |
| `reportUnresolved` | `boolean` | `true` | Report failure reasons for unresolved citations |

## Scope Strategies

- **`'none'`** (default): Resolve across the entire document. Best for HTML-stripped text where paragraph boundaries are unreliable.
- **`'paragraph'`**: Only resolve within the same paragraph. Stricter but prevents cross-paragraph false matches.
- **`'section'`**: Only resolve within the same section.
- **`'footnote'`**: Zone-based isolation. Id. is strict (same footnote only), supra and short-form case can cross from footnotes to body. Requires `footnoteMap` from `detectFootnotes()`.

## Resolution by Citation Type

### Id. Citations

Id. resolves to the most recently cited full citation (or most recently resolved short-form):

```typescript
const text = "Smith v. Jones, 500 F.2d 123. Id. at 125."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0
```

### Supra Citations

Supra resolves by matching the party name against previously seen case names:

```typescript
const text = "Smith v. Jones, 500 F.2d 123. Smith, supra, at 130."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (party name "Smith" matches)
```

With `fuzzyPartyMatching: true`, minor typos and variations are tolerated using Levenshtein distance.

### Short-Form Case Citations

Short-form case citations resolve by matching volume and reporter:

```typescript
const text = "Brown v. Board, 347 U.S. 483. See 347 U.S. at 495."
const citations = extractCitations(text, { resolve: true })
// citations[1].resolution.resolvedTo === 0 (volume/reporter matches)
```

## Unresolved Citations

When `reportUnresolved: true`, failed resolutions include a reason:

```typescript
const text = "Id. at 100." // Orphan Id. with no preceding citation
const citations = extractCitations(text, { resolve: true })
// citations[0].resolution.failureReason === 'No preceding citation found'
```

## Resolution Result Type

```typescript
interface ResolutionResult {
  resolvedTo?: number // Index of the antecedent citation
  failureReason?: string // Why resolution failed
  warnings?: string[] // Ambiguity warnings
  confidence: number // 0-1 confidence score
}
```

On full citations, `resolution` is typed as `undefined`. On short-form citations, it is `ResolutionResult | undefined`.
