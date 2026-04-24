---
"eyecite-ts": patch
---

fix: drop phantom overlap citations via priority-aware subsumption dedup (#209)

0.11.3 regression: `extractCitations` emitted a phantom `case` citation
alongside a legitimate `shortFormCase` whose pincite ended in a footnote
suffix. Input `"... Smith, 100 F.3d at 462 n.14."` produced three
citations — the real full-case, the real shortFormCase, and a phantom
`case` whose span ended just before ` n.14` and whose `pinciteInfo.raw`
was `undefined`.

**Root cause.** The `state-reporter` tokenizer pattern is broad enough
to match `100 F.3d at 462` by treating `F.3d at` as a multi-word reporter
name. Before `#202`, the `shortFormCase` token covered the same span
exactly, and position-key dedup kept only one. `#202` grew the
shortFormCase token by ` n.14` to include the footnote. Same-span dedup
no longer caught it, and the phantom state-reporter survived into
extraction. Same shape as `#207` (law-review version of the same bug).

**Fix.** Replaced the exact-position dedup with priority-aware
subsumption dedup. Each token's priority is its first-occurrence index
in the composed pattern list — more specific patterns (neutral,
shortForm) come earlier than broader ones (case, journal). A token is
dropped if another kept token's span covers it *and* that kept token is
from an equal-or-more-specific pattern. This correctly:

- drops the phantom `state-reporter [61,76]` inside
  `shortFormCase [61,81]` (#209)
- drops the phantom `law-review [x,y]` inside `shortFormCase` (#207,
  now handled structurally rather than by the `(?!\s+at\s+\d)` band-aid,
  which is kept as belt-and-braces defense)
- **preserves** legitimate cases where a broader pattern contains a
  more-specific one — e.g. a `named-code` token wrapping a
  `state-constitution` token for `"Cal. Const. art. I, § 7."`. The
  broader `named-code` has a *lower* priority (later in the pattern
  list), so it does not swallow the more-specific `state-constitution`.

Four new regression tests for #209. Full suite 1825/1825 green.
