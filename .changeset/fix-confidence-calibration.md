---
"eyecite-ts": patch
---

Recalibrate confidence scoring for case and short-form case citations (#147). Case citations now use multi-factor scoring: base 0.2 + reporter recognition (+0.3) + year (+0.2) + case name (+0.15) + court (+0.1). This creates clear separation between real citations (0.7-1.0) and garbage extractions (0.2-0.3). Short-form case citations also factor in reporter recognition instead of using a hardcoded 0.7. Blank page citations use a floor of 0.5 instead of overriding to 0.8.
