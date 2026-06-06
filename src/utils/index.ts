/**
 * Post-extraction utilities for working with citation results.
 *
 * This module provides composable utility functions for downstream
 * consumption of extraction output: sentence context detection,
 * case grouping, reporter key formatting, Bluebook formatting, and
 * durable W3C-style citation locators.
 *
 * Imported via: `import { ... } from 'eyecite-ts/utils'`
 *
 * @module utils
 */

export type {
  CaseGroup,
  ContextOptions,
  DurableLocator,
  DurableLocatorOptions,
  SurroundingContext,
} from "./types"
export { toReporterKey, toReporterKeys } from "./reporterKey"
export { toBluebook } from "./bluebook"
export { groupByCase } from "./groupByCase"
export { getSurroundingContext } from "./context"
export { toDurableLocator, toDurableLocators } from "./durableLocator"
