---
"eyecite-ts": patch
---

Fix short-form case citation recall for comma-before-at patterns (#127). The regex now accepts an optional comma between the reporter and `at` keyword (`\s*,?\s+at`), matching SCOTUS style (`597 U.S., at 721`), federal circuit style (`116 F.4th, at 1193`), nominative reporters (`9 Wheat., at 201`), and law review short forms (`133 Harv. L. Rev., at 580`). Expected recall improvement from ~47.6% to ~75%+.
