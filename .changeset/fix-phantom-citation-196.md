---
"eyecite-ts": patch
---

fix: suppress phantom citations emitted from numeric-prefixed party names (#196)

Real-world NY caption like `Board of Mgrs. of the 15 Union Sq. W. Condominium
v. BCRE 15 Union St., LLC, 2025 NY Slip Op 00784` emitted two `case`
citations: the real slip op plus a phantom `15 Union Sq. W. Condominium v.
BCRE 15` extracted from inside the plaintiff's name. The phantom read `15`
as volume, `Union Sq. W. Condominium v. BCRE` as reporter, and `15` as page.

**Root cause.** The `state-reporter` regex's non-greedy reporter capture
(`[A-Za-z.\d\s]+?`) happily spanned the `" v. "` case-name separator and
backtracked until a second number appeared. The downstream false-positive
filter caught this only when `reporters-db` was loaded — which is opt-in for
bundle-size reasons, so most consumers saw the phantom pass through.

**Fix.** Added negative lookahead `(?!\s+vs?\.\s)` to both `state-reporter`
and `law-review` patterns so the reporter/journal capture cannot span a
`" v. "` or `" vs. "` token. No real US reporter or journal name contains
that sequence. Applied to both patterns because a first-pass guard on just
`state-reporter` surfaced the same phantom under `law-review`.

Five new regression tests: the exact #196 text, a `vs.` variant, a cross-type
guard (no phantom `journal`), and two adversarial controls.
