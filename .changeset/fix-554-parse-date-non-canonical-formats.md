---
"eyecite-ts": patch
---

fix(extract): parse ISO, European, and missing-space-after-period date
formats in `parseDate` (#554)

Before this fix, `parseDate` silently dropped the month and day for any
date format outside the two US-style forms (`Jan. 15, 2020`, `January 15,
2020`) and `MM/DD/YYYY`. ISO 8601 (`2020-06-15`), ISO with slashes
(`2020/06/15`), European order (`15 June 2020`, `15 Jun 2020`), and the
common OCR artifact `Jan.15, 1990` (no space after the period) all fell
through to the year-only matcher and produced `year: 2020` (or 1990) with
no month/day.

Four new branches are added between the existing patterns:

1. **ISO 8601** — `\b(\d{4})([-/])(\d{1,2})\2(\d{1,2})\b`, placed BEFORE
   the US numeric matcher so the leading 4-digit group is unambiguously a
   year. The back-reference on the separator (`\2`) requires both
   separators to match, preventing `2020-06/15` from being half-parsed.
2. **Missing-space-after-period** — folded into the abbreviated-month
   regex by changing the gap between month abbreviation and day from
   `\.?\s+` to `(?:\.?\s+|\.\s*)`. This accepts `Jan. 15`, `Jan 15`, and
   `Jan.15` but still rejects bare `Jan15` (the period or space is
   required as an anchor).
3. **European day-month-year** — `\b(\d{1,2})\s+(month|abbr)\.?\s+
   (\d{4})\b`, placed AFTER the US matchers so `Jan. 15, 2020` is read
   left-to-right as month-day-year and is not re-interpreted as a
   day-month-year string.
4. (No code change needed for ISO-slash beyond branch #1 — the
   back-reference handles both `-` and `/`.)

Year-only fallback is preserved so unrecognized formats still surface a
year when one is present in the string.
