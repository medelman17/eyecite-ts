# Footnote Detection

Opt-in feature that detects footnote zones in legal documents and tags citations with their footnote context.

## Quick Start

```typescript
import { extractCitations } from "eyecite-ts"

const citations = extractCitations(text, { detectFootnotes: true })

for (const cite of citations) {
  if (cite.inFootnote) {
    console.log(`Footnote ${cite.footnoteNumber}: ${cite.matchedText}`)
  }
}
```

## How It Works

Footnote detection runs on the **raw text** (before cleaning) to preserve newline structure. Two strategies are tried in order:

### HTML Strategy

Regex-based tag scanner (no DOM dependency) that detects:
- `<footnote>` and `<fn>` elements
- Elements with footnote-related class or id attributes (e.g., `class="footnote"`, `id="fn1"`)

### Plaintext Strategy

Used as a fallback when no HTML footnote tags are found. Detects:
- Separator lines (5+ dashes or underscores)
- Numbered markers after the separator: `1.`, `FN1.`, `[1]`, `n.1`

## Footnote Zones

Detection produces a `FootnoteMap` — an array of `{ start, end, footnoteNumber }` zones. The pipeline maps these zones through the `TransformationMap` to clean-text coordinates, then tags citations via binary search.

## Resolution Scope

With `scopeStrategy: 'footnote'`, the resolver enforces zone-based isolation:

- **Id. citations**: Strict — must resolve within the same footnote zone
- **Supra / short-form case**: Can cross from footnotes to body text (footnotes commonly reference citations introduced in the main text)

```typescript
const citations = extractCitations(text, {
  detectFootnotes: true,
  resolve: true,
  resolutionOptions: { scopeStrategy: "footnote" },
})
```

## Standalone API

For advanced use cases, detect footnotes independently:

```typescript
import { detectFootnotes } from "eyecite-ts"

const zones = detectFootnotes(rawText)
// [{ start: 1200, end: 1350, footnoteNumber: 1 }, ...]
```
