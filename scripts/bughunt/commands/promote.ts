import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";
import type { BughuntFinding } from "../core/types";

export async function promoteFinding(args: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        id: { type: "string" },
        write: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const target = parsed.positionals[0] ?? ".bughunt/latest.json";
  const id = parsed.values.id;
  if (!id) {
    console.error("promote requires --id <finding-id>");
    return 1;
  }

  const runDir = resolveRunDir(target);
  const finding = readJsonLines<BughuntFinding>(join(runDir, "findings.jsonl")).find(
    (entry) => entry.id === id,
  );
  if (!finding) {
    console.error(`finding not found: ${id}`);
    return 1;
  }

  if (parsed.values.write) {
    console.error("promote --write is intentionally deferred; preview the test and place it manually");
    return 1;
  }

  console.log(formatVitestPreview(finding));
  return 0;
}

function resolveRunDir(target: string): string {
  if (target.endsWith("latest.json")) {
    const latest = JSON.parse(readFileSync(target, "utf8")) as { runDir: string };
    if (isAbsolute(latest.runDir)) return latest.runDir;
    if (latest.runDir.startsWith(".bughunt/")) {
      return join(dirname(target), latest.runDir.replace(/^\.bughunt\//, ""));
    }
    return latest.runDir;
  }
  return target;
}

function readJsonLines<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function formatVitestPreview(finding: BughuntFinding): string {
  const sourceText = finding.minimalInput ?? finding.input ?? finding.contextSnippet ?? "";
  const sourceContext = finding.contextSnippet ?? finding.source.key ?? finding.source.kind;
  const testName = `preserves bughunt finding ${finding.id}`;

  return [
    'import { describe, expect, it } from "vitest";',
    'import { extractCitations } from "../../src/index";',
    "",
    'describe("bughunt promoted regression", () => {',
    `  it(${JSON.stringify(testName)}, () => {`,
    `    // Finding: ${finding.id}`,
    `    // Original command: ${finding.command}`,
    `    // Source: ${finding.source.kind}${finding.source.key ? ` ${finding.source.key}` : ""}`,
    `    // Source context: ${sourceContext.replace(/\s+/g, " ").slice(0, 220)}`,
    finding.source.seed !== undefined ? `    // Seed: ${finding.source.seed}` : "",
    finding.source.path ? `    // Counterexample path: ${finding.source.path}` : "",
    finding.source.replayPath ? `    // Replay path: ${finding.source.replayPath}` : "",
    `    const text = ${JSON.stringify(sourceText)};`,
    "    const citations = extractCitations(text, { resolve: true });",
    "    expect(citations.length).toBeGreaterThan(0);",
    "  });",
    "});",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
