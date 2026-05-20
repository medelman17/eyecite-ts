---
"eyecite-ts": patch
---

fix(statute): surface `Va. Code` / `Ala. Code` instead of bare `"Code"` in the `code` field (#530)

Named-code extraction for Virginia and Alabama produced `code: "Code"` because the registry only stores the bare suffix (`"Code"`, `"Code Ann."`) and `cleanCodeName()` strips the trailing word. The extractor now re-attaches the jurisdictional prefix so consumers see `"Va. Code"`, `"Va. Code Ann."`, `"Ala. Code"`, or `"Ala. Code Ann."`. The Virginia bare-Code extractor (`Code §`, `Virginia Code §`) is normalized to `"Va. Code"` for the same reason.
