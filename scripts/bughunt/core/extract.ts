import { performance } from "node:perf_hooks";
import { extractCitations } from "../../../src/index";
import type { Citation } from "../../../src/types/citation";

export interface ExtractionOptions {
  resolve?: boolean;
  detectFootnotes?: boolean;
}

export type ExtractionResult =
  | { ok: true; citations: Citation[]; durationMs: number }
  | { ok: false; error: Error; durationMs: number };

export function runExtraction(text: string, options: ExtractionOptions = {}): ExtractionResult {
  const start = performance.now();
  try {
    const citations = extractCitations(text, options);
    return { ok: true, citations, durationMs: performance.now() - start };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      durationMs: performance.now() - start,
    };
  }
}
