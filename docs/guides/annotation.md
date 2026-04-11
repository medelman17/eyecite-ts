# Citation Annotation

Guide to marking up citations with HTML or custom markup in the original text.

## Template Mode

Wrap citation text with before/after strings:

```typescript
import { annotate } from "eyecite-ts/annotate"
import { extractCitations } from "eyecite-ts"

const text = "See Smith v. Jones, 500 F.2d 123 (2020)."
const citations = extractCitations(text)

const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})
// result.text === 'See Smith v. Jones, <cite>500 F.2d 123</cite> (2020).'
```

## Callback Mode

Full control over annotation output per citation:

```typescript
const result = annotate(text, citations, {
  callback: (citation, surrounding) => {
    if (citation.type === "case") {
      return `<a href="/cases/${citation.volume}-${citation.page}">${citation.matchedText}</a>`
    }
    return `<span>${citation.matchedText}</span>`
  },
})
```

The `surrounding` parameter provides ~30 characters of context around the citation for context-aware decisions.

## XSS Auto-Escape

Auto-escape is **enabled by default** to prevent XSS injection. Special HTML characters are escaped in non-markup text:

- `<` -> `&lt;`, `>` -> `&gt;`, `&` -> `&amp;`, `"` -> `&quot;`, `'` -> `&#39;`, `/` -> `&#x2F;`

```typescript
// Secure by default
const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
  autoEscape: true, // default
})
```

**Security warning:** Only disable `autoEscape` if you are certain the text comes from a trusted source.

## Full Span Annotation

By default, annotation wraps only the citation core (volume-reporter-page). Use `useFullSpan` to annotate from the case name through the closing parenthetical:

```typescript
const text = "In Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), the court held..."
const citations = extractCitations(text)

// Default: annotates only "500 F.2d 123"
const coreOnly = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})
// "In Smith v. Jones, <cite>500 F.2d 123</cite> (9th Cir. 2020) (en banc), the court held..."

// useFullSpan: annotates "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
const fullSpan = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
  useFullSpan: true,
})
// "In <cite>Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)</cite>, the court held..."
```

Full span covers: case name, volume-reporter-page, court/date parenthetical, disposition parenthetical, chained parentheticals, and subsequent history.

## Annotation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useCleanText` | `boolean` | `false` | Annotate cleaned text (true) or original text (false) |
| `autoEscape` | `boolean` | `true` | Auto-escape HTML entities for XSS protection |
| `useFullSpan` | `boolean` | `false` | Annotate full citation span vs. core only |
| `template` | `{ before, after }` | - | Template mode: strings to wrap citation text |
| `callback` | `(citation, surrounding) => string` | - | Callback mode: custom annotation function |

## Position Tracking

The `AnnotationResult` includes a `positionMap` for mapping original positions to annotated positions:

```typescript
const result = annotate(text, citations, {
  template: { before: "<cite>", after: "</cite>" },
})

// result.positionMap: Map<number, number>
// Maps original character positions to new positions after markup insertion
// Useful for updating external indices (search highlights, cursor positions)
```
