/**
 * Codegen: emit `llms.txt` from the live API surface.
 *
 * `llms.txt` is the LLM-facing API digest for eyecite-ts. It used to be
 * hand-maintained and drifted ~20 minor versions behind the library. This
 * generator removes that failure mode: the volatile, drift-prone facts
 * (version, the `CitationType` union, the `Edge` union, the per-entry export
 * lists, the option-interface fields) are derived from `src/` via the
 * TypeScript compiler API, so they can never silently fall out of sync with
 * the code. The curated prose (overview, pipeline narrative, the
 * replace-not-augment gotcha, the per-subtype field notes) lives as templates
 * in this file — a hybrid that keeps the output as rich as a hand-written
 * digest while auto-refreshing everything that moves.
 *
 * Introspection approach:
 *   - One `ts.Program` over each entry's `index.ts` (`.`, `./annotate`,
 *     `./utils`, `./data`) plus the deep type files. We resolve each module's
 *     export symbols through the checker (so `export *` and re-exports are
 *     followed) and classify every export as function / class / interface /
 *     type / guard / const.
 *   - The `CitationType` union and the `Edge` union are read off their type
 *     aliases (literal members; the Edge discriminant is the `type` property's
 *     literal). NOTHING is hardcoded — the counts (23 citation types, 7 edge
 *     kinds) are asserted against the derived lists so a future addition fails
 *     the build instead of drifting.
 *   - Interface members + their JSDoc are read for the option/result types.
 *   - The default cleaner chain is read from `cleanText`'s default parameter.
 *
 * Output is written to BOTH the canonical root `./llms.txt` and the skill copy
 * `.claude/skills/eyecite-ts-skill/references/llms.txt` from this single
 * source, so the two stay byte-identical. Idempotent: re-running with no source
 * change rewrites identical bytes (and skips the write when already current).
 *
 * Run via `pnpm llms:generate` (also runs in `prebuild`, so a release
 * regenerates it).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const OUTPUTS = [
  resolve(ROOT, "llms.txt"),
  resolve(ROOT, ".claude/skills/eyecite-ts-skill/references/llms.txt"),
]

// ---------------------------------------------------------------------------
// Entry points — mirrors package.json#exports.
// ---------------------------------------------------------------------------

interface EntryDef {
  /** Human label for the table. */
  label: string
  /** Public import path. */
  importPath: string
  /** package.json#exports subpath. */
  subpath: string
  /** Source index file. */
  srcIndex: string
}

const ENTRIES: EntryDef[] = [
  { label: "Core", importPath: "eyecite-ts", subpath: ".", srcIndex: "src/index.ts" },
  {
    label: "Annotate",
    importPath: "eyecite-ts/annotate",
    subpath: "./annotate",
    srcIndex: "src/annotate/index.ts",
  },
  {
    label: "Utils",
    importPath: "eyecite-ts/utils",
    subpath: "./utils",
    srcIndex: "src/utils/index.ts",
  },
  { label: "Data", importPath: "eyecite-ts/data", subpath: "./data", srcIndex: "src/data/index.ts" },
]

// ---------------------------------------------------------------------------
// TypeScript program / checker.
// ---------------------------------------------------------------------------

function loadCompilerOptions(): ts.CompilerOptions {
  const configPath = resolve(ROOT, "tsconfig.json")
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  if (read.error) {
    throw new Error(`Failed to read tsconfig.json: ${ts.flattenDiagnosticMessageText(read.error.messageText, "\n")}`)
  }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, ROOT)
  // We only introspect — never emit — so silence emit-shaped options.
  return { ...parsed.options, noEmit: true, declaration: false, declarationMap: false }
}

const rootFiles = ENTRIES.map((e) => resolve(ROOT, e.srcIndex))
const program = ts.createProgram(rootFiles, loadCompilerOptions())
const checker = program.getTypeChecker()

// ---------------------------------------------------------------------------
// Symbol classification + JSDoc helpers.
// ---------------------------------------------------------------------------

type ExportKind = "function" | "class" | "guard" | "interface" | "type" | "const" | "namespace"

interface ExportInfo {
  name: string
  kind: ExportKind
  /** First-sentence JSDoc summary, when present. */
  summary?: string
}

