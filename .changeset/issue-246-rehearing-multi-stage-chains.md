---
"eyecite-ts": patch
---

fix: rehearing signals + multi-stage subsequent-history chain regression coverage (#246)

Add two new HistorySignal values — `rehearing_denied` and `rehearing_granted` —
and four SIGNAL_TABLE entries covering `reh'g denied`, `rehearing denied`,
`reh'g granted`, `rehearing granted`. Without these entries, `Acme Corp. v.
Beta, 50 F.4th 1 (9th Cir. 2022), reh'g denied, 60 F.4th 50 (9th Cir. 2023)`
silently dropped the rehearing link AND let the case-name scanback over-scan
backward through the prior citation when extracting the next case name.

The broader multi-stage chain machinery (`aff'd, X, overruled by Y`,
`modified, X, cert. denied, Y`) already worked thanks to the earlier
`pendingSignal` flush fix; this PR locks the behavior in with 9 regression
tests under `multi-stage subsequent history chains (#246)`. Two of those test
the working `aff'd` and `modified` chains, four test the new rehearing
signals, two test single-link regression controls, and one tests the
`review granted, opinion vacated` no-paren chain that the earlier fix
landed.

These additions are distinct from the CA-specific
`modified_on_denial_of_rehearing` compound disposition, which anchors on
`^as modified on denial of rehearing` and remains separately matched.
