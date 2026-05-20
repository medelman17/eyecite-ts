---
"eyecite-ts": patch
---

fix(constitutional): accept ordinal abbreviation and word-form amendments (#534)

The constitutional patterns only matched Roman numerals or Arabic numbers after `art./amend.` (e.g., `U.S. Const. amend. XIV`). Real-world citations frequently use ordinal abbreviations (`U.S. Const., 5th Amend.`) and spelled-out word forms (`U.S. Const., Fifth Amendment`), neither of which tokenized.

Three additions:

- The numeral group now accepts `1st`..`27th` and `First`..`Twenty-Seventh` (in either hyphenated or space-separated form).
- The amendment word accepts unabbreviated `Amendment` alongside `amend.` / `amdt.`.
- A new `bare-amendment-word` pattern catches prefix forms without `Const.` (e.g., "the Fifth Amendment", "the Fourteenth Amendment") with confidence 0.5.

The extractor parses all four numeral forms (Roman, Arabic, ordinal abbreviation, word ordinal) into the existing `amendment` / `article` integer fields.
