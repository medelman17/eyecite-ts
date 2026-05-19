---
"eyecite-ts": patch
---

Fix `Id,` (typo comma, no period) crash on opinions with unusual pincite prefixes.

`extractCitations` would throw `Error: Failed to parse Id. citation: Id,` when an opinion contained text like `Id, at pages 2-4` (or `Id, at section 3`, etc.) — kinds where the tokenizer matched `Id,` as the start of an Id. citation via its `(?=\s+at\s)` lookahead, but then the optional pincite branch refused to extend the match because `pages` / `section` / etc. is not a recognized pincite prefix. The matched `text` field was just `Id,` (3 characters). `extractId` then re-applied the same lookahead-bearing regex against only those 3 characters — where the lookahead has nothing to look at — and threw.

The lookahead in `extractId` was redundant defensive code: the tokenizer (`ID_PATTERN`) has already enforced it. Removing it lets `extractId` parse `Id,` as a valid (typo-comma) Id citation with no pincite, matching the rest of the function's tolerance for partial parses.

Surfaced by a CAP-corpus signal-extraction audit on `f-supp-2d/876/json/0128-01.json` (`"to understand the procedure (Id, at pages 2-4)"`). No behavior change for citations that parse fully — `Id, at 1483`, `Id., at 253`, `Id. at p. 125`, and `Id. ¶ 12` all still produce identical output.