/** Follow aliases (`export { x } from`, `export *`) to the real symbol. */
function resolveAlias(symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

// Legal/technical abbreviations whose trailing period must NOT be treated as a
// sentence boundary. Mirrors the spirit of the library's own legal-aware
// sentence splitter so JSDoc summaries don't truncate mid-abbreviation
// (`para.`, `U.S.`, `Fed. Reg.`, …).
const ABBREVIATIONS = new Set([
  "e.g",
  "i.e",
  "etc",
  "cf",
  "vs",
  "v",
  "para",
  "paras",
  "no",
  "nn",
  "fn",
  "fns",
  "ed",
  "pp",
  "p",
  "u.s",
  "u.s.c",
  "c.f.r",
  "art",
  "amend",
  "ch",
  "sec",
  "rev",
  "approx",
  "ca",
  "ny",
])

const MAX_SUMMARY = 180

/**
 * First sentence of a flattened JSDoc string, single-lined and length-capped.
 * Treats `.`, `?`, `:`, `;` as terminators ONLY when followed by whitespace and
 * a capital letter (or end), and not when the preceding token is a known
 * abbreviation — so `para. N`, `U.S.`, `default: 0.8` don't truncate. Falls
 * back to the first line, then a hard length cap.
 */
function firstSentence(raw: string): string | undefined {
  const flat = raw.replace(/\s+/g, " ").trim()
  if (!flat) return undefined
  let depth = 0 // bracket/paren depth
  let inQuote = false
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i]
    if (ch === '"' || ch === "'" || ch === "`") inQuote = !inQuote
    else if (ch === "[" || ch === "(" || ch === "{") depth++
    else if (ch === "]" || ch === ")" || ch === "}") depth = Math.max(0, depth - 1)
    if (ch !== "." && ch !== "?" && ch !== "!") continue
    // Don't terminate inside a bracketed example or an open quote (`["550 U.S.
    // 544", ...]`), where a `.` is part of the data, not a sentence end.
    if (depth > 0 || inQuote) continue
    const after = flat.slice(i + 1)
    // Must be end, or whitespace then an uppercase letter / opening marker.
    if (after === "" || /^\s+(?:[A-Z`(]|$)/.test(after)) {
      // Don't break on a known abbreviation immediately before the period.
      const before = flat.slice(0, i)
      const lastWord = (before.match(/([A-Za-z.]+)$/)?.[1] ?? "").toLowerCase()
      if (ABBREVIATIONS.has(lastWord) || ABBREVIATIONS.has(lastWord.replace(/\.$/, ""))) continue
      const sentence = flat.slice(0, i + 1).trim()
      if (sentence.length >= 12) return cap(sentence)
    }
  }
  return cap(flat)
}

/** Hard length cap with an ellipsis, on a word boundary. */
function cap(s: string): string {
  if (s.length <= MAX_SUMMARY) return s
  const cut = s.slice(0, MAX_SUMMARY)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]+$/, "")}…`
}

/** First sentence of a symbol's JSDoc, trimmed and single-lined. */
function summaryOf(symbol: ts.Symbol): string | undefined {
  const parts = symbol.getDocumentationComment(checker)
  const full = ts.displayPartsToString(parts).trim()
  return firstSentence(full)
}

/** Classify a resolved symbol into a coarse export kind. */
function classify(symbol: ts.Symbol, name: string): ExportKind {
  const f = symbol.flags
  if (f & ts.SymbolFlags.Function) {
    // Type guards: a function whose declared return is a type predicate, or an
    // assertion signature (assertUnreachable). Detect via the call signature.
    const declNode = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (!declNode) return "function"
    const type = checker.getTypeOfSymbolAtLocation(symbol, declNode)
    for (const sig of type.getCallSignatures()) {
      const decl = sig.getDeclaration()
      if (decl?.type && (ts.isTypePredicateNode(decl.type) || decl.type.kind === ts.SyntaxKind.TypePredicate)) {
        return "guard"
      }
      // assertUnreachable(x: never): never — treat the documented exhaustiveness
      // helper as a guard for grouping purposes.
      if (name === "assertUnreachable") return "guard"
    }
    return "function"
  }
  if (f & ts.SymbolFlags.Class) return "class"
  if (f & ts.SymbolFlags.Interface) return "interface"
  if (f & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.TypeParameter)) return "type"
  if (f & ts.SymbolFlags.Module) return "namespace"
  if (f & (ts.SymbolFlags.Variable | ts.SymbolFlags.BlockScopedVariable | ts.SymbolFlags.FunctionScopedVariable))
    return "const"
  // A type-only re-export that the checker models as a pure type symbol.
  if (f & ts.SymbolFlags.Type) return "type"
  return "const"
}

/** Resolve and classify every export of an entry's module. */
function entryExports(srcIndexAbs: string): ExportInfo[] {
  const sourceFile = program.getSourceFile(srcIndexAbs)
  if (!sourceFile) throw new Error(`Source file not in program: ${srcIndexAbs}`)
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) throw new Error(`No module symbol for ${srcIndexAbs}`)
  const exports = checker.getExportsOfModule(moduleSymbol)
  const out: ExportInfo[] = []
  for (const exp of exports) {
    const name = exp.getName()
    if (name === "default" || name === "__export") continue
    const target = resolveAlias(exp)
    out.push({ name, kind: classify(target, name), summary: summaryOf(target) })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

// ---------------------------------------------------------------------------
// Type-alias union extraction (CitationType, Edge, ResolvedCitation, etc.).
// ---------------------------------------------------------------------------

/** Find an exported/declared type-alias declaration by name across the program. */
function findTypeAlias(name: string): ts.TypeAliasDeclaration | undefined {
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !sf.fileName.includes("/src/")) continue
    let found: ts.TypeAliasDeclaration | undefined
    sf.forEachChild((node) => {
      if (found) return
      if (ts.isTypeAliasDeclaration(node) && node.name.text === name) found = node
    })
    if (found) return found
  }
  return undefined
}

/** Find an exported/declared interface declaration by name across the program. */
function findInterface(name: string): ts.InterfaceDeclaration | undefined {
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !sf.fileName.includes("/src/")) continue
    let found: ts.InterfaceDeclaration | undefined
    sf.forEachChild((node) => {
      if (found) return
      if (ts.isInterfaceDeclaration(node) && node.name.text === name) found = node
    })
    if (found) return found
  }
  return undefined
}

/** Extract the string-literal members of a `type X = "a" | "b" | ...` alias. */
function stringLiteralUnion(aliasName: string): string[] {
  const decl = findTypeAlias(aliasName)
  if (!decl) throw new Error(`Type alias not found: ${aliasName}`)
  const out: string[] = []
  const collect = (node: ts.TypeNode): void => {
    if (ts.isUnionTypeNode(node)) {
      for (const m of node.types) collect(m)
    } else if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
      out.push(node.literal.text)
    }
  }
  collect(decl.type)
  if (out.length === 0) {
    throw new Error(`No string-literal members found on ${aliasName}`)
  }
  return out
}

interface EdgeKind {
  /** The discriminant `type` literal, e.g. "resolves-to". */
  type: string
  /** Property names besides `type`, in declaration order, with `?` markers. */
  fields: string[]
}

/**
 * Extract the discriminated-union members of `type Edge = {...} | {...} | ...`.
 * Each member is an object type literal with a `type: "literal"` discriminant.
 */
function extractEdgeUnion(): EdgeKind[] {
  const decl = findTypeAlias("Edge")
  if (!decl) throw new Error("Edge type alias not found")
  if (!ts.isUnionTypeNode(decl.type)) throw new Error("Edge is not a union")
  const kinds: EdgeKind[] = []
  for (const member of decl.type.types) {
    if (!ts.isTypeLiteralNode(member)) continue
    let typeLiteral: string | undefined
    const fields: string[] = []
    for (const m of member.members) {
      if (!ts.isPropertySignature(m) || !m.name || !ts.isIdentifier(m.name)) continue
      const propName = m.name.text
      if (propName === "type" && m.type && ts.isLiteralTypeNode(m.type) && ts.isStringLiteral(m.type.literal)) {
        typeLiteral = m.type.literal.text
        continue
      }
      fields.push(propName + (m.questionToken ? "?" : ""))
    }
    if (typeLiteral) kinds.push({ type: typeLiteral, fields })
  }
  if (kinds.length === 0) throw new Error("No Edge union members extracted")
  return kinds
}

// ---------------------------------------------------------------------------
// Interface field extraction (with JSDoc) — for citation subtypes & options.
// ---------------------------------------------------------------------------

interface FieldInfo {
  name: string
  optional: boolean
  /** Printed type text (source form). */
  typeText: string
  /** First-sentence JSDoc, single-lined. */
  doc?: string
}

