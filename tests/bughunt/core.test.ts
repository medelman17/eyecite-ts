import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRunArtifacts } from "../../scripts/bughunt/core/artifacts";
import { inlineCases } from "../../scripts/bughunt/core/corpus";
import { runExtraction } from "../../scripts/bughunt/core/extract";
import { buildFinding, findingSignature } from "../../scripts/bughunt/core/findings";
import { checkCitationInvariants } from "../../scripts/bughunt/core/invariants";
import { createRng } from "../../scripts/bughunt/core/rng";
import { runInvariantLane } from "../../scripts/bughunt/lanes/invariants";
import { runMutationLane } from "../../scripts/bughunt/lanes/mutate";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("bughunt extraction and invariants", () => {
  it("runs extraction and records duration", () => {
    const result = runExtraction("Smith v. Jones, 1 U.S. 1 (1801).", { resolve: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("reports no invariant failures for a normal citation", () => {
    const text = "Smith v. Jones, 1 U.S. 1 (1801).";
    const result = runExtraction(text, { resolve: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const violations = checkCitationInvariants(text, result.citations);
    expect(violations).toEqual([]);
  });
});

describe("bughunt corpus and invariant lane", () => {
  it("provides a deterministic inline smoke corpus", () => {
    expect(inlineCases().map((bughuntCase) => bughuntCase.key)).toEqual([
      "inline/full-case",
      "inline/id-chain",
      "inline/statute",
    ]);
  });

  it("runs invariant lane over inline cases", () => {
    const findings = runInvariantLane({
      runId: "run-1",
      command: "pnpm bughunt run --lane invariants --seed 1",
      cases: inlineCases(),
    });

    expect(findings).toEqual([]);
  });
});

describe("bughunt mutation lane", () => {
  it("runs deterministic generated mutation checks", () => {
    const findings = runMutationLane({
      runId: "mutate-run",
      command: "pnpm bughunt run --lane mutate --seed 1234",
      seed: 1234,
      numRuns: 10,
    });

    expect(Array.isArray(findings)).toBe(true);
  });
});

describe("bughunt core helpers", () => {
  it("creates deterministic random sequences from a seed", () => {
    const a = createRng(1234);
    const b = createRng(1234);

    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it("builds stable finding IDs from lane, source, signature, and snippet", () => {
    const input = {
      runId: "run-1",
      lane: "invariants",
      severity: "invariant" as const,
      source: { kind: "inline" as const, key: "example" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "originalEnd outside source"),
      message: "originalEnd outside source",
      contextSnippet: "Smith v. Jones, 1 U.S. 1 (1801)",
    };

    expect(buildFinding(input).id).toBe(buildFinding(input).id);
  });

  it("writes manifest, JSONL files, summary, and latest pointer", () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-artifacts-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "2026-05-20T143000Z-seed-1234",
      seed: 1234,
      command: "pnpm bughunt run --lane invariants --seed 1234",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });

    artifacts.writeFinding(
      buildFinding({
        runId: artifacts.manifest.runId,
        lane: "invariants",
        severity: "invariant",
        source: { kind: "inline", key: "case-1" },
        command: artifacts.manifest.command,
        signature: findingSignature("span_bounds", "bad span"),
        message: "bad span",
        contextSnippet: "bad span input",
      }),
    );
    artifacts.finalize({ finishedAt: "2026-05-20T14:30:01.000Z" });

    const latest = JSON.parse(readFileSync(join(root, "latest.json"), "utf8")) as {
      runDir: string;
    };
    expect(latest.runDir).toContain("2026-05-20T143000Z-seed-1234");
    expect(readFileSync(join(artifacts.runDir, "findings.jsonl"), "utf8")).toContain(
      "bad span",
    );
    expect(readFileSync(join(artifacts.runDir, "summary.md"), "utf8")).toContain(
      "invariants",
    );
  });
});
