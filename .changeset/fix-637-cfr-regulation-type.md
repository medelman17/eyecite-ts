---
"eyecite-ts": minor
---

feat(types): CFR citations emit `type: "regulation"` instead of `"statute"` — #637

C.F.R. citations are regulations issued by executive agencies under
delegated authority, not statutes enacted by a legislature. Previously
every CFR citation came out as `type: "statute"`, indistinguishable
from USC. Downstream consumers wanting to filter regulations vs
statutes had to resort to `code === "C.F.R."` string matching.

**New `RegulationCitation` interface** in the discriminated union — same
field shape as `StatuteCitation` (title, code, section, subsection,
chapter, sectionRange, subsectionRange, jurisdiction, pincite,
hasEtSeq, year, publisher, recompiledYear, editionLabel, spans), but
discriminated as `type: "regulation"`. `Citation` union, `CitationType`
enum, and `attachStatuteYearParen` post-processor all extended.

Documented examples:
- `42 C.F.R. § 100.3` → `{ type: "regulation", title: 42, code: "C.F.R.", section: "100.3" }`
- `29 C.F.R. § 779.238` → regulation
- `19 C.F.R. § 351.412(e)` → regulation with subsection
- `42 CFR 447` (no §, no periods) → regulation
- `12 C.F.R., § 226` (#587 comma form) → regulation
- `12 C.F.R. § 226.5(a)(2018)` (#588 year-glued) → regulation with year
- `42 C.F.R. Part 100` → regulation

USC remains `type: "statute"`. The internal `extractFederal` dispatcher
routes both USC and CFR through the same parser; the only difference is
the `type` discriminator chosen based on the canonicalized `code` field.

**Bluebook rendering preserved**: `toBluebook()` handles `statute` and
`regulation` identically — same `title code § section(subsection)` shape.

**Migration**: consumers that previously did
`citations.filter(c => c.type === "statute" && c.code === "C.F.R.")` can
simplify to `citations.filter(c => c.type === "regulation")`. Code that
unconditionally branches on `type === "statute"` for CFR will need to
add a `regulation` branch or use `type === "statute" || type === "regulation"`.