/** First sentence of a node's leading JSDoc, single-lined. */
function jsDocSummary(node: ts.Node): string | undefined {
  const jsDocNodes = ts.getJSDocCommentsAndTags(node)
  for (const jd of jsDocNodes) {
    if (ts.isJSDoc(jd)) {
      const text = typeof jd.comment === "string" ? jd.comment : ts.getTextOfJSDocComment(jd.comment)
      if (text) return firstSentence(text)
    }
  }
  return undefined
}

/**
 * Printed type text for a property, with nested JSDoc comments stripped and
 * whitespace collapsed. Inline object-literal types (e.g. `AnnotationOptions
 * .template`) otherwise carry their members' `/** ... *​/` doc blocks, which is
 * noise in a one-line type rendering.
 */
function cleanTypeText(typeNode: ts.TypeNode | undefined): string {
  if (!typeNode) return "unknown"
  return typeNode
    .getText()
    .replace(/\/\*\*[\s\S]*?\*\//g, "") // strip block/JSDoc comments
    .replace(/\/\/[^\n]*/g, "") // strip line comments
    .replace(/\s+/g, " ")
    // After stripping inline JSDoc between object-literal members, two member
    // decls can abut (`string after`); restore a `;` separator.
    .replace(/([A-Za-z0-9_>\])])\s+([A-Za-z_$][A-Za-z0-9_$]*\s*\??\s*:)/g, "$1; $2")
    .trim()
}

/** Read the (own) property signatures of an interface, in declaration order. */
function interfaceFields(name: string): FieldInfo[] {
  const decl = findInterface(name)
  if (!decl) throw new Error(`Interface not found: ${name}`)
  const out: FieldInfo[] = []
  for (const m of decl.members) {
    if (!ts.isPropertySignature(m) || !m.name) continue
    const propName = m.name.getText()
    out.push({
      name: propName,
      optional: !!m.questionToken,
      typeText: cleanTypeText(m.type),
      doc: jsDocSummary(m),
    })
  }
  return out
}

/** Comma-joined field-name list (with `?`) for the compact subtype lines. */
function fieldNames(name: string): string[] {
  return interfaceFields(name).map((f) => f.name + (f.optional ? "?" : ""))
}

/** Read the default cleaner chain from `cleanText`'s default parameter. */
function defaultCleanerChain(): string[] {
  const sf = program.getSourceFile(resolve(ROOT, "src/clean/cleanText.ts"))
  if (!sf) throw new Error("cleanText.ts not in program")
  let chain: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "cleanText" &&
      node.parameters.length >= 2
    ) {
      const init = node.parameters[1].initializer
      if (init && ts.isArrayLiteralExpression(init)) {
        chain = init.elements.filter(ts.isIdentifier).map((id) => id.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  if (chain.length === 0) throw new Error("Could not read default cleaner chain")
  return chain
}

// ---------------------------------------------------------------------------
// Derive everything.
// ---------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  version: string
  engines?: { node?: string }
  license?: string
  repository?: { url?: string }
}

const version = pkg.version
const nodeEngine = pkg.engines?.node ?? ">=18.0.0"
const license = pkg.license ?? "MIT"
const repoUrl = (pkg.repository?.url ?? "https://github.com/medelman17/eyecite-ts.git").replace(
  /^git\+|\.git$/g,
  "",
)

// `CitationType` is the single source of truth for the full list (it is the
// discriminant used across the `Citation` union). The short-form set comes from
// `ShortFormCitationType`; the "full" set is derived as the complement so the
// count stays accurate even though the separate `FullCitationType` alias in the
// source happens to omit `regulation` (a known source inconsistency we don't
// want to propagate into the count). `citationTypes` preserves union order.
const citationTypes = stringLiteralUnion("CitationType")
const shortFormTypes = stringLiteralUnion("ShortFormCitationType")
const shortFormSet = new Set(shortFormTypes)
const fullCitationTypes = citationTypes.filter((t) => !shortFormSet.has(t))
const edgeKinds = extractEdgeUnion()
const cleanerChain = defaultCleanerChain()

const exportsByEntry = new Map<string, ExportInfo[]>()
for (const e of ENTRIES) {
  exportsByEntry.set(e.subpath, entryExports(resolve(ROOT, e.srcIndex)))
}

/** Exports for a known entry subpath (throws if the entry is unknown). */
function getExports(subpath: string): ExportInfo[] {
  const exps = exportsByEntry.get(subpath)
  if (!exps) throw new Error(`No exports recorded for entry ${subpath}`)
  return exps
}

// Drift guards — fail loudly rather than emit a wrong digest. These encode the
// known-good shape; a deliberate change updates the assertion alongside the code.
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`[generate-llms] drift assertion failed: ${msg}`)
}
assert(
  citationTypes.length === 23,
  `expected 23 citation types (20 full + 3 short-form), derived ${citationTypes.length}: ${citationTypes.join(", ")}`,
)
assert(
  fullCitationTypes.length === 20,
  `expected 20 full citation types (CitationType minus short-form), derived ${fullCitationTypes.length}: ${fullCitationTypes.join(", ")}`,
)
assert(
  shortFormTypes.length === 3,
  `expected 3 short-form citation types, derived ${shortFormTypes.length}: ${shortFormTypes.join(", ")}`,
)
// Non-fatal: the source's `FullCitationType` alias is known to omit `regulation`.
// Surface drift between it and the canonical complement so a future fix (or a
// new omission) is noticed — but do not let the buggy alias drive the count.
{
  const aliasFull = new Set(stringLiteralUnion("FullCitationType"))
  const missingFromAlias = fullCitationTypes.filter((t) => !aliasFull.has(t))
  if (missingFromAlias.length) {
    console.warn(
      `[generate-llms] note: FullCitationType alias omits ${missingFromAlias.join(", ")} (using CitationType\\ShortFormCitationType as the source of truth).`,
    )
  }
}
assert(
  edgeKinds.length === 7,
  `expected 7 CitationGraph edge kinds, derived ${edgeKinds.length}: ${edgeKinds.map((k) => k.type).join(", ")}`,
)
for (const e of ENTRIES) {
  assert((exportsByEntry.get(e.subpath)?.length ?? 0) > 0, `entry ${e.subpath} resolved 0 exports`)
}

