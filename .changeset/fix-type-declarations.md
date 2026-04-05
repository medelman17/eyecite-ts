---
"eyecite-ts": patch
---

Fix missing type declarations (#149). The package.json exports map pointed to `.d.ts` files that don't exist — the build emits `.d.mts` (ESM) and `.d.cts` (CJS). Updated exports to use conditional types per format so TypeScript consumers get proper type information for all entry points.
