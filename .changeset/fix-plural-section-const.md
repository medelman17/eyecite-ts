---
"eyecite-ts": patch
---

Extract plural-section constitutional prose (#321)

`Sections 5 and 10 of Article I of the Ohio Constitution` (and Oxford-comma
lists like `Sections 5, 7, and 10 of …`) now emit one `constitutional`
citation per section, each sharing the article and jurisdiction. Previously
the section-first prose pattern matched a single `Section N` only, so the
coordinated plural form dropped every section. Mirrors the plural-section
statute expansion (#453); the plural `Sections` keyword + `of Article`
connector + closed `of the <State> Constitution` trailer keep false
positives out.