// The individual granular extractors are the per-type `extract*` functions
// re-exported from the root entry (derived, not hardcoded) — excluding the two
// top-level extraction entry points (`extractCitations`/`extractCitationsAsync`),
// which are the convenience API, not single-type extractors.
const coreExports = getExports(".")
const MAIN_EXTRACTION_FNS = new Set(["extractCitations", "extractCitationsAsync"])
const granularExtractors = coreExports
  .filter(
    (x) => x.kind === "function" && /^extract[A-Z]/.test(x.name) && !MAIN_EXTRACTION_FNS.has(x.name),
  )
  .map((x) => x.name)
assert(
  granularExtractors.length === 12,
  `expected 12 granular per-type extractors on the root entry, derived ${granularExtractors.length}: ${granularExtractors.join(", ")}`,
)

// ---------------------------------------------------------------------------
// Rendering helpers.
// ---------------------------------------------------------------------------

const NL = "\n"

/** Group an entry's exports by kind for a compact, scannable export listing. */
function renderExportGroups(subpath: string): string {
  const exps = getExports(subpath)
  const order: Array<[ExportKind, string]> = [
    ["function", "Functions"],
    ["class", "Classes"],
    ["guard", "Type guards"],
    ["const", "Values"],
    ["interface", "Interfaces"],
    ["type", "Types"],
    ["namespace", "Namespaces"],
  ]
  const lines: string[] = []
  for (const [kind, label] of order) {
    const names = exps.filter((e) => e.kind === kind).map((e) => e.name)
    if (names.length) lines.push(`- **${label}** (${names.length}): \`${names.join("`, `")}\``)
  }
  return lines.join(NL)
}

/** Render the per-subtype "notable fields" line, JSDoc-annotated where useful. */
function subtypeLine(typeLiteral: string, interfaceName: string, note: string): string {
  const fields = fieldNames(interfaceName)
  return `- \`${typeLiteral}\` — \`${interfaceName}\`: ${note} Fields: ${fields.join(", ")}.`
}

/** Render an options/result interface as a fenced field list with JSDoc. */
function renderInterfaceBlock(name: string): string {
  const fields = interfaceFields(name)
  const lines = fields.map((f) => {
    const doc = f.doc ? `  // ${f.doc}` : ""
    return `  ${f.name}${f.optional ? "?" : ""}: ${f.typeText}${doc}`
  })
  return `interface ${name} {${NL}${lines.join(NL)}${NL}}`
}

// ---------------------------------------------------------------------------
// Curated prose + auto-generated sections (the hybrid template).
// ---------------------------------------------------------------------------

function citationTypeFieldNotes(): string {
  // Curated one-line notes per subtype (the prose that JSDoc can't express
  // concisely); the field list itself is derived. Order follows the union.
  const notes: Record<string, [string, string]> = {
    case: ["FullCaseCitation", "the workhorse — volume/reporter/page plus case name, parties, court, year, parentheticals, parallel cites, subsequent history, dates, inferred court, and component spans."],
    docket: ["DocketCitation", "docket-number-only case cite (no reporter). Only emitted when a preceding case-name anchor is present."],
    statute: ["StatuteCitation", "U.S.C. and state codes. NOTE: `pincite` here is a string (subsection chain), NOT a page number."],
    regulation: ["RegulationCitation", "C.F.R. and state regulatory codes; same shape as StatuteCitation, separate discriminator so consumers filter statutes vs regs without string-matching `code`."],
    stateRule: ["StateRuleCitation", "state rules of procedure (ID, NC, SC, plus `CFC` Court of Federal Claims)."],
    journal: ["JournalCitation", "law-review / periodical cites; `pincite` is a number."],
    neutral: ["NeutralCitation", "vendor-neutral cites. Vendor DBs (`WL`/`LEXIS`/`BL`) live in `database`, NOT in `court`."],
    publicLaw: ["PublicLawCitation", "federal public laws (`Pub. L. No. 116-283`)."],
    federalRegister: ["FederalRegisterCitation", "`85 Fed. Reg. 12345`."],
    statutesAtLarge: ["StatutesAtLargeCitation", "federal session-law compilation (`100 Stat. 3743`)."],
    sessionLaw: ["SessionLawCitation", "state session laws (CA `Stats.`, NV `Nev. Stat.`)."],
    treaty: ["TreatyCitation", "treaty-series cites (`T.I.A.S. No. 1502`, `1155 U.N.T.S. 331`); named-treaty fields reserved."],
    legislativeMaterial: ["LegislativeMaterialCitation", "committee reports + Congressional Record, unified via the `kind` discriminator."],
    localOrdinance: ["LocalOrdinanceCitation", "municipal codes (`CCCO § 2.12.010(1)`)."],
    canon: ["CanonCitation", "judicial-conduct canons (`Canon 7(B)(1)`)."],
    constitutional: ["ConstitutionalCitation", "U.S. + all 50 states; Roman numerals parsed to integers; `currentLocation` for `former … (now …)` reform cites."],
    federalRule: ["FederalRuleCitation", "federal rules of procedure (civil/criminal/evidence/appellate/bankruptcy)."],
    restatement: ["RestatementCitation", "ALI Restatements (`Restatement (Second) of Torts § 402A`)."],
    treatise: ["TreatiseCitation", "multi-volume treatises (Wright & Miller, Nimmer, etc.)."],
    annotation: ["AnnotationCitation", "A.L.R. series — secondary authority that looks like a case cite."],
    id: ["IdCitation", "`Id.` / `Id. at N`; `pincite` is a number; carries pincite-inheritance + (when resolved) inherited case-name fields."],
    supra: ["SupraCitation", "`Party, supra`; resolves by party-name match."],
    shortFormCase: ["ShortFormCaseCitation", "`500 F.2d at 125`; resolves by volume/reporter match; may carry an inferred case name."],
  }
  const lines: string[] = []
  for (const t of citationTypes) {
    const entry = notes[t]
    if (!entry) {
      // A new type was added to the union without a curated note — surface it
      // with derived fields rather than dropping it.
      const iface = guessInterfaceName(t)
      lines.push(`- \`${t}\` — \`${iface}\`: (no curated note — fields derived). Fields: ${fieldNames(iface).join(", ")}.`)
      continue
    }
    lines.push(subtypeLine(t, entry[0], entry[1]))
  }
  return lines.join(NL)
}

