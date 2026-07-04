# eyecite-ts

Extracts legal citations from opinion and brief text and emits them as a structured citation document. This glossary is the canonical language for the v1 model; where it conflicts with 0.x field names, this file wins.

## Language

### The document

**Citation Document**:
The structured result of extracting one text — its citations, edges, groups, and footnote zones. Plain data; the unit downstream tooling stores, validates, and diffs.
_Avoid_: extraction result, output object, IR (in code — fine in design talk)

**Span**:
A half-open character range in the caller's original text. The only coordinate system that exists in the model.
_Avoid_: clean span, dual coordinates, offset pair

**Footnote zone**:
A region of the document identified as a footnote. Scopes id. resolution: an id. inside a zone may not reach outside it.
_Avoid_: footnote region, footnote map

### Citations

**Family**:
One of four structural categories of citation — caselaw, enacted, secondary, shortform. All citations in a family share one shape.
_Avoid_: category, class, supertype

**Kind**:
The fine-grained citation form within a family (e.g. reporter, neutral, docket within caselaw; statute, regulation, rule within enacted).
_Avoid_: type (the 0.x discriminant)

**Short form**:
A back-reference to an authority cited earlier — id., supra, or a short case cite ("Roe, 410 U.S. at 116"). The shortform family.
_Avoid_: reference citation

**Pincite**:
A pointed reference within a cited authority — page, page range, note, or paragraph.
_Avoid_: pin cite, jump cite

**Parenthetical**:
A trailing parenthesized annotation attached to a citation — explanatory, quoting, weighing, or date.

**Signal**:
A Bluebook introductory signal (see, see also, cf., but see, accord, contra, …) attached to a citation or string citation.

### Relationships

**Edge**:
A directed relationship between two citations, recorded at document level — resolution (short form → antecedent) or subsequent history (aff'd, rev'd, cert. denied).
_Avoid_: link, back-reference, resolvedTo

**Group**:
An n-ary association of citations recorded at document level — a parallel citation (same decision in several reporters) or a string citation (See A; B; C).
_Avoid_: citation cluster

**Antecedent**:
The full citation a short form resolves to.
_Avoid_: target, referent

**Resolution**:
The process of connecting short forms to their antecedents. Always runs; its output is resolution edges.

### Quality signals

**Confidence level**:
The categorical judgment (certain, high, medium, low) of how likely an extraction or resolution is correct. There is no numeric score in the model.
_Avoid_: confidence score, probability

**Reason code**:
A machine-readable code explaining what raised or lowered a confidence level (e.g. known reporter, fuzzy party match).
_Avoid_: warning (the 0.x free-text mechanism)

**Lint finding**:
A Bluebook-practice violation detected in a citation document (e.g. id. after an intervening cite, short form before any full cite). About the writing, not the extraction.
_Avoid_: diagnostic (reserved for extraction-quality issues)

**Canonical rendering**:
The Bluebook text produced from a citation's structured fields — the inverse of extraction.
_Avoid_: serialization (that's JSON), formatting (ambiguous with code style)

### Sources of knowledge

**Reporter**:
A publication in which case law appears, identified by abbreviation ("F.2d", "U.S."). Reporter knowledge (canonical names, variants) is supplied by a reporter source — compact by default, full database opt-in.
