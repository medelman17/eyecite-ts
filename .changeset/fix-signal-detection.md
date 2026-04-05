---
"eyecite-ts": patch
---

Fix signal detection accuracy from 11.2% to ~98% (#133). The root cause was broken span mapping (from #134) cascading into the leading-signal detector — wrong spans computed wrong gap text, so signals couldn't be found near their citations. Split `normalizeWhitespace` into `replaceWhitespace` (same-length, each char replaced individually) and `collapseSpaces` (pure deletion) so the position mapper handles each transformation type correctly.
