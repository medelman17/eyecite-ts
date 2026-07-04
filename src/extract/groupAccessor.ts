/**
 * Typed access to a Token's threaded named groups (#844). Extractors read
 * groups through these helpers instead of touching the raw record, so a
 * missing required group declines via CitationParseError (the #881 path) in
 * one audited place. Per-extractor `GroupName` unions narrow the `name` arg
 * to compile-time-checked literals at the call site.
 *
 * @module extract/groupAccessor
 */

import type { Token } from "@/tokenize"
import { CitationParseError } from "./errors"

/** Returns the named group's value, or declines (the tokenizer admitted a token the extractor can't parse). */
export function requireGroup<N extends string>(token: Token, name: N): string {
  const value = token.groups?.[name]
  if (value === undefined) {
    throw new CitationParseError(`Missing required capture group "${name}" in token: ${token.text}`)
  }
  return value
}

/** Returns the named group's value, or undefined if it did not participate. */
export function optionalGroup<N extends string>(token: Token, name: N): string | undefined {
  return token.groups?.[name]
}

/** Returns the named group's token-relative [start, end] span, or undefined. */
export function groupSpan<N extends string>(token: Token, name: N): [number, number] | undefined {
  return token.groupSpans?.[name]
}
