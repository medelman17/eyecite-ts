---
"eyecite-ts": patch
---

fix(extract): filter journal phantom matches in standalone prose (#615)

Resolves #615. The journal `law-review` regex is intentionally broad
(no journals-db gate) so it can fire on any `[volume] [Capitalized Run]
[page]` shape — including pure prose like `In 1974 Senator Smith Jones
500 cases were filed.`. The post-#614 overlap-dedup pass catches phantoms
that overlap higher-priority citations, but standalone-prose phantoms
slipped through.

The extractor now drops multi-word journal captures that lack BOTH a
period AND a short (≤2 char) word. Real journal abbreviations satisfy
at least one of:

- single word (`Neurology`, `JAMA`, `Science`), OR
- contains a period (`Harv. L. Rev.`, `Yale L.J.`), OR
- contains a short token (`Brook L Rev`, `Yale L J` — `L`, `J`, `Rev`).

| input | before | after |
|---|---|---|
| `In 1974 Senator Smith Jones 500 cases were filed.` | phantom journal `Senator Smith Jones` | dropped ✓ |
| `70 Brook L Rev 1045` | journal `Brook L Rev` | unchanged ✓ |
| `96 Yale L J 1234` | journal `Yale L J` | unchanged ✓ |
| `53 Neurology 1107` | journal `Neurology` | unchanged ✓ |
| `100 Harv. L. Rev. 500` | journal `Harv. L. Rev.` | unchanged ✓ |
| `285 JAMA 2486` | journal `JAMA` | unchanged ✓ |

7 regression tests in `tests/extract/issue615JournalPhantom.test.ts`.
