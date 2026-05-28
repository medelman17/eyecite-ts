---
"eyecite-ts": patch
---

Verify in CI that the published package loads on Node 18 — the tarball is now built once (Node 20+) and exercised by a real consumer on Node 18/20/22, closing a gap where Node 18 was never tested against the actual published artifact. Also enforce the vitest coverage thresholds, which previously sat at the wrong config level and were silently ignored. No public API or runtime behavior changes. Closes #776.
