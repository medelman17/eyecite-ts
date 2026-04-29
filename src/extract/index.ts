/**
 * Citation Extraction Layer
 *
 * Converts tokens into typed Citation objects with parsed metadata.
 * This is the third stage of the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata, validate) ← THIS MODULE
 *
 * Extraction functions parse token text to extract structured metadata
 * (volume, reporter, page, section, etc.) and translate positions from
 * cleaned text back to original text using TransformationMap.
 *
 * @module extract
 */

export * from "./extractCase"
export * from "./extractCitations"
export * from "./extractConstitutional"
export * from "./extractDocket"
export * from "./extractFederalRegister"
export * from "./extractJournal"
export * from "./extractNeutral"
export * from "./extractPublicLaw"
export * from "./extractShortForms"
export * from "./extractStatute"
export * from "./extractStatutesAtLarge"
export * from "./validation"