/** Best-effort interface name from a discriminator (for newly-added types). */
function guessInterfaceName(typeLiteral: string): string {
  // Try the known suffix conventions; fall back to PascalCase + "Citation".
  const candidates = [
    typeLiteral === "case" ? "FullCaseCitation" : "",
    typeLiteral === "shortFormCase" ? "ShortFormCaseCitation" : "",
    `${typeLiteral.charAt(0).toUpperCase()}${typeLiteral.slice(1)}Citation`,
  ].filter(Boolean)
  for (const c of candidates) {
    if (findInterface(c)) return c
  }
  return candidates[candidates.length - 1]
}

function renderEdgeList(): string {
  // Curated one-line gloss per edge kind; the kind list + field shape are
  // derived (so a new edge kind shows up even without a gloss).
  const gloss: Record<string, string> = {
    "resolves-to": "short-form → resolved antecedent (from `resolution.resolvedTo`)",
    antecedent: "short-form → its antecedent (from `resolution.antecedentIndex`)",
    parallel: "same case across reporters (one edge per pair in a group)",
    "history-of": "subsequent-history link (from `subsequentHistoryOf`)",
    "pincite-inherit": "pincite inherited from `to` (from `pinciteInheritedFrom`)",
    "string-cite": "adjacent members of a semicolon string-cite group",
    "in-parenthetical-of": "`from` is cited inside `to`'s explanatory parenthetical (e.g. `(quoting X)`); balance-tolerant",
  }
  return edgeKinds
    .map((k, i) => {
      const shape = `{ ${["type", ...k.fields].join(", ")} }`
      const g = gloss[k.type] ?? "(no curated gloss — derived)"
      return `${i + 1}. \`${k.type}\` — \`${shape}\` — ${g}`
    })
    .join(NL)
}

// ---------------------------------------------------------------------------
// Assemble the document.
// ---------------------------------------------------------------------------

