import {
  isNonMetadataParenContent,
  parseCaseParentheticalChain,
  parseParenthetical,
  type CaseParentheticalChain,
  type MetadataParentheticalNode,
  type ParentheticalNode,
  type RawSpan,
} from "./caseParentheticals"
import { parsePincite, type PinciteInfo } from "./pincite"

/** Matches parenthetical content inside the token text itself. */
const TOKEN_PAREN_REGEX = /\(([^)]+)\)/

/** Extracts pincite (page reference after comma). Accepts optional "at "
 *  keyword, optional "*" prefix for star-pagination (NY Slip Op, Westlaw,
 *  Lexis, and other slip-opinion citations; see #191), and an optional
 *  trailing footnote suffix " n.14" / " nn.14-15" (see #202). */
const TOKEN_PINCITE_REGEX =
  /,\s*(?:at\s+)?(\*?\d+(?:\s*-\s*\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:\s*[-–—]\s*\d+)?)?)/d

/** Look-ahead pattern for parenthetical after token. Skips pincite text
 *  (including star-pagination) before the court/year parenthetical.
 *
 *  Pincite-skip prefix grammar mirrors the leading branch of
 *  LOOKAHEAD_PINCITE_REGEX so the same shapes are accepted:
 *    - `, [at] [pp.|pages] *N[-N]`  (comma form)
 *    - ` at [pp.|pages] *N[-N]`     (at form without comma; #552)
 *
 *  Before #552 only the comma form was accepted, so
 *  `491 S.W.2d 636 at 638 (1973)` lost the trailing `(1973)` paren —
 *  the leading ` at 638` could not be consumed and the regex failed.
 *  The at-form is repeatable too (rare in practice, but the comma form
 *  already was), so the entire prefix is wrapped in `(?:...)*`. */
// Pincite separator admits `;` alongside `,` (#525). OCR'd older
// opinions sometimes use semicolon between page and pincite
// (`256 F.Supp. 572; 573-574 (court year)`); the existing comma-only
// alternation blocked year+court extraction entirely.
// OCR stray-number tolerance (#525): a single bare ` N` may sit between the
// page/pincite and the year paren — a pincite with a missing comma
// (`645 648 (4th Cir. 1942)`) or a space-separated OCR'd range
// (`347 351 (1937)`, from `347-351`). The optional `(?:\s+\d+)?` skips it so
// the `(court year)` paren is reachable. The mandatory trailing `(` is the
// false-positive guard: a stray number followed by a reporter (a new
// citation, `200 F.3d 2`) has no paren and still won't match.
const LOOKAHEAD_PAREN_REGEX =
  /^(?:(?:[,;]\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?|\s+at\s+(?:(?:pp?\.|pages?)\s*)?)\*?\d+(?:-\d+)?)*(?:\s+(?:n|note)\s*\.?\s*\d+)?(?:\s+\d+)?\s*\(([^)]+)\)/d

/** Extracts pincite from look-ahead text.
 *  Accepts five prefix forms:
 *    - ", 125"       (comma-separated, numeric)
 *    - ", at *1"     (comma + "at" keyword; common with star-pagination)
 *    - " at *2"      (whitespace + "at" keyword; NY Slip Op repeat form)
 *    - ", at p. 115" (CSM form with `p.` / `pp.` prefix; #236)
 *    - ", ¶ 12"      (paragraph-marker form; #204)
 *  The "*" prefix marks star-pagination (#191); a trailing " n.14" /
 *  " nn.14-15" footnote suffix is captured when present (#202). Paragraph
 *  forms (`¶ N` / `¶¶ N-M` / `para. N` / `paras. N-M`) are accepted in the
 *  capture; `parsePincite` routes them to the `paragraph` field (#204). */
