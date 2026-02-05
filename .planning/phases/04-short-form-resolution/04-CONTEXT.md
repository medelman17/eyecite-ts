# Phase 4: Short-Form Resolution & Integration - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve Id., Supra, and short-form citations to their full-citation antecedents with document-scoped state tracking. Complete testing and documentation for v1.0. Detection of new citation types (Id., supra, short-form) plus a resolution engine that links them back to previously-seen full citations.

</domain>

<decisions>
## Implementation Decisions

### Resolution strictness
- **Party name matching (supra):** Claude's discretion — pick the strategy that best mirrors Python eyecite's behavior
- **Ambiguous Id.:** Most recent full citation wins, always. No ambiguity flagging — simple and predictable
- **Resolution failures:** Attach warnings array to unresolved citations explaining why (e.g., "no matching antecedent found within scope"). Consistent with existing pipeline warning pattern from Phase 2
- **Short-form reporter matching:** Claude's discretion — leverage reporter DB normalization from Phase 3 as appropriate

### Resolution scope rules
- **Id. scope boundaries:** Configurable. Default to paragraph boundaries, but allow caller to configure (section, footnote, none)
- **Footnote scoping:** Claude's discretion — pick based on Python eyecite behavior and legal writing conventions
- **Supra scope:** Entire document. Supra means "above" with no distance limit
- **Nested resolution (Id. → supra → full):** Claude's discretion — pick approach matching Python eyecite behavior

### API design
- **Resolution function:** Both — separate `resolveCitations(citations)` for power users AND a `resolve` option in `extractCitations` for convenience
- **Immutability:** Claude's discretion — follow existing pipeline conventions (how extractCitations and validateCitations work)
- **State visibility:** Claude's discretion — pick what makes sense for v1.0 and future extensibility
- **Documentation:** Claude's discretion — pick the level that fits project scope and existing patterns

### Short-form detection rules
- **Short-form patterns:** Claude's discretion — pick based on Python eyecite's pattern set with ReDoS safety
- **Id. variants:** Standard set only — Id., id., Ibid., ibid. Covers 95%+ of legal documents
- **Id. with pincite ("Id. at 253"):** Claude's discretion — pick based on what's useful and Python eyecite behavior
- **Id. type distinction (Id. vs Id. at page):** Claude's discretion — follow Python eyecite's type model

### Claude's Discretion
- Party name matching strategy for supra resolution
- Short-form reporter matching approach (exact vs normalized)
- Footnote scoping behavior
- Nested/transitive resolution chains
- Immutability model for resolved citations
- State visibility in API
- Documentation level (JSDoc + README vs full docs site)
- Short-form detection pattern breadth
- Id. pincite handling
- Id. type model (single type vs subtypes)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred most implementation details to match Python eyecite's behavior where possible.

Key constraint: paragraph boundaries as default Id. scope, configurable by caller. This is the one locked architectural decision beyond "match Python eyecite."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-short-form-resolution*
*Context gathered: 2026-02-04*
