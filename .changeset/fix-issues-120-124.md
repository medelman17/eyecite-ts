---
"eyecite-ts": patch
---

Fix four extraction bugs: fullSpan now extends through pincites and closing parentheticals (#120); prose false positives like "2 Court dismissed..." are detected and penalized (#121); dispositions like (per curiam) and (en banc) are captured from second parentheticals (#123); signal words no longer absorbed into caseName (#124). Issue #122 (pincite capture) was already working — regression test added.
