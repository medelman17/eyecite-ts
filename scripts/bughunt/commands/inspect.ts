import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";
import type { BughuntFinding } from "../core/types";

export async function inspectFinding(args: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        id: { type: "string" },
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const target = parsed.positionals[0] ?? ".bughunt/latest.json";
  const id = parsed.values.id;
  if (!id) {
    console.error("inspect requires --id <finding-id>");
    return 1;
  }

  const runDir = resolveRunDir(target);
  const findingsPath = join(runDir, "findings.jsonl");
  if (!existsSync(findingsPath)) {
    console.error(`findings file not found: ${findingsPath}`);
    return 1;
  }

  const finding = readJsonLines<BughuntFinding>(findingsPath).find((entry) => entry.id === id);
  if (!finding) {
    console.error(`finding not found: ${id}`);
    return 1;
  }

  console.log(formatFinding(finding));
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

function formatFinding(finding: BughuntFinding): string {
  return [
    `Finding ${finding.id}`,
    `Lane: ${finding.lane}`,
    `Severity: ${finding.severity}`,
    `Source: ${finding.source.kind}${finding.source.key ? ` ${finding.source.key}` : ""}`,
    `Signature: ${finding.signature}`,
    `Message: ${finding.message}`,
    finding.contextSnippet ? `Context: ${finding.contextSnippet}` : "",
    finding.input ? `Input: ${finding.input}` : "",
    finding.minimalInput ? `Minimal input: ${finding.minimalInput}` : "",
    finding.source.seed !== undefined ? `Seed: ${finding.source.seed}` : "",
    finding.source.path ? `Counterexample path: ${finding.source.path}` : "",
    finding.source.replayPath ? `Replay path: ${finding.source.replayPath}` : "",
    `Command: ${finding.command}`,
  ]
    .filter(Boolean)
    .join("\n");
}
