# Research: Shipping Large JSON Data in TSDown-Bundled npm Packages

**Date:** 2026-05-21
**Query:** What's the best way to ship a ~900KB JSON data asset in a tsdown-bundled npm library, preserving lazy loading?
**Depth:** deep

## Summary

**Recommendation: Variant 3b — codegen a TS module that wraps the JSON in `JSON.parse('...string...')`, then dynamic-import it.** Empirical testing against tsdown 0.20.3 / Rolldown 1.0.0-rc.3 confirms three crucial facts: (1) Rolldown's automatic code-splitting *already* peels a dynamic `import("./gen.js")` off into its own ESM and CJS chunk that ships in `dist/`, with no `tsdown.config.ts` changes — solving the orphan-chunk problem entirely; (2) Rolldown *preserves* the literal `JSON.parse('...')` call in the chunk, which V8 evaluates ~1.7× faster than an equivalent object literal once payloads cross ~10 KB ([V8 Cost of JavaScript 2019](https://v8.dev/blog/cost-of-javascript-2019)); (3) the deprecated `assert: { type: "json" }` syntax that currently ships in `eyecite-ts` was removed from Node 22 ([Node v22 changelog](https://nodejs.org/en/blog/release/v22.12.0)) — keeping it means broken builds for any user on Node 22 LTS. The current breakage is three independent bugs stacked: tarball excludes `data/`, deprecated `assert:`, and an orphan 474 KB chunk produced because Rolldown also code-splits the static path but the runtime path still references the raw `../../data/reporters.json`. Variant 3b fixes all three at once.

## Key Findings

### Finding 1 — tsdown/Rolldown automatically code-splits dynamic imports of `.ts` modules into separate chunks that ship in dist

Verified empirically. Tested with tsdown `0.20.3` / Rolldown `1.0.0-rc.3` on macOS, Node 25, three entry points sharing the same `tsdown.config.ts`:

```ts
// src/index-codegen.ts
export async function loadData() {
  const mod = await import("./data-gen.js")  // .js extension required (Node TS resolution)
  return mod.default
}
// src/data-gen.ts
const data = { /* ... */ }
export default data
```

Output (both formats, no extra config):

```
dist/codegen.mjs            0.15 kB
dist/data-gen-CQFUA4E5.mjs  0.19 kB
dist/codegen.cjs            0.27 kB
dist/data-gen-BPtRSrnU.cjs  0.18 kB
```

The CJS variant gets the canonical Rolldown wrapper `await Promise.resolve().then(() => require("./data-gen-BPtRSrnU.cjs"))`. Runtime execution succeeds in both module systems. This matches Rolldown's documented behaviour: "Dynamic imports are used to load code on demand, so we don't put imported code together with the importers" ([Rolldown — Automatic Code Splitting](https://rolldown.rs/in-depth/automatic-code-splitting)).

### Finding 2 — Static `import data from "./data.json"` ALSO code-splits, but the chunk inlines as a tagged-export object literal (the current eyecite failure mode)

Same harness, static path:

```ts
// src/index-static.ts
import data from "../data/sample.json" with { type: "json" }
```

Rolldown emits `dist/sample-D-xxtw5c.mjs` (807 B) — a chunk containing `var sample_default = { ... }` object literal. The entry imports it with `import { t as sample_default } from "./sample-D-xxtw5c.mjs"`. This *works at runtime* and ships, but produces an **object literal**, not `JSON.parse(...)`. For a 900 KB payload this is the slower path per V8.

The current `eyecite-ts` failure: the **dynamic** `await import("../../data/reporters.json", { assert: { type: "json" } })` still falls under Rolldown's JSON handler, producing the 474 KB ESM literal chunk (`reporters-CtCZyH5W.mjs`) and a near-empty 48-byte CJS stub (`reporters-Wob0oyD9.cjs` — note the CJS chunk failed because dynamic JSON imports don't translate cleanly to `require()`). But the minified runtime code in `dist/data/index.mjs` still emits the original specifier `await import("../../data/reporters.json", { assert: { type: "json" } })` — Rolldown's code-splitter and its module-replacement step disagree on the rewritten path. Net result: chunk ships, nothing references it, runtime breaks with the deprecated assert keyword on Node 22.

