import { createHash } from "node:crypto";
import type { BughuntFinding, FindingInput } from "./types";

export function findingSignature(kind: string, message: string): string {
  return `${kind}:${message.replace(/\s+/g, " ").trim().slice(0, 160)}`;
}

export function buildFinding(input: FindingInput): BughuntFinding {
  const hashInput = [
    input.lane,
    input.source.kind,
    input.source.key ?? "",
    input.source.seed?.toString() ?? "",
    input.signature,
    normalizeSnippet(input.contextSnippet ?? input.input ?? input.message),
  ].join("\u001f");

  const digest = createHash("sha256").update(hashInput).digest("hex").slice(0, 12);
  return { id: `F-${digest}`, ...input };
}

export function toJsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function normalizeSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}
