import { execSync, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

/**
 * Regression test for #642: the published tarball must actually work.
 *
 * Two prior bugs were latent because the test suite ran against the source
 * tree, not the published artifact. This packs the package, installs it into
 * a clean tempdir, and exercises `loadReporters()` from a fresh Node process —
 * what a consumer experiences after `npm install`.
 *
 * Failure modes this catches:
 *  - data/reporters.json missing from tarball (ERR_MODULE_NOT_FOUND)
 *  - deprecated `assert: { type: "json" }` rejected by Node 22+
 *  - orphan chunks / CJS path mismatch
 *  - any future packaging regression where dist/ + the import graph drift apart
 *
 * Build vs consume are decoupled: set EYECITE_TARBALL to a pre-packed `.tgz` and
 * the test installs that artifact directly — no local build — so it runs on any
 * Node version, including Node 18. CI builds + packs once (Node 20+) and feeds
 * the artifact to a Node 18/20/22 matrix. Without EYECITE_TARBALL the test builds
 * and packs itself, which needs Node 20+ (tsdown → Rolldown `util.styleText`); on
 * older Node with no tarball provided it skips.
 */
const providedTarball = process.env.EYECITE_TARBALL
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10)
const buildSupported = nodeMajor >= 20
const canRun = Boolean(providedTarball) || buildSupported

const projectRoot = resolve(__dirname, "../..")
let workDir: string
let tarballPath: string
let esmConsumer: string
let cjsConsumer: string

function installTarball(consumerDir: string, type: "module" | "commonjs"): void {
  mkdirSync(consumerDir, { recursive: true })
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ name: `consumer-${type}`, version: "0.0.0", type, private: true }),
  )
  // Quote the path (TMPDIR may contain spaces); --no-audit/--no-fund keep the
  // install hermetic (no registry audit/funding requests — zero runtime deps).
  execSync(`npm install --no-audit --no-fund "${tarballPath}"`, {
    cwd: consumerDir,
    stdio: "pipe",
  })
}

function runScript(consumerDir: string, scriptName: string, source: string) {
  const scriptPath = join(consumerDir, scriptName)
  writeFileSync(scriptPath, source)
  return spawnSync("node", [scriptPath], {
    cwd: consumerDir,
    encoding: "utf8",
  })
}

describe.skipIf(!canRun)("Published tarball (#642 regression)", () => {
  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), "eyecite-tarball-"))
    esmConsumer = join(workDir, "esm-consumer")
    cjsConsumer = join(workDir, "cjs-consumer")

    if (providedTarball) {
      // Consume a pre-built artifact (CI builds once on Node 20+ and runs this
      // across the Node matrix). No build step — works on Node 18.
      tarballPath = resolve(providedTarball)
    } else {
      // Local mode: build + pack ourselves. `files: ["dist"]` only ships what's
      // already on disk, and a stale dist would mask real bugs.
      execSync("pnpm build", { cwd: projectRoot, stdio: "pipe" })
      execSync(`npm pack --pack-destination "${workDir}"`, { cwd: projectRoot, stdio: "pipe" })
      const packed = readdirSync(workDir).find((f) => f.endsWith(".tgz"))
      if (!packed) throw new Error(`no packed tarball (*.tgz) found in ${workDir}`)
      tarballPath = join(workDir, packed)
    }

    installTarball(esmConsumer, "module")
    installTarball(cjsConsumer, "commonjs")
  }, 180_000)

  afterAll(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true })
  })

  it("ESM consumer can loadReporters()", () => {
    const proc = runScript(
      esmConsumer,
      "load.mjs",
      `import { loadReporters } from "eyecite-ts/data"
const db = await loadReporters()
if (!db || !(db.byAbbreviation instanceof Map)) throw new Error("no map")
if (db.all.length < 1000) throw new Error("too few reporters: " + db.all.length)
console.log("OK " + db.all.length)
`,
    )
    expect(proc.status, `error: ${proc.error?.message}\nstdout: ${proc.stdout}\nstderr: ${proc.stderr}`).toBe(0)
    expect(proc.stdout.trim()).toMatch(/^OK \d{4,}$/)
  })

  it("does not emit ExperimentalWarning or import-assertion deprecation", () => {
    const proc = runScript(
      esmConsumer,
      "load-quiet.mjs",
      `import { loadReporters } from "eyecite-ts/data"
await loadReporters()
`,
    )
    expect(proc.status, `error: ${proc.error?.message}\nstderr: ${proc.stderr}`).toBe(0)
    expect(proc.stderr).not.toMatch(/ExperimentalWarning.*JSON/i)
    expect(proc.stderr).not.toMatch(/Import assertions/i)
    expect(proc.stderr).not.toMatch(/import attribute/i)
  })

  it("CJS consumer can require() + dynamically load reporters", () => {
    // CJS code path was completely broken before #642 fix (48-byte stub chunk).
    const proc = runScript(
      cjsConsumer,
      "load.cjs",
      `const { loadReporters } = require("eyecite-ts/data")
loadReporters()
  .then(db => {
    if (db.all.length < 1000) throw new Error("too few: " + db.all.length)
    console.log("OK " + db.all.length)
  })
  .catch(e => { console.error("FAIL", e.message); process.exit(1) })
`,
    )
    expect(proc.status, `error: ${proc.error?.message}\nstdout: ${proc.stdout}\nstderr: ${proc.stderr}`).toBe(0)
    expect(proc.stdout.trim()).toMatch(/^OK \d{4,}$/)
  })
})
