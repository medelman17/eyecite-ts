import type { Citation } from "../../../src/types/citation";
import type { Span } from "../../../src/types/span";

export interface InvariantViolation {
  invariant: string;
  message: string;
  citationIndex: number;
  contextSnippet: string;
}

export function checkCitationInvariants(text: string, citations: Citation[]): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  let previousOriginalEnd = -1;

  citations.forEach((citation, index) => {
    const span = citation.span;
    if (span.cleanEnd <= span.cleanStart) {
      violations.push(
        buildViolation(text, index, span.originalStart, "clean_span", "clean span is empty or negative"),
      );
    }
    if (span.originalEnd <= span.originalStart) {
      violations.push(
        buildViolation(
          text,
          index,
          span.originalStart,
          "original_span",
          "original span is empty or negative",
        ),
      );
    }
    if (span.originalStart < 0 || span.originalEnd > text.length) {
      violations.push(
        buildViolation(
          text,
          index,
          span.originalStart,
          "original_bounds",
          "original span is outside source bounds",
        ),
      );
    }
    if (span.originalStart < previousOriginalEnd) {
      violations.push(
        buildViolation(
          text,
          index,
          span.originalStart,
          "sort_order",
          "citations are not sorted by originalStart",
        ),
      );
    }
    previousOriginalEnd = Math.max(previousOriginalEnd, span.originalEnd);

    const fullSpan = getFullSpan(citation);
    if (fullSpan && (fullSpan.originalStart < 0 || fullSpan.originalEnd > text.length)) {
      violations.push(
        buildViolation(
          text,
          index,
          fullSpan.originalStart,
          "full_span_bounds",
          "fullSpan is outside source bounds",
        ),
      );
    }
    if (
      fullSpan &&
      (fullSpan.originalStart > span.originalStart || fullSpan.originalEnd < span.originalEnd)
    ) {
      violations.push(
        buildViolation(
          text,
          index,
          fullSpan.originalStart,
          "full_span_contains_core",
          "fullSpan does not contain citation core span",
        ),
      );
    }
  });

  return violations;
}

function getFullSpan(citation: Citation): Span | undefined {
  return "fullSpan" in citation ? citation.fullSpan : undefined;
}

function buildViolation(
  text: string,
  citationIndex: number,
  offset: number,
  invariant: string,
  message: string,
): InvariantViolation {
  const start = Math.max(0, offset - 120);
  const end = Math.min(text.length, offset + 180);
  return {
    invariant,
    message,
    citationIndex,
    contextSnippet: text.slice(start, end).replace(/\s+/g, " "),
  };
}
