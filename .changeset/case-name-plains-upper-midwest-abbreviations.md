---
"eyecite-ts": patch
---

fix: case-name lookback recognizes Nebraska's apostrophe-dropped Comr./Comrs. and Bluebook Reins.

Re-dispatched the Plains + Upper Midwest research agent (MN, IA, MO, KS, NE, ND, SD) after its first run stalled. The region is substantially Bluebook-conforming, but three real gaps remained:

- **`comr` / `comrs`** — Nebraska reporter style drops the apostrophe from "Comm'r" / "Comm'rs" and uses the single-m spellings "Comr." / "Comrs." (e.g., "Cherry Cty. Bd. of Comrs."). These normalize to distinct stems from the existing two-m `commr` / `commrs`.
- **`reins`** — "Reinsurance" abbreviation from Bluebook T6, common in ND/IA insurance captions like "Grinnell Mut. Reins. Co. v. Farm & City Ins. Co."

Adds 2 regression tests. Report retained at `docs/research/2026-05-10-citation-abbrevs-plains-upper-midwest.md`.

Deferred: `equal` (Nebraska "Bd. of Equal." Equalization) — too common as a sentence-ending English word; would need stronger false-positive guards.
