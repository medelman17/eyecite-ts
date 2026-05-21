import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRunArtifacts } from "../../scripts/bughunt/core/artifacts";
import { buildFinding, findingSignature } from "../../scripts/bughunt/core/findings";
import { runCommand } from "../../scripts/bughunt/index";

let tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("bughunt command runner", () => {
  it("runs invariants lane and writes artifacts", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-command-"));
    tempDirs.push(root);

    const exitCode = await runCommand([
      "run",
      "--lane",
      "invariants",
      "--seed",
      "1234",
      "--root",
      root,
      "--run-id",
      "test-run",
    ]);

    expect(exitCode).toBe(0);
    expect(readFileSync(join(root, "latest.json"), "utf8")).toContain("test-run");
    expect(readFileSync(join(root, "runs", "test-run", "manifest.json"), "utf8")).toContain(
      "invariants",
    );
  });

  it("returns non-zero for an unknown command", async () => {
    await expect(runCommand(["wat"])).resolves.toBe(1);
  });
});

describe("bughunt inspect", () => {
  it("prints one finding from latest.json", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-inspect-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "inspect-run",
      seed: 1,
      command: "pnpm bughunt run --lane invariants --seed 1",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });
    const finding = buildFinding({
      runId: "inspect-run",
      lane: "invariants",
      severity: "invariant",
      source: { kind: "inline", key: "inspect-case" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "bad span"),
      message: "bad span",
      contextSnippet: "Smith v. Jones",
    });
    artifacts.writeFinding(finding);
    artifacts.finalize({ finishedAt: "2026-05-20T14:31:00.000Z" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitCode = await runCommand(["inspect", join(root, "latest.json"), "--id", finding.id]);

    expect(exitCode).toBe(0);
    expect(logSpy.mock.calls.join("\n")).toContain(finding.id);
    expect(logSpy.mock.calls.join("\n")).toContain("inspect-case");
    expect(logSpy.mock.calls.join("\n")).toContain(finding.command);
  });
});

describe("bughunt promote", () => {
  it("previews a Vitest regression for one finding", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-promote-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "promote-run",
      seed: 1,
      command: "pnpm bughunt run --lane invariants --seed 1",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });
    const finding = buildFinding({
      runId: "promote-run",
      lane: "invariants",
      severity: "invariant",
      source: { kind: "inline", key: "promote-case" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "bad span"),
      message: "bad span",
      input: "Smith v. Jones, 1 U.S. 1 (1801).",
      contextSnippet: "Smith v. Jones, 1 U.S. 1 (1801).",
    });
    artifacts.writeFinding(finding);
    artifacts.finalize({ finishedAt: "2026-05-20T14:31:00.000Z" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exitCode = await runCommand(["promote", join(root, "latest.json"), "--id", finding.id]);

    expect(exitCode).toBe(0);
    const preview = logSpy.mock.calls.join("\n");
    expect(preview).toContain(`Finding: ${finding.id}`);
    expect(preview).toContain(finding.command);
    expect(preview).toContain(finding.input);
  });

  it("keeps --write disabled in v1", async () => {
    const root = mkdtempSync(join(tmpdir(), "bughunt-promote-write-"));
    tempDirs.push(root);
    const artifacts = createRunArtifacts({
      rootDir: root,
      runId: "promote-write-run",
      seed: 1,
      command: "pnpm bughunt run --lane invariants --seed 1",
      lanes: ["invariants"],
      startedAt: "2026-05-20T14:30:00.000Z",
    });
    const finding = buildFinding({
      runId: "promote-write-run",
      lane: "invariants",
      severity: "invariant",
      source: { kind: "inline", key: "promote-write-case" },
      command: "pnpm bughunt run --lane invariants --seed 1",
      signature: findingSignature("span_bounds", "bad span"),
      message: "bad span",
      input: "Smith v. Jones, 1 U.S. 1 (1801).",
      contextSnippet: "Smith v. Jones, 1 U.S. 1 (1801).",
    });
    artifacts.writeFinding(finding);
    artifacts.finalize({ finishedAt: "2026-05-20T14:31:00.000Z" });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitCode = await runCommand([
      "promote",
      join(root, "latest.json"),
      "--id",
      finding.id,
      "--write",
    ]);

    expect(exitCode).toBe(1);
    expect(errorSpy.mock.calls.join("\n")).toContain("intentionally deferred");
  });
});
