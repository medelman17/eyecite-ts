import { execSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
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
 * Skipped on Node < 20: the test invokes `pnpm build` (tsdown → Rolldown),
 * which requires Node 20+ (`util.styleText`). The published artifact itself
 * works on Node 18 — only the build toolchain needs the newer Node. Coverage
 * of Node 18 consumer behavior comes from the rest of the test suite.
 */
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10)
const buildSupported = nodeMajor >= 20

const projectRoot = resolve(__dirname, "../..")
let workDir: string
let esmConsumer: string
let cjsConsumer: string

function installTarball(consumerDir: string, type: "module" | "commonjs"): void {
  execSync(`mkdir -p ${consumerDir}`)
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ name: `consumer-${type}`, version: "0.0.0", type, private: true }),
  )
  execSync(`npm install ${workDir}/eyecite-ts-*.tgz`, {
    cwd: consumerDir,
    stdio: "pipe",
    shell: "/bin/sh",
  } as Parameters<typeof execSync>[1])
}

function runScript(consumerDir: string, scriptName: string, source: string) {
  const scriptPath = join(consumerDir, scriptName)
  writeFileSync(scriptPath, source)
  return spawnSync("node", [scriptPath], {
    cwd: consumerDir,
    encoding: "utf8",
  })
}

describe.skipIf(!buildSupported)("Published tarball (#642 regression)", () => {
  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), "eyecite-tarball-"))
    esmConsumer = join(workDir, "esm-consumer")
    cjsConsumer = join(workDir, "cjs-consumer")

    // Build is required; `files: ["dist"]` only ships what's already on disk,
    // and a stale dist would mask real bugs.
    execSync("pnpm build", { cwd: projectRoot, stdio: "pipe" })
    execSync(`npm pack --pack-destination ${workDir}`, { cwd: projectRoot, stdio: "pipe" })

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
    expect(proc.status, `stdout: ${proc.stdout}\nstderr: ${proc.stderr}`).toBe(0)
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
    expect(proc.status, `stderr: ${proc.stderr}`).toBe(0)
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
    expect(proc.status, `stdout: ${proc.stdout}\nstderr: ${proc.stderr}`).toBe(0)
    expect(proc.stdout.trim()).toMatch(/^OK \d{4,}$/)
  })
})
