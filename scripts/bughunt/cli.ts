import { parseArgs } from "node:util";

export function usage(): string {
  return [
    "Usage:",
    "  pnpm bughunt run --lane <lane> [--seed <n>] [--sample <n>]",
    "  pnpm bughunt inspect <run-or-latest> --id <finding-id>",
    "  pnpm bughunt promote <run-or-latest> --id <finding-id> [--write]",
    "",
    "Lanes: all, corpus, invariants, mutate, resolver, annotate, perf",
  ].join("\n");
}

export function parseRunArgs(args: string[]) {
  return parseArgs({
    args,
    allowPositionals: true,
    options: {
      lane: { type: "string", default: "all" },
      seed: { type: "string" },
      sample: { type: "string", default: "50" },
      root: { type: "string", default: ".bughunt" },
      "run-id": { type: "string" },
      "slow-ms": { type: "string", default: "250" },
      "num-runs": { type: "string" },
    },
  });
}

export function commandFromArgs(command: string, args: string[]): string {
  return ["pnpm", "bughunt", command, ...args].join(" ");
}

export function parsePositiveInteger(value: unknown, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer; got ${String(value)}`);
  }
  return parsed;
}