### Finding 3 — JSON modules with `with { type: "json" }` only stabilized in Node v22.12 / v20.18.5 / v18.20.5; `assert:` was removed in Node 22

[Node.js ESM docs](https://nodejs.org/api/esm.html) — "JSON modules — Stability: 2 - Stable" landed in v23.1.0 / v22.12.0 / v20.18.5 / v18.20.5. The `with { type: "json" }` attribute syntax is **mandatory** (deprecated `assert` removed in v22.0.0). For `engines: ">=18.0.0"`, **JSON modules are experimental** on Node 18.0–18.20.4 and emit an `ExperimentalWarning` on every dynamic import. They're also opt-in via `--experimental-json-modules` flag pre-22. ([MDN — import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with), [V8 — import attributes](https://v8.dev/features/import-attributes)).

Avoiding JSON modules entirely (Variants 3a/3b) sidesteps the experimental-warning, the syntax-deprecation, and the cross-runtime variance (Bun/Deno have their own quirks around the attribute).

### Finding 4 — Rolldown preserves `JSON.parse('...literal string...')` verbatim when codegenned into a TS module

Empirically verified. Source:

```ts
// src/data-parse-gen.ts
export default JSON.parse('{"hello":"world","reporters":{"F.2d":{"name":"Federal Reporter"}}}')
```

Produces in dist:

```js
// dist/data-parse-gen-Ckwu_N4M.mjs
var data_parse_gen_default = JSON.parse("{\"hello\":\"world\",\"reporters\":{\"F.2d\":{\"name\":\"Federal Reporter\"}}}");
export { data_parse_gen_default as default };
```

Rolldown does NOT try to constant-fold the `JSON.parse` away. This is the Mathias Bynens / Chrome DevRel "Faster apps with JSON.parse" optimization at ~1.7× speedup for payloads ≥10 KB, persisting across all modern engines ([V8 Cost of JavaScript 2019](https://v8.dev/blog/cost-of-javascript-2019), [Mathias Bynens, 2019 — still cited in 2024 Chrome perf docs](https://x.com/mathias/status/1151503069676482562), [Chrome DevRel json-parse-benchmark](https://github.com/GoogleChromeLabs/json-parse-benchmark)). The 2019 finding stands in 2026 because the underlying JSON grammar/JS grammar parser asymmetry is structural, not implementation-specific.

For a 900 KB payload like `reporters.json`, the V8 article's stated threshold (~10 KB) is exceeded by ~90×. Real-world case study showed 18% TTI improvement on a Redux app ([Joreteg blog](https://joreteg.com/blog/improving-redux-state-transfer-performance)).

### Finding 5 — Comparable npm libraries overwhelmingly choose "ship the raw JSON + load it on demand" — but the loading mechanism varies

| Library | Asset size | Strategy | Loader pattern |
|---|---|---|---|
| **mime-db** | 225 KB unpacked | Raw `db.json` in tarball | `module.exports = require('./db.json')` ([source](https://github.com/jshttp/mime-db/blob/master/index.js)) — synchronous, eagerly loaded |
| **world-countries** | 20.5 MB unpacked | Raw `countries.json` + format subdirs | `index.cjs` / `index.mjs` thin wrappers, raw JSON in `data/*` |
| **i18n-iso-countries** | 624 KB unpacked, 86 files | One JSON file per locale | User calls `registerLocale(require("i18n-iso-countries/langs/en.json"))` — pure user-driven lazy loading |
| **spdx-license-list** | 10.3 MB unpacked, 712 files | Codegenned at install via `node make.js` | Generated `.js` modules per license, dynamic require |
| **@dqbd/tiktoken** | varies | One JSON per encoder under `./encoders/*.json` | Sub-paths in `exports`: `"./encoders/cl100k_base.json"` — user picks |
| **js-tiktoken** | varies | Same — separate exports per rank | `js-tiktoken/ranks/o200k_base` (TS modules, not raw JSON) |
| **cldr-localenames-modern** | 19 MB unpacked, 1916 files | One JSON file per locale | Filesystem-based loading by locale code |
| **full-icu** | varies | Zipped data + postinstall extraction | `postinstall: node postinstall.js` extracts ICU data |
| **Python `eyecite` / `reporters-db`** | ~900 KB JSON | Raw JSON files via `MANIFEST.in: graft reporters_db/data` ([source](https://github.com/freelawproject/reporters-db/blob/master/MANIFEST.in)) | `pkg_resources` / `importlib.resources` reads JSON at import time |

**Patterns observed:**
- **Almost nobody dynamic-imports JSON via `with { type: "json" }`.** mime-db and most others use `require()` (CJS) or filesystem reads.
- **Two-tier libraries (tiktoken, i18n-iso-countries) shift the lazy-load decision to the *user***, exposing per-shard sub-paths.
- **No library inlines a 900 KB object literal into their main entry chunk.** Either codegenned `.js`, raw JSON + fs, or user-loaded shards.

### Finding 6 — `tsdown --copy` only handles input-side asset copying, not output-side bundling

The `copy` option in tsdown's `UserConfig` "Copy files to another directory" ([tsdown UserConfig docs](https://tsdown.dev/reference/api/interface.userconfig)). It accepts `'src/assets'` or `{ from, to }` and runs unconditionally — it doesn't track references from your code. So you *could* `copy: [{ from: "data/reporters.json", to: "dist/data/reporters.json" }]`, but that's redundant if Rolldown is already chunking the file. Useful for Variant 3d/3e where the file ships raw.

### Finding 7 — CJS dynamic import works for codegen but not for `with { type: "json" }`

Empirical from the same test (Variant 3a/3b vs 3 in CJS format):

```js
// dist/codegen.cjs — Variant 3a/3b — WORKS
async function loadData() {
  return (await Promise.resolve().then(() => require("./data-gen-BPtRSrnU.cjs"))).default;
}

// dist/dynamic.cjs — Variant 3 (JSON modules) — RUNTIME FAILS on Node 22+
async function loadData() {
  return (await import("../data/sample.json", { with: { type: "json" } })).default;
}
```

Rolldown rewrites `import('./foo.ts')` to `Promise.resolve().then(() => require('./foo.cjs'))` in CJS output — keeping it async but using native require. But it does **not** rewrite `import('./foo.json', { with: ... })` because there's no CJS equivalent of import attributes. This is the second bug in the current eyecite build (the 48-byte CJS stub).

## Trade-offs Matrix (Option-3 variants)

| Variant | Bundle size | Cross-runtime | Build complexity | Refresh workflow | Verdict |
|---|---|---|---|---|---|
| **3a. Codegen `.ts` w/ object literal** | Lazy chunk ~1.2× source JSON (literal syntax overhead). Parse: slow on ≥10 KB. | Universal — pure JS object | New script + checked-in `.gen.ts` | Sync script regenerates `.gen.ts` from JSON | Works, but slower parse than 3b for 900 KB |
| **3b. Codegen `.ts` w/ `JSON.parse('…')`** ★ | Lazy chunk ~1.1× source JSON (string + parse-call overhead). Parse: ~1.7× faster than 3a. | Universal — `JSON.parse` everywhere | New script (~30 lines) + checked-in `.gen.ts` | One-line in sync script: `JSON.stringify(JSON.stringify(data))` | **RECOMMENDED** |
| **3c. Codegen plain `.js` directly** | Same as 3b/3a depending on form | Universal | Skip TS toolchain for one file (slightly weird) | Same as 3b | Strictly worse than 3b — no type safety, no co-located types |
| **3d. `fs.readFile(new URL("./reporters.json", import.meta.url))`** | Core bundle 0 bytes; JSON ships raw; on-demand fs read | Node 18+, Bun, Deno ✅ — browser/workers ❌ | Trivial (10-line change) + add `data/` to `files` | Drop new JSON in `data/`, done | Best if browser is truly out-of-scope |
| **3e. Hybrid (fs Node, fetch browser)** | Same as 3d in Node; raw JSON download in browser | Universal | Runtime detection branching | Same as 3d | Future-proof; complex; deferred |

★ = primary recommendation

**Why 3b over 3d:** the project's `engines: ">=18.0.0"` and stated browser-curious posture (per the project brief: "Not browser-targeted today but shouldn't preclude it") tip the scale. Variant 3b runs unchanged on browsers, workers, and edge runtimes. Variant 3d would require shipping a Node-only entry plus a browser entry via `exports` conditions, which is more code and more surface area.

**Why 3b over 3a:** the 1.7× parse-speed delta on a 900 KB payload is meaningful for cold-start (the very thing the dynamic import optimizes for). V8's research is unambiguous at this size ([V8 blog](https://v8.dev/blog/cost-of-javascript-2019)).

## Real-World Library Comparison

(Compressed view — see Finding 5 for the full table.)

| Library | Strategy | Reason it works for them |
|---|---|---|
| mime-db | Raw JSON + sync `require()` | CJS-first, eager load is fine for 225 KB |
| world-countries | Raw JSON, multi-format dir | Dataset library; users grep what they want |
| i18n-iso-countries | One JSON per locale, user-driven | Lazy-loading shifted to user (each locale ~10 KB) |
| spdx-license-list | Codegenned `.js` per license | Want type-friendly imports, install-time generation |
| @dqbd/tiktoken | One JSON per encoder, subpath exports | Encoder-per-user is natural shard boundary |
| js-tiktoken | `.ts` modules per rank, subpath exports | Modern variant of tiktoken approach |
| cldr-localenames-modern | One JSON per locale | Standard CLDR distribution layout |
| Python `eyecite` | Raw JSON via `MANIFEST.in` graft | Python `importlib.resources` is built for this |

Eyecite-ts is sized for a **single-shard, one-time load** (most users want all reporters). That makes Variant 3b's "one lazy chunk" the right shape, with no per-shard user-facing API to design.

## Recommendations

### 1. Primary recommendation — Variant 3b

**Step A: Add a codegen script** at `scripts/generate-reporters-data.ts`:

```ts
// scripts/generate-reporters-data.ts
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { resolve, dirname } from "node:path"

const root = dirname(fileURLToPath(new URL("..", import.meta.url)))
const json = await readFile(resolve(root, "data/reporters.json"), "utf8")
JSON.parse(json) // validate

// Double-encode: the outer string becomes a JS string literal,
// the inner is the JSON payload V8 will fast-path parse.
const literal = JSON.stringify(json)

const out = `/* AUTOGENERATED by scripts/generate-reporters-data.ts — DO NOT EDIT */
import type { ReporterEntry } from "./reporters"
const data: Record<string, ReporterEntry[]> = JSON.parse(${literal})
export default data
`
await writeFile(resolve(root, "src/data/reporters.gen.ts"), out)
console.log("Wrote src/data/reporters.gen.ts")
```

**Step B: Wire into the build + refresh flow** in `package.json`:

```json
{
  "scripts": {
    "data:generate": "tsx scripts/generate-reporters-data.ts",
    "data:sync": "tsx scripts/sync-reporters-db.ts && pnpm data:generate",
    "prebuild": "pnpm data:generate",
    "build": "tsdown"
  }
}
```

**Step C: Update `src/data/reporters.ts`** (replace lines 86–94):

```ts
export async function loadReporters(): Promise<ReportersDatabase> {
  const existing = _getReportersSync()
  if (existing) return existing

  // Rolldown auto-splits this into a separate ESM+CJS chunk in dist/
  const mod = await import("./reporters.gen.js")
  const reportersData = mod.default as Record<string, ReporterEntry[]>

  const byAbbreviation = new Map<string, ReporterEntry[]>()
  const all: ReporterEntry[] = []
  // ... existing index-building logic unchanged ...
}
```

**Step D: Source-control hygiene** — add `src/data/reporters.gen.ts` to `.gitignore` (codegen artifact, regenerated via `prebuild`). This keeps PRs clean. The `data/reporters.json` file stays checked in as the canonical source. (Alternative: commit it for snapshot-stable builds. Either works; matches your project's preference.)

**Step E: Fix the `files` field** in `package.json`:

```json
"files": ["dist"]
```

Stays the same — no need to ship `data/reporters.json` in the tarball because the chunk is generated under `dist/` from the codegenned `.ts`. (One less bug surface.)

**Effort: 1-day PR.** Codegen script (~30 lines), 5-line edit to `reporters.ts`, package.json wiring, delete the stale `data:` syntax. CI changes: add `pnpm data:generate` to the test/lint workflow's pre-step if not already covered by `prebuild`.

### 2. Fallback if 3b turns out unworkable — Variant 3d (`fs.readFile`)

If the codegen step proves painful (e.g., it conflicts with watch-mode dev), switch to Node-fs:

```ts
// src/data/reporters.ts
import { readFile } from "node:fs/promises"

export async function loadReporters(): Promise<ReportersDatabase> {
  const existing = _getReportersSync()
  if (existing) return existing

  const url = new URL("../../data/reporters.json", import.meta.url)
  const text = await readFile(url, "utf8")
  const reportersData = JSON.parse(text) as Record<string, ReporterEntry[]>
  // ... rest unchanged
}
```

Then update `files`:

```json
"files": ["dist", "data/reporters.json"]
```

Cross-runtime: Node 18+, Bun, Deno all support `readFile(new URL(...), 'utf8')` ([Deno fs docs](https://docs.deno.com/api/node/fs/~/promises.readFile), [Bun fs docs](https://bun.com/reference/node/fs/promises/readFile)). Browsers — does not work; you'd need a runtime branch.

**Effort: 30 minutes.** Cleanest one-liner. Trade-off: locks out browser/worker runtimes until you add a hybrid path.

### 3. Things to NOT do (and why)

- **Don't keep the `assert: { type: "json" }` syntax.** Removed from Node 22 ([Node release notes](https://nodejs.org/en/blog/release/v22.12.0)). Every Node 22 LTS user hits a syntax error.
- **Don't switch to `with: { type: "json" }` without changing strategy.** Stable only since Node 18.20.5 / 20.18.5 / 22.12. Anyone on Node 18.0–18.20.4 gets an `ExperimentalWarning` printed to stderr on every load. Worse, the chunk-splitting bug demonstrated in Finding 2 means the runtime path won't even point at the chunk Rolldown emits.
- **Don't inline as a static `import data from "./reporters.json"`** in any code path reachable from the main entry. Even if you only use it from the `./data` entry, Rolldown's chunk graph will pull the 900 KB into your shared common chunk and torch your `size-limit: 50 KB` budget.
- **Don't use `manualChunks` to "fix" it.** Deprecated in Rolldown ([OutputOptions docs](https://rolldown.rs/reference/interface.outputoptions)) in favor of `codeSplitting`, and you don't need either — Variant 3b's natural auto-chunking is correct.
- **Don't postinstall-extract** like `full-icu` does. Adds attack surface, breaks no-postinstall security policies, and is irrelevant when the data is 900 KB (not 30 MB).
- **Don't shard reporters per region/jurisdiction** like tiktoken/i18n-iso-countries do. The data is small enough that a single chunk is fine, and users would have to know which shard to load (defeats degraded-mode lazy load).

### 4. Migration plan from current broken state

1. **Add `scripts/generate-reporters-data.ts`** (per Step A above).
2. **Add `src/data/reporters.gen.ts` to `.gitignore`** and run `pnpm tsx scripts/generate-reporters-data.ts` once locally to seed it.
3. **Edit `src/data/reporters.ts`** — replace the `await import("../../data/reporters.json", { assert: ... })` with `await import("./reporters.gen.js")` (Step C).
4. **Add `prebuild` script** to `package.json` so CI regenerates before bundling (Step B).
5. **Build locally** (`pnpm build`); verify:
   - `dist/data/index.mjs` references a `./reporters.gen-XXXXXX.mjs` chunk
   - `dist/data/index.cjs` references a `./reporters.gen-XXXXXX.cjs` chunk
   - Both chunks contain `JSON.parse("…")` (not an object literal)
   - The orphan `reporters-CtCZyH5W.mjs` (474 KB) and the 48-byte stub `reporters-Wob0oyD9.cjs` are gone
   - Total `dist/data/` size is ~900 KB (the chunk) + ~1 KB (the entry)
6. **Test runtime in Node 18, 20, 22, 24:** `pnpm exec vitest run tests/data/`. Should produce zero `ExperimentalWarning` noise.
7. **Test packaging:** `pnpm pack && tar -tzf eyecite-ts-*.tgz | grep reporters` — should see the `dist/reporters.gen-*.mjs` and `.cjs` chunks, nothing under `data/`.
8. **Add a changeset:** `pnpm changeset` → patch → "Fix lazy reporter data loading: chunked codegen replaces broken `assert:` dynamic JSON import".
9. **Update `size-limit`** in `package.json` if needed — the main bundle should drop dramatically once the orphan chunk pressure is gone. Consider adding a size-limit entry for `dist/reporters.gen-*.mjs` capped at ~1 MB.

## Sources

- [V8 — The Cost of JavaScript in 2019](https://v8.dev/blog/cost-of-javascript-2019) — JSON.parse 1.7× speedup over object literals for objects ≥10 KB
- [Mathias Bynens on X (2019)](https://x.com/mathias/status/1151503069676482562) — 1.2× to 2× speed-ups, confirmed across all engines
- [Google Chrome Labs json-parse-benchmark](https://github.com/GoogleChromeLabs/json-parse-benchmark) — empirical benchmark code
- [Rolldown — Automatic Code Splitting](https://rolldown.rs/in-depth/automatic-code-splitting) — algorithm: "Dynamic imports are used to load code on demand, so we don't put imported code together with the importers"
- [Rolldown — OutputOptions reference](https://rolldown.rs/reference/interface.outputoptions) — `assetFileNames`, `chunkFileNames`, `codeSplitting`; manualChunks deprecated
- [tsdown — UserConfig reference](https://tsdown.dev/reference/api/interface.userconfig) — `copy` option for input-side asset copying; `publicDir` deprecated alias
- [tsdown — CLI reference](https://tsdown.dev/reference/cli) — `--copy public` flag
- [Node.js — ESM modules + JSON imports](https://nodejs.org/api/esm.html) — JSON modules stable in v23.1.0/v22.12.0/v20.18.5/v18.20.5; `with` mandatory
- [Node v22.12.0 release notes](https://nodejs.org/en/blog/release/v22.12.0) — `assert:` removed in v22.0.0
- [V8 — Import attributes feature](https://v8.dev/features/import-attributes) — Chrome 123+, Safari 17.2+, Node 20.10+
- [MDN — Import attributes (`with`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with) — current cross-runtime support matrix
- [Deno — fs.promises.readFile](https://docs.deno.com/api/node/fs/~/promises.readFile) — confirms `readFile(URL)` works
- [Bun — fs.promises.readFile](https://bun.com/reference/node/fs/promises/readFile) — same
- [mime-db source](https://github.com/jshttp/mime-db/blob/master/index.js) — `module.exports = require('./db.json')` pattern
- [reporters-db MANIFEST.in](https://github.com/freelawproject/reporters-db/blob/master/MANIFEST.in) — `graft reporters_db/data` (raw JSON ships)
- [npm — package.json `files` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) — tarball inclusion rules
- [Joreteg — JSON.parse Redux case study](https://joreteg.com/blog/improving-redux-state-transfer-performance) — 18% TTI improvement in production
- Empirical verification: tsdown 0.20.3 / Rolldown 1.0.0-rc.3, Node 25.x, macOS 25.5.0 (tested in `/tmp/tsdown-json-test`)
