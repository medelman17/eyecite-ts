---
"eyecite-ts": patch
---

test: backfill isPlausibleYear coverage for FedReg + StatutesAtLarge (#623)

Resolves #623. Sprint E audit verified `isPlausibleYear` is applied
at the FedReg and StatutesAtLarge extractors but no direct
integration tests covered those sites. Added 5 tests covering the
[1700, currentYear+1] window for both extractors.

No code changes. Test-only.
