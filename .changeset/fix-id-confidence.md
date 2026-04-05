---
"eyecite-ts": patch
---

Improve Id. citation precision with confidence differentiation and context validation (#129). Standard `Id. at N` gets confidence 1.0, comma variant `Id., at N` gets 0.9, lowercase `id.` gets 0.85. Mid-sentence non-citation uses (e.g., "The Id. card") are penalized to 0.4 via preceding-context validation.
