---
"eyecite-ts": patch
---

fix(extract): Georgia-style parenthesized parallel cite propagates the
trailing year to the inner member (#524)

In Georgia opinions (and a handful of other state systems), a parallel
citation is wrapped in parens:

    275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)

The inner cite `569 SE2d 502` is the parenthesized parallel; the
trailing `(2002)` is the shared year for both members. Before this fix,
the inner cite got `year=undefined` because the lookahead-paren scan saw
`) (2002)` immediately after the page and bailed — the leading `)`
blocked `LOOKAHEAD_PAREN_REGEX` (which requires a `(` after at most
whitespace + an optional pincite).

The fix consumes a single leading close-paren or close-bracket (with
optional whitespace) before running LOOKAHEAD_PAREN_REGEX, so the inner
cite can reach the trailing year paren. The outer Ga cite already gets
2002 via the `postChainStart` chain-skip logic; this patch fills in the
inner member.

Only one close-bracket is stripped — deeper nesting (e.g., `))`) is too
ambiguous to attribute safely. Bracketed parallel `[569 SE2d 502]
(2002)` is also handled. Volume hit-rate: ~15-50 per 300 GA-reporter
opinions.
