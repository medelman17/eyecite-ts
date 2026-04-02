/**
 * Post-extraction utilities for working with citation results.
 *
 * This module provides composable utility functions for downstream
 * consumption of extraction output: sentence context detection,
 * case grouping, reporter key formatting, and Bluebook formatting.
 *
 * Imported via: `import { ... } from 'eyecite-ts/utils'`
 *
 * @module utils
 */

export type { CaseGroup, ContextOptions, SurroundingContext } from "./types"
export { toReporterKey, toReporterKeys } from "./reporterKey"
export { toBluebook } from "./bluebook"
