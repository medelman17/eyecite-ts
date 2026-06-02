---
"eyecite-ts": minor
---

feat(extract): historical-reform constitutional citations `former … (now …)` (#789)

`former art. XX, § 21 (now art. XIV, § 4)` (and the spelled-out `former article XX, section 21 (now art. XIV, § 4)`) now extract as a single `constitutional` citation: the primary fields hold the *former* location, and a new `currentLocation` field holds the *current* location parsed from the `(now …)` parenthetical. The distinctive `(now …)` reform parenthetical is the trigger, so the form extracts with or without a `U.S./State Const.` anchor; requiring both `former` and a `(now <location>)` keeps ordinary prose ("the former article of the treaty") from matching. `toBluebook`, component spans (`currentLocation`), and the `ConstitutionalCitation` type are updated; ordinary constitutional citations are unaffected (`currentLocation` undefined).