// Parallel-cite disambiguation: a real pincite is bounded by end-of-string,
// sentence punctuation, a paren or bracket close, or whitespace NOT followed
// by a capital letter (which would start a parallel cite's reporter token,
// e.g., `, 198 A. 154` or `, 93 S. Ct. 705`). The anchored positive lookahead
// prevents regex backtracking into shorter digit prefixes.
//
// Footnote suffix (#311): the suffix-bearing forms `n.3`, `note 3` accept
// either `\s+` (the original `768 n.3` form) or `,\s+` (the California
// `768, fn. 3` form). `fn` / `fns` are added to the alternation alongside
// `n` / `nn` / `note`.
//
// Terminator class (#505): in addition to sentence punctuation and closing
// brackets, accept `:` (block-quote intro), `[` (bracketed parallel cite),
// `»` (OCR artifact), and the four common curly/straight quote characters
// (`"`, `"`, `'`, `'`, `"`). Frequency ~6–10 per 1,000 cites in the wild.
//
// Page-prefix forms (#510): accept spelled-out `page` / `pages` in addition
// to the abbreviated `p.` / `pp.` so full-case citations match the
// short-form extractor's accepted prefixes (#344).
//
// Star-pagination range (#513): page body now allows `*` on BOTH ends of
// the range (`*10-*11`), matching the short-form extractor (#201).
//
// Range separators (#516): tilde (`~`) is accepted as a range separator
// alongside hyphen / en-dash / em-dash. Tilde shows up as an OCR artifact
// in some scanned reporters and PDF dehyphenators.
//
// Footnote-only pincite (#515): a footnote reference without a preceding
// page (`, n. 7` / `, note 7` / `, nn. 3-5` / `, fn. 4`) is accepted as
// the trailing alternation. `parsePincite` surfaces this as
// `pinciteInfo.footnote` with `page=undefined`. The leading `at` prefix is
// allowed for symmetry with the page-bearing forms.
// Leading separator accepts both comma and semicolon (#525). OCR'd
// older opinions sometimes write `256 F.Supp. 572; 573-574 (court year)`
// — the semicolon between page and pincite would otherwise block
// pincite + year-paren extraction entirely.
const LOOKAHEAD_PINCITE_REGEX =
  /^(?:\s+at\s+(?:(?:pp?\.|pages?)\s*)?|[,;]\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?)(\*?\d+(?:\s*[-–—~]\s*\*?\d+)?(?:(?:\s+|,\s+)(?:nn?|fns?|note)\s*\.?\s*\d+(?:\s*[-–—~]\s*\d+)?)?|¶¶?\s*\d+(?:\s*[-–—~]\s*\d+)?|paras?\.?\s*\d+(?:\s*[-–—~]\s*\d+)?|(?:nn?|fns?|note)\s*\.?\s*\d+(?:\s*[-–—~]\s*\d+)?)(?=$|[.,:;)([\]»"'“”‘’†‡§¶©°]|\s(?![A-Z]))/d

/** Additional discrete pincite (`, NNN` continuation) after the primary
 *  pincite has been consumed (#247). Matches a comma + optional whitespace
 *  followed by a pincite body. Used in a loop after `LOOKAHEAD_PINCITE_REGEX`
 *  to collect `115, 153, 200` chains.
 *
 *  Excludes paragraph forms (`¶ 12` mixed with page numbers is exceedingly
 *  rare and would conflict with the citation core's lookahead boundary). */
// Parallel-cite disambiguation: tighten the trailing whitespace branch to
// reject `\s+[A-Z]` (a parallel-cite reporter token). Allow bracket close
// `]` as a terminator so bracketed parallel pincites still capture.
//
// Terminator class mirrors LOOKAHEAD_PINCITE_REGEX (#505): accept `:`, `[`,
// `»`, and curly/straight quotes as additional terminators.
//
// Range separators include tilde (#516).
const ADDITIONAL_PINCITE_REGEX =
  /^,\s*(\*?\d+(?:[-–—~]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—~]\d+)?)?)(?=$|[.,:;)([\]»"'“”‘’†‡§¶©°]|\s(?![A-Z]))/

export interface ParseCaseCitationPostfixInput {
  text?: string
  tokenText: string
  tokenStart: number
  tokenEnd: number
  postChainStart?: number
  hasNominativeReporter?: boolean
}

export interface CaseCitationPostfix {
  unpublished: boolean
  pinciteInfo?: PinciteInfo
  pinciteSpan?: RawSpan
  metadataParenthetical?: MetadataParentheticalNode
  metadataParentheticalFromToken: boolean
  parentheticalChain: CaseParentheticalChain
  parentheticalsAfterPrimaryMetadata: ParentheticalNode[]
  lastParenthetical?: ParentheticalNode
}

function emptyParentheticalChain(): CaseParentheticalChain {
  return {
    nodes: [],
    parentheticals: [],
    metadataParentheticals: [],
    explanatoryParentheticals: [],
    historySignals: [],
  }
}

function hasMetadata(node: MetadataParentheticalNode): boolean {
  return (
    node.court !== undefined ||
    node.year !== undefined ||
    node.date !== undefined ||
    node.disposition !== undefined ||
    node.justices !== undefined ||
    node.scope !== undefined
  )
}

function parseTokenPincite(input: ParseCaseCitationPostfixInput):
  | {
      pinciteInfo: PinciteInfo
      pinciteSpan?: RawSpan
    }
  | undefined {
  const match = TOKEN_PINCITE_REGEX.exec(input.tokenText)
  if (!match) return undefined
  const pinciteInfo = parsePincite(match[1])
  if (!pinciteInfo) return undefined

  return {
    pinciteInfo,
    ...(match.indices?.[1]
      ? {
          pinciteSpan: {
            start: input.tokenStart + match.indices[1][0],
            end: input.tokenStart + match.indices[1][1],
          },
        }
      : {}),
  }
}

function parseTokenMetadataParenthetical(
  input: ParseCaseCitationPostfixInput,
): MetadataParentheticalNode | undefined {
  if (input.hasNominativeReporter) return undefined

  const match = TOKEN_PAREN_REGEX.exec(input.tokenText)
  if (!match || isNonMetadataParenContent(match[1])) return undefined

  const metadata = parseParenthetical(match[1])
  if (!hasMetadata(metadata)) return undefined

  return {
    ...metadata,
    span: {
      start: input.tokenStart + match.index,
      end: input.tokenStart + match.index + match[0].length,
    },
  }
}

function hasUnpublishedMarker(text: string, tokenEnd: number): boolean {
  return /^\s*(?:\(U\)|\[U\])/.test(text.substring(tokenEnd))
}

function skipLeadingPostfixSyntax(text: string, start: number): number {
  let cursor = start
  const unpubMatch = /^\s*(?:\(U\)|\[U\])/.exec(text.substring(cursor))
  if (unpubMatch) {
    cursor += unpubMatch[0].length
  }

  // Georgia-style parenthesized parallel cite (#524): when this cite is the
  // inside of a `( ... )` parallel wrapper, the chars immediately after the
  // page are `) (year)`. Consume one close so the trailing year paren is
  // reachable as the semantic postfix parenthetical.
  const wrapperCloseMatch = /^\s*[)\]]/.exec(text.substring(cursor))
  if (wrapperCloseMatch) {
    cursor += wrapperCloseMatch[0].length
  }

  return cursor
}

