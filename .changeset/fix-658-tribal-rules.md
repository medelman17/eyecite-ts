---
"eyecite-ts": patch
---

feat(extract): tribal court rule citations — #658 (partial)

Extend `stateRulePatterns` (#636) to cover two tribal/territorial court
rule sets that appeared in the post-Sprint-K judge sweep:

- Ho-Chunk Nation Rules of Civil Procedure: `HCN R. Civ. P. 5(C)(1)`,
  `HCN R. Civ. P. 27(B)`
- Territorial Courts Rules of Civil Procedure: `T.C.R.C.P. 19(a)`

Both follow the same shape as existing state-rule patterns (closed
prefix alternation + mandatory trailing rule number) so false positives
on bare-prose mentions are bounded.

Jurisdiction codes:
- HCN — Ho-Chunk Nation
- TC — Territorial Courts

10 new tests covering both rule sets, mid-sentence prose, federal-rule
and state-rule regression guards, and false-positive guards.

**Scope note**: #658 originally bundled three tribal-court coverage gaps.
This PR covers only the rules. Two sub-issues deferred to follow-ups:
- Tribal constitutions (`Constitution of the Ho-Chunk Nation, Art. VII,
  sec. 7(B)`, `HCN Const. Art. V, § 4`)
- Tribal codes (CS&KT `Section 2-1-813` style bare-section cites)
