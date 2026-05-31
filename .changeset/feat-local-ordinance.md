---
"eyecite-ts": minor
---

Add `localOrdinance` citation type for municipal ordinances (#778)

Clark County Code/Ordinance references (`CCCO § 2.12.010(1)`, including parenthetical subsections) now extract as `type: "localOrdinance"` with `code` (`"CCCO"`), `locality` (`"Clark County, NV"`), and `section`. The type is jurisdiction-general — designed to also fit Cook County, L.A. County, and Miami-Dade municipal codes.