function parseLookaheadPincite(
  text: string,
  tokenEnd: number,
):
  | {
      pinciteInfo: PinciteInfo
      pinciteSpan?: RawSpan
    }
  | undefined {
  const afterToken = text.substring(tokenEnd)
  const match = LOOKAHEAD_PINCITE_REGEX.exec(afterToken)
  if (!match) return undefined

  let pinciteInfo = parsePincite(match[1]) ?? undefined
  if (!pinciteInfo) return undefined

  const additionalPincites: PinciteInfo[] = []
  let scanStart = (match.index ?? 0) + match[0].length
  while (scanStart < afterToken.length) {
    const remainder = afterToken.substring(scanStart)
    const addMatch = ADDITIONAL_PINCITE_REGEX.exec(remainder)
    if (!addMatch) break
    const addInfo = parsePincite(addMatch[1])
    if (!addInfo) break
    additionalPincites.push(addInfo)
    scanStart += addMatch[0].length
  }
  if (additionalPincites.length > 0) {
    pinciteInfo = { ...pinciteInfo, additionalPincites }
  }

  return {
    pinciteInfo,
    ...(match.indices?.[1]
      ? {
          pinciteSpan: {
            start: tokenEnd + match.indices[1][0],
            end: tokenEnd + match.indices[1][1],
          },
        }
      : {}),
  }
}

function parseLookaheadMetadataParenthetical(
  text: string,
  start: number,
): MetadataParentheticalNode | undefined {
  const match = LOOKAHEAD_PAREN_REGEX.exec(text.substring(start))
  if (!match || !match.indices?.[1] || isNonMetadataParenContent(match[1])) {
    return undefined
  }

  const metadata = parseParenthetical(match[1])
  if (!hasMetadata(metadata)) return undefined

  const [contentStart, contentEnd] = match.indices[1]
  return {
    ...metadata,
    span: {
      start: start + contentStart - 1,
      end: start + contentEnd + 1,
    },
  }
}

function isSameParenthetical(left: ParentheticalNode, right: MetadataParentheticalNode): boolean {
  return left.span.start === right.span.start && left.span.end === right.span.end
}

export function parseCaseCitationPostfix(
  input: ParseCaseCitationPostfixInput,
): CaseCitationPostfix {
  const tokenPincite = parseTokenPincite(input)
  const tokenMetadata = parseTokenMetadataParenthetical(input)

  const skippedStart = input.text
    ? skipLeadingPostfixSyntax(input.text, input.postChainStart ?? input.tokenEnd)
    : (input.postChainStart ?? input.tokenEnd)
  const parentheticalChain = input.text
    ? parseCaseParentheticalChain(input.text, skippedStart)
    : emptyParentheticalChain()
  const lookaheadMetadata =
    input.text && !tokenMetadata
      ? parseLookaheadMetadataParenthetical(input.text, skippedStart)
      : undefined
  const lookaheadPincite =
    input.text && !tokenPincite ? parseLookaheadPincite(input.text, input.tokenEnd) : undefined

  const metadataParenthetical = tokenMetadata ?? lookaheadMetadata
  const parentheticalsAfterPrimaryMetadata = metadataParenthetical
    ? parentheticalChain.parentheticals.filter(
        (node) => !isSameParenthetical(node, metadataParenthetical),
      )
    : parentheticalChain.parentheticals

  return {
    unpublished: input.text ? hasUnpublishedMarker(input.text, input.tokenEnd) : false,
    ...(tokenPincite ?? lookaheadPincite ?? {}),
    ...(metadataParenthetical ? { metadataParenthetical } : {}),
    metadataParentheticalFromToken: Boolean(tokenMetadata),
    parentheticalChain,
    parentheticalsAfterPrimaryMetadata,
    lastParenthetical: parentheticalChain.lastParenthetical ?? metadataParenthetical,
  }
}
