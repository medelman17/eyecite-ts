# Fix #170: Id. Resolution Ignores Preceding Short-Form Citations

**Date**: 2026-04-10
**Issue**: [#170](https://github.com/medelman17/eyecite-ts/issues/170)
**Status**: Design

## Problem

`resolveId` in `DocumentResolver.ts` searches backward for `candidate.type === "case"`, skipping short-form citations, supra, statutes, and journals. This causes Id. to resolve to the wrong antecedent when a short-form citation intervenes.

**Example**: `Celotex, 477 U.S. 317. 500 F.2d at 128. Id. at 129.`
- Current: Id. resolves to Celotex (last full case) -- wrong
- Expected: Id. resolves to Smith v. Jones (via the short-form) -- correct

The bug has two independent failure modes:
1. The `lastFullCitation` pointer only updates on full citations, not after short-form resolution
2. The backward search in `resolveId` only matches `type === "case"`, ignoring short-form/supra/statutes/journals

## Approach: Port the Python eyecite `last_resolution` Pattern

Replace the backward search with a forward-tracking `lastResolvedIndex` variable, matching the upstream Python eyecite architecture.

### Bluebook Justification

Bluebook Rule 4.1: Id. refers to the "immediately preceding cited authority" -- the underlying source, regardless of citation form. The sequence Full -> Short-form -> Id. is standard legal writing. Id. can follow any citation type (case, statute, journal).

### Python eyecite Reference

Python eyecite tracks `last_resolution` that updates after every citation:

```python
for citation in citations:
    resolution = resolve(citation, ...)
    last_resolution = resolution  # updates for ALL types
```

Id. simply inherits `last_resolution`. No backward search needed.

## Design

### Change 1: Add `lastResolvedIndex` to Resolution Context

In `ResolutionContext` (resolve/types.ts):

```typescript
interface ResolutionContext {
  // ... existing fields ...

  /**
   * Index of the full citation most recently cited (directly or via resolution).
   * Updated after every successfully resolved citation.
   * Used by Id. resolution -- Id. inherits this value.
   */
  lastResolvedIndex?: number
}
```

This replaces `lastFullCitation`, which is currently dead code (set but never read -- `resolveId` does a backward search instead of using it). We remove `lastFullCitation` and use `lastResolvedIndex` for both Id. resolution and the full-citation pointer update.

### Change 2: Update the Main Resolution Loop

In `DocumentResolver.resolve()`, update `lastResolvedIndex` after every citation:

```typescript
resolve(): ResolvedCitation[] {
  const resolved: ResolvedCitation[] = []

  for (let i = 0; i < this.citations.length; i++) {
    this.context.citationIndex = i
    const citation = this.citations[i]
    let resolution: ResolutionResult | undefined

    switch (citation.type) {
      case "id":
        resolution = this.resolveId(citation)
        break
      case "supra":
        resolution = this.resolveSupra(citation)
        break
      case "shortFormCase":
        resolution = this.resolveShortFormCase(citation)
        break
      default:
        if (isFullCitation(citation)) {
          this.context.lastResolvedIndex = i  // Full citation: point at itself
          this.trackFullCitation(citation, i)
        }
        break
    }

    // After resolving a short-form citation, update lastResolvedIndex
    // to the full citation it resolved to (transitive resolution)
    if (resolution?.resolvedTo !== undefined) {
      this.context.lastResolvedIndex = resolution.resolvedTo
    }

    resolved.push({ ...citation, resolution } as ResolvedCitation)
  }

  return resolved
}
```

### Change 3: Simplify `resolveId`

Replace the backward search with a simple lookup:

```typescript
private resolveId(_citation: IdCitation): ResolutionResult | undefined {
  const currentIndex = this.context.citationIndex
  const antecedentIndex = this.context.lastResolvedIndex

  if (antecedentIndex === undefined) {
    return this.createFailureResult("No preceding citation found")
  }

  if (!this.isWithinScope(antecedentIndex, currentIndex)) {
    return this.createFailureResult("Antecedent citation outside scope boundary")
  }

  return {
    resolvedTo: antecedentIndex,
    confidence: 1.0,
  }
}
```

### What Changes for Consumers

- Id. now correctly resolves through short-form citations, supra, and other Id. citations
- Id. can resolve to non-case citations (statutes, journals, etc.) -- matching Bluebook
- If a preceding short-form/supra fails to resolve, Id. also fails (the pointer doesn't update on failure)
- `resolvedTo` still points to the **full citation index**, not the short-form -- this is transitive resolution
- Error message changes: "No preceding full case citation found" -> "No preceding citation found"

### What Doesn't Change

- `trackFullCitation` and the BK-tree logic are untouched
- `resolveShortFormCase` and `resolveSupra` are untouched
- Scope boundary checking works the same way
- All existing passing tests should continue to pass (the backward search happened to produce correct results when no short-form intervened)

## Test Plan

1. **New: Id. after short-form case** -- `Full(Smith) -> Full(Celotex) -> ShortForm(Smith) -> Id.` -- Id. resolves to Smith
2. **New: Id. after supra** -- `Full(Smith) -> Full(Jones) -> Supra(Smith) -> Id.` -- Id. resolves to Smith
3. **New: Id. after failed short-form** -- `ShortForm(no match) -> Id.` -- both fail
4. **New: Id. after statute** -- `Full(case) -> Statute -> Id.` -- Id. resolves to statute
5. **New: Chain of Id.** -- `Full -> ShortForm -> Id. -> Id.` -- both Id. resolve to Full
6. **Existing tests**: All current resolution tests pass unchanged
