---
"eyecite-ts": patch
---

Fix `loadReporters()` packaging — `data/reporters.json` was missing from the published tarball and the loader used the deprecated `assert: { type: "json" }` import attribute that Node 22+ rejects. Both compounded: every fresh `npm install` produced `ERR_MODULE_NOT_FOUND`, and even with the file present, modern Node failed with `ERR_IMPORT_ATTRIBUTE_MISSING`. A third latent bug shipped a 485 KB orphan chunk that nothing imported.

`reporters.json` is now codegenned into a TypeScript module (`src/data/reporters.gen.ts`) at build time, wrapped in `JSON.parse('...')` for V8's fast-path. Rolldown auto-splits the dynamic import into a sibling ESM + CJS chunk in `dist/`, preserving lazy loading without any import-attribute syntax. Includes a new integration test that builds, packs, and installs the tarball into a fresh consumer to prevent regression.

Fixes #642.