function build(): string {
  const out: string[] = []
  const p = (s = "") => out.push(s)

  p(`# eyecite-ts`)
  p()
  p(
    `> TypeScript legal citation extraction library with zero runtime dependencies. Extract, resolve, annotate, and analyze legal citations from court opinions and legal documents.`,
  )
  p()
  p(
    `Port of Python [eyecite](https://github.com/freelawproject/eyecite) by Free Law Project. This TypeScript implementation adds ${citationTypes.length} citation types, parallel citation linking, party-name extraction, full-span tracking, structured date parsing, a document-understanding layer (quote attribution + a typed citation graph), and short-form resolution with confidence/abstention controls.`,
  )
  p()
  p(`- Version: ${version}`)
  p(`- License: ${license}`)
  p(`- Node.js: ${nodeEngine}`)
  p(`- Runtime dependencies: 0`)
  p(`- Module format: ESM + CJS, with \`.d.mts\` / \`.d.cts\` type declarations`)
  p(`- Repository: ${repoUrl}`)
  p()
  p(`<!--`)
  p(`  AUTOGENERATED by scripts/generate-llms.ts — DO NOT EDIT BY HAND.`)
  p(`  Regenerate via \`pnpm llms:generate\` (also runs in \`prebuild\`).`)
  p(`  Volatile facts (version, the CitationType union, the Edge union, per-entry`)
  p(`  export lists, option fields) are derived from src/ via the TypeScript`)
  p(`  compiler API. Curated prose lives in the generator. Written to both`)
  p(`  ./llms.txt and .claude/skills/eyecite-ts-skill/references/llms.txt.`)
  p(`-->`)
  p()

  p(`## Installation`)
  p()
  p("```bash")
  p(`npm install eyecite-ts`)
  p("```")
  p()

  p(`## Quick Start`)
  p()
  p("```typescript")
  p(`import { extractCitations } from "eyecite-ts"`)
  p()
  p(`const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020). Id. at 130."`)
  p(`const citations = extractCitations(text)`)
  p(
    `// [{ type: "case", volume: 500, reporter: "F.2d", page: 123, court: "9th Cir.", year: 2020, ... },`,
  )
  p(`//  { type: "id", pincite: 130, ... }]`)
  p("```")
  p()

  p(`## Architecture — the pipeline`)
  p()
  p(
    `Citations flow through four core stages, plus an optional fifth document-understanding layer:`,
  )
  p()
  p(
    `1. **Clean** (\`src/clean/\`): strip HTML, decode entities, rejoin hyphenated line-wraps, strip PDF page-break markers, normalize whitespace/Unicode/dashes/typography, fix smart quotes, normalize reporter spacing. Builds a \`TransformationMap\` tracking position shifts between original and cleaned text.`,
  )
  p(
    `2. **Tokenize** (\`src/tokenize/\`): apply regex patterns to find citation candidates. Intentionally broad; the next stage validates.`,
  )
  p(
    `3. **Extract** (\`src/extract/\`): parse metadata from tokens (volume, reporter, page, court, year, case name, pincite, parentheticals, dates, disposition). Each citation type has its own extractor. Confidence scores assigned here.`,
  )
  p(
    `4. **Resolve** (opt-in, \`src/resolve/\`): link short-form citations (Id./supra/short-form case) to full antecedents. Uses scope boundaries, BK-tree Levenshtein fuzzy party-name matching, and pincite inheritance.`,
  )
  p(
    `5. **Analyze** (opt-in, \`src/document/\`): \`analyzeDocument()\` projects an already-extracted citation array into a \`Document\` view — prose spans, quote attributions, and a typed citation graph. Pure projection; no re-tokenization.`,
  )
  p()
  p(
    `Position tracking uses dual coordinates: \`cleanStart\`/\`cleanEnd\` (internal parsing space) and \`originalStart\`/\`originalEnd\` (user-facing, in the raw input), connected by the \`TransformationMap\`. Use the \`original*\` fields for highlighting in the user's text.`,
  )
  p()

  p(`## Package entry points`)
  p()
  p(`Four entry points. Import only what you need.`)
  p()
  p(`| Entry point | Import path | Contents |`)
  p(`|---|---|---|`)
  p(
    `| Core | \`eyecite-ts\` | Extraction, resolution, document analysis, footnote detection, types, type guards, the \`cleanText\` orchestrator, granular extractors |`,
  )
  p(`| Annotate | \`eyecite-ts/annotate\` | HTML annotation (template + callback modes) |`)
  p(
    `| Utils | \`eyecite-ts/utils\` | Post-extraction utilities: reporter keys, Bluebook formatting, case grouping, surrounding-context extraction |`,
  )
  p(
    `| Data | \`eyecite-ts/data\` | Reporter database (1200+ reporters) + jurisdiction/state-code registries, lazy-loaded |`,
  )
  p()
  p(
    `There is **no \`eyecite-ts/clean\` entry point** and the individual cleaner functions (\`stripHtmlTags\`, \`normalizeUnicode\`, …) are **not exported** from any public entry — see "Cleaners" below.`,
  )
  p()
  p(`### Exports per entry (auto-generated)`)
  for (const e of ENTRIES) {
    p()
    p(`**\`${e.importPath}\`**`)
    p()
    p(renderExportGroups(e.subpath))
  }
  p()

  p(`## Citation types`)
  p()
  p(
    `A discriminated union on the \`type\` field — **${citationTypes.length} types total: ${fullCitationTypes.length} full + ${shortFormTypes.length} short-form**. Switch on \`citation.type\` (or use the type guards) for type-safe field access; TypeScript narrows automatically.`,
  )
  p()
  p(`### Full citation types (${fullCitationTypes.length} discriminators)`)
  p()
  p(fullCitationTypes.map((t) => `\`${t}\``).join(", "))
  p()
  p(`### Short-form citation types (${shortFormTypes.length} discriminators)`)
  p()
  p(`${shortFormTypes.map((t) => `\`${t}\``).join(", ")} — appear only in text that references earlier citations.`)
  p()
  p(`### Notable fields per subtype`)
  p()
  p(`Field lists below are derived from \`src/types/citation.ts\`; the prose note per subtype is curated.`)
  p()
  p(citationTypeFieldNotes())
  p()
  p(`### Common fields (\`CitationBase\`, on every citation)`)
  p()
  p(`${fieldNames("CitationBase").join(", ")}.`)
  p()
  p(
    `\`inFootnote\`/\`footnoteNumber\` are only populated when \`detectFootnotes: true\`. On every citation that carries a volume, \`volume\` is \`number | string\` — string for hyphenated volumes like \`"1984-1"\`. Don't assume a number.`,
  )
  p()
  p(`### \`pinciteInfo\` — structured pincite`)
  p()
  p(
    `\`pincite: number\` on a citation is a convenience mirror of the primary page only. The full structure lives on \`pinciteInfo?: PinciteInfo\` (case, neutral, id, supra, shortFormCase):`,
  )
  p()
  p("```typescript")
  p(renderInterfaceBlock("PinciteInfo"))
  p("```")
  p()
  p(`\`parsePincite(raw: string): PinciteInfo | null\` is exported for parsing pincite strings directly.`)
  p()

  p(`## Core API (\`eyecite-ts\`)`)
  p()
  p(`### Extraction`)
  p()
  p("```typescript")
  p(`import { extractCitations, extractCitationsAsync } from "eyecite-ts"`)
  p()
  p(`const citations = extractCitations(text, options?)               // Citation[]`)
  p(`const resolved  = extractCitations(text, { resolve: true })      // ResolvedCitation[] (overload)`)
  p(`const citations = await extractCitationsAsync(text, options?)    // Promise<Citation[]>`)
  p("```")
  p()
  p(
    `\`extractCitations\` is synchronous. \`extractCitationsAsync\` currently wraps the sync path (it does NOT auto-load the reporter DB — call \`await loadReporters()\` explicitly for DB-backed validation). Both have a \`{ resolve: true }\` overload that narrows the return to \`ResolvedCitation[]\`.`,
  )
  p()
  p(`### \`ExtractOptions\``)
  p()
  p("```typescript")
  p(renderInterfaceBlock("ExtractOptions"))
  p("```")
  p()
  p(
    `> The JSDoc on \`ExtractOptions.cleaners\` describes a shorter default chain; the **actual** runtime default is the ${cleanerChain.length}-cleaner chain documented under "Cleaners" below (it comes from \`cleanText\`'s default parameter, which \`extractCitations\` falls through to).`,
  )
  p()
  p(`### False-positive filtering`)
  p()
  p("```typescript")
  p(`import { applyFalsePositiveFilters } from "eyecite-ts"`)
  p()
  p(`// remove=false → penalize confidence (0.1) + add a warning; remove=true → drop flagged cites.`)
  p(`// Pass originalText whenever possible — it is required for the line-crossing FP check; omitting it`)
  p(`// silently skips that check (and warns once per process if case cites are present).`)
  p(`const filtered = applyFalsePositiveFilters(citations, /* remove */ true, originalText)`)
  p("```")
  p()
  p(
    `Detection uses a static blocklist of non-US reporter abbreviations plus a year-plausibility heuristic (pre-1750). The \`filterFalsePositives: true\` extract option runs this in remove mode.`,
  )
  p()
  p(`### Resolution`)
  p()
  p("```typescript")
  p(`import { resolveCitations, DocumentResolver } from "eyecite-ts"`)
  p()
  p(`const resolved = resolveCitations(citations, text, options?)   // ResolvedCitation[]`)
  p(`// or, equivalently, the class:`)
  p(`const resolved = new DocumentResolver(citations, text, options?).resolve()`)
  p(`// or inline via extractCitations(text, { resolve: true })`)
  p("```")
  p()
  p(`\`ResolutionOptions\`:`)
  p()
  p("```typescript")
  p(renderInterfaceBlock("ResolutionOptions"))
  p("```")
  p()
  p(`\`ResolutionResult\` (on \`resolvedCitation.resolution\`):`)
  p()
  p("```typescript")
  p(renderInterfaceBlock("ResolutionResult"))
  p("```")
  p()
  p(
    `\`resolvedTo\` (and \`antecedentIndex\`) are **indices, not citation objects** — look up via \`citations[c.resolution.resolvedTo]\`. \`ResolvedCitation<C>\` is a distributive conditional type: \`resolution\` is meaningfully present only on short-form citations; on full citations it is typed \`undefined\`.`,
  )
  p()
  p(
    `Resolver behavior worth knowing (${version.split(".").slice(0, 2).join(".")}.x): \`Id.\` and \`supra\` skip parenthetical-internal asides (\`(quoting X)\` / \`(citing Y)\`) as antecedents; the aside signal is trigger-anchored and bracket-balance-tolerant, so a dropped/garbled paren (OCR/PDF) no longer mis-scopes a whole document. On a bracket-balance failure the paren-child exclusion degrades to *soft* (candidate kept, confidence capped, warning emitted) so \`idConfidenceFloor\` can abstain. \`supra\` abstains on a true non-unique party-name key (same name + year) and degrades-with-warning otherwise. Pincites inherit from the immediately-preceding same-authority citation per Bluebook 4.1 (\`pinciteInherited\`/\`pinciteInheritedFrom\`).`,
  )
  p()

  p(`### Document understanding — \`analyzeDocument\``)
  p()
  p(
    `A pure projection over an already-extracted citation array (no re-tokenization; sub-millisecond for typical briefs). This is how you get **quote attribution** and the **relationships between citations**.`,
  )
  p()
  p("```typescript")
  p(`import { extractCitations, analyzeDocument } from "eyecite-ts"`)
  p(`import type { Document, QuoteAttribution, CitationGraph, Edge } from "eyecite-ts"`)
  p()
  p(`const citations = extractCitations(text)`)
  p(`const doc: Document = analyzeDocument(text, citations, { transformationMap? })`)
  p("```")
  p()
  p("```typescript")
  p(renderInterfaceBlock("Document"))
  p("```")
  p()
  p(`#### Quote attribution`)
  p()
  p("```typescript")
  p(`type AttributionKind = ${stringLiteralUnion("AttributionKind").map((s) => `"${s}"`).join(" | ")}`)
  p()
  p(renderInterfaceBlock("QuoteAttribution"))
  p("```")
  p()
  p(`#### Citation graph — ${edgeKinds.length} edge types`)
  p()
  p("```typescript")
  p(renderInterfaceBlock("CitationGraph"))
  p("```")
  p()
  p(
    `\`from\`/\`to\` are indices into \`Document.citations\`. \`Edge\` is a discriminated union of **${edgeKinds.length} kinds**:`,
  )
  p()
  p(renderEdgeList())
  p()
  p(
    `\`AnalyzedFootnoteZone\`: \`{ ${fieldNames("AnalyzedFootnoteZone").join(", ")} }\`.`,
  )
  p()

  p(`### Footnote detection`)
  p()
  p("```typescript")
  p(`import { detectFootnotes } from "eyecite-ts"`)
  p(`import type { FootnoteMap, FootnoteZone } from "eyecite-ts"`)
  p()
  p(`const map: FootnoteMap = detectFootnotes(text)   // auto-detects HTML or plain-text footnotes`)
  p(`// or integrate: extractCitations(text, { detectFootnotes: true }) → cites tagged inFootnote/footnoteNumber`)
  p("```")
  p()

  p(`### Type guards`)
  p()
  p("```typescript")
  const guardNames = coreExports.filter((e) => e.kind === "guard").map((e) => e.name)
  p(`import { ${guardNames.join(", ")} } from "eyecite-ts"`)
  p()
  p(`isFullCitation(citation)              // narrows to FullCitation`)
  p(`isShortFormCitation(citation)         // narrows to ShortFormCitation (id|supra|shortFormCase)`)
  p(`isCaseCitation(citation)              // narrows to FullCaseCitation`)
  p(`isCitationType(citation, "statute")   // generic guard, narrows to CitationOfType<"statute">`)
  p(`assertUnreachable(x)                  // exhaustiveness check for switch defaults`)
  p("```")
  p()

  p(`### Granular / power-user API`)
  p()
  p("```typescript")
  p(`import {`)
  p(`  cleanText, tokenize, parsePincite, normalizeCourt, spanFromGroupIndex,`)
  p(`  ${granularExtractors.join(", ")},`)
  p(`} from "eyecite-ts"`)
  p()
  p(`const { cleaned, transformationMap, warnings } = cleanText(text, cleaners?)  // CleanTextResult`)
  p(`const tokens = tokenize(cleaned, patterns?)                                   // Token[]`)
  p("```")
  p()
  p(
    `Exactly **${granularExtractors.length} individual extractors** are exported (the list above). Note: \`extractStatute\` returns \`StatuteCitation | RegulationCitation\`. Types like \`docket\`, \`stateRule\`, \`sessionLaw\`, \`treaty\`, \`legislativeMaterial\`, \`localOrdinance\`, and \`canon\` are produced internally by \`extractCitations\` but have **no standalone extractor** in the public surface.`,
  )
  p()

  p(`## Cleaners`)
  p()
  p(`The cleaning layer is composable, but its public surface is intentionally narrow.`)
  p()
  p(
    `- **Exported:** \`cleanText(original, cleaners?)\` — the orchestrator — and the \`CleanTextResult\` type (\`{ ${fieldNames("CleanTextResult").join(", ")} }\`). That's all.`,
  )
  p(
    `- **NOT exported:** the individual cleaner functions (\`stripHtmlTags\`, \`decodeHtmlEntities\`, \`rejoinHyphenatedWords\`, \`stripPageBreakMarkers\`, \`replaceWhitespace\`, \`collapseSpaces\`, \`normalizeUnicode\`, \`normalizeDashes\`, \`fixSmartQuotes\`, \`normalizeTypography\`, \`normalizeReporterSpacing\`, plus the opt-in \`removeOcrArtifacts\`, \`stripDiacritics\`, and legacy \`normalizeWhitespace\`). They live in \`src/clean/cleaners.ts\`; no public package entry re-exports them and there is no \`eyecite-ts/clean\` entry. To supply a custom \`cleaners\` array, write the functions yourself (each is just \`(text: string) => string\`).`,
  )
  p()
  p(
    `**Default cleaner chain** (applied by \`cleanText\`, and therefore by \`extractCitations\` when no \`cleaners\` option is given), in order — derived from \`cleanText\`'s default parameter:`,
  )
  p()
  p("```")
  p(cleanerChain.join(" → "))
  p("```")
  p()
  p(
    `**Gotcha — \`cleaners\` REPLACES, it does not augment.** Passing \`options.cleaners\` (or a \`cleaners\` argument to \`cleanText\`) substitutes the entire default chain. If you pass \`{ cleaners: [myCleaner] }\`, HTML stripping, Unicode/dash normalization, smart-quote fixing, etc. **no longer run**. To keep the defaults plus your own, you must reconstruct the full chain (and, since the built-ins aren't exported, reimplement the ones you need).`,
  )
  p()

  p(`## Annotation (\`eyecite-ts/annotate\`)`)
  p()
  p("```typescript")
  p(`import { annotate } from "eyecite-ts/annotate"`)
  p(`import type { AnnotationOptions, AnnotationResult } from "eyecite-ts/annotate"`)
  p()
  p(`// Template mode`)
  p(`const r1 = annotate(text, citations, { template: { before: '<cite>', after: '</cite>' } })`)
  p()
  p(`// Callback mode (full control)`)
  p(`const r2 = annotate(text, citations, {`)
  p(`  callback: (citation, surrounding) => \`<a href="...">\${citation.matchedText}</a>\`,`)
  p(`})`)
  p("```")
  p()
  p(`\`AnnotationOptions\`:`)
  p()
  p("```typescript")
  p(renderInterfaceBlock("AnnotationOptions"))
  p("```")
  p()
  p(`\`AnnotationResult\`:`)
  p()
  p("```typescript")
  p(renderInterfaceBlock("AnnotationResult"))
  p("```")
  p()

  p(`## Utils (\`eyecite-ts/utils\`)`)
  p()
  p("```typescript")
  const utilFns = getExports("./utils")
    .filter((e) => e.kind === "function")
    .map((e) => e.name)
  const utilTypes = getExports("./utils")
    .filter((e) => e.kind === "interface" || e.kind === "type")
    .map((e) => e.name)
  p(`import { ${utilFns.join(", ")} } from "eyecite-ts/utils"`)
  p(`import type { ${utilTypes.join(", ")} } from "eyecite-ts/utils"`)
  p()
  p(`toReporterKey(caseCitation)    // "550 U.S. 544" (FullCaseCitation → string; omits page for blank-page cites)`)
  p(`toReporterKeys(caseCitation)   // ["410 U.S. 113", "93 S. Ct. 705"] (primary + parallel keys)`)
  p(`toBluebook(citation)           // canonical Bluebook string; works across all citation types`)
  p(`groupByCase(resolvedCitations) // CaseGroup[]; takes ResolvedCitation[]; ignores non-case + unresolved short-forms`)
  p(`getSurroundingContext(text, { start, end }, { type: "sentence" | "paragraph", maxLength?: 500 })`)
  p("```")
  p()
  p(
    `\`getSurroundingContext\` is legal-text-aware: periods in \`U.S.\`, \`Corp.\`, \`F.3d\`, \`v.\`, \`No.\`, etc. are not treated as sentence boundaries.`,
  )
  p()
  p("```typescript")
  p(renderInterfaceBlock("CaseGroup"))
  p("```")
  p()

  p(`## Data (\`eyecite-ts/data\`)`)
  p()
  p(
    `The reporter DB is a separate, lazy-loaded entry. Core extraction works without it (pattern-based). Loading it adds reporter validation.`,
  )
  p()
  p("```typescript")
  const dataFns = getExports("./data")
    .filter((e) => e.kind === "function")
    .map((e) => e.name)
  const dataConsts = getExports("./data")
    .filter((e) => e.kind === "const")
    .map((e) => e.name)
  const dataTypes = getExports("./data")
    .filter((e) => e.kind === "interface" || e.kind === "type")
    .map((e) => e.name)
  p(`import { ${[...dataFns, ...dataConsts].join(", ")} } from "eyecite-ts/data"`)
  p(`import type { ${dataTypes.join(", ")} } from "eyecite-ts/data"`)
  p()
  p(`const db = await loadReporters()                  // Promise<ReportersDatabase>; cached after first load`)
  p(`const cached = getReportersSync()                 // ReportersDatabase | null (null in degraded mode)`)
  p(`const reporters = await findReportersByAbbreviation("F.2d")  // ReporterEntry[] ([] if none)`)
  p(`findNamedCode("CA", "Civ. Proc.")                 // CodeEntry | undefined (longest-match wins)`)
  p(`findAbbreviatedCode("MCL")                         // CodeEntry | undefined`)
  p("```")
  p()
  p(
    `\`ReportersDatabase\`: \`{ ${fieldNames("ReportersDatabase").join(", ")} }\` (1200+ reporters; case-insensitive lookup keys).`,
  )
  p()

  p(`## Supported jurisdictions (statutes / regs / rules)`)
  p()
  p(`- Federal: U.S.C., C.F.R., prose ("section X of title Y")`)
  p(`- Named-code states: NY, CA, TX, MD, VA, AL, MA`)
  p(`- Abbreviated-code states: FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE, and more (see \`stateStatuteEntries\`)`)
  p(`- Chapter-act: IL (ILCS); Massachusetts chapter+section (\`G.L. c. 93A\`)`)
  p(`- Constitutional: U.S. + all 50 states; Roman numerals parsed to integers; \`former … (now …)\` reform cites`)
  p(`- State rules of procedure: ID, NC, SC, plus the Court of Federal Claims (\`CFC\`)`)
  p()

  p(`## Development (in the eyecite-ts repo)`)
  p()
  p("```bash")
  p(`pnpm install            # corepack + pnpm 10`)
  p(`pnpm exec vitest run    # run tests once (pnpm test = watch)`)
  p(`pnpm build              # tsdown (ESM + CJS + DTS); prebuild regenerates reporters data + this file`)
  p(`pnpm typecheck          # tsc --noEmit`)
  p(`pnpm lint               # Biome`)
  p(`pnpm size               # size-limit`)
  p(`pnpm llms:generate      # regenerate llms.txt from the API surface (this file)`)
  p("```")
  p()

  // Single trailing newline (POSIX).
  return out.join(NL).replace(/\n*$/, "") + NL
}

// ---------------------------------------------------------------------------
// Emit to both paths, idempotently.
// ---------------------------------------------------------------------------

const content = build()
let wrote = 0
for (const outPath of OUTPUTS) {
  // The skill-mirror target only exists on a machine with the skill installed;
  // in CI and fresh clones its parent dir is absent. Skip it (best-effort mirror)
  // rather than ENOENT-crashing the build — the canonical root llms.txt, whose
  // dir always exists, is still written.
  if (!existsSync(dirname(outPath))) {
    console.log(`skipped (target dir absent): ${outPath}`)
    continue
  }
  let existing = ""
  try {
    existing = readFileSync(outPath, "utf8")
  } catch {
    // first write
  }
  if (existing === content) {
    console.log(`up to date: ${outPath}`)
  } else {
    writeFileSync(outPath, content)
    console.log(`wrote ${outPath} (${(content.length / 1024).toFixed(1)} KB)`)
    wrote++
  }
}
console.log(
  `llms.txt: v${version}, ${citationTypes.length} citation types (${fullCitationTypes.length} full + ${shortFormTypes.length} short-form), ${edgeKinds.length} graph edges, ${granularExtractors.length} granular extractors. ${wrote === 0 ? "no changes" : `${wrote} file(s) updated`}.`,
)
