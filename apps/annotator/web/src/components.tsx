/* Antecedent Annotator — shared UI components.
   Typed port of the prototype's components.jsx → components.tsx.
   Uses React 18 named imports (module build, not globals). */

import { useEffect, useMemo, useRef } from "react"
import type { ContractCitation, DocumentPayload, Backref, Candidate, Label } from "./types"

// ---- decision vocabulary ---------------------------------------------------

export const DECISION_META: Record<
  string,
  { label: string; cls: string; glyph: string }
> = {
  confirm:   { label: "Confirmed",     cls: "confirm",   glyph: "✓" },
  correct:   { label: "Corrected",     cls: "correct",   glyph: "⤿" },
  abstain:   { label: "No antecedent", cls: "abstain",   glyph: "∅" },
  ambiguous: { label: "Ambiguous",     cls: "ambiguous", glyph: "⊜" },
  flag:      { label: "Flagged",       cls: "flag",      glyph: "⚑" },
}

// Derive a display status from a stored label object.
// Returns "confirm" | "correct" | "abstain" | "ambiguous" | "flag" | "none"
export function labelStatus(label: Label | undefined): string {
  if (!label) return "none"
  if (label.decision.type === "antecedent") return label.agreedWithEngine ? "confirm" : "correct"
  return label.decision.type // abstain | ambiguous | flag
}

// Contract→view: our kinds map 1-1 except prototype had "shortform" vs our "shortFormCase"
export const KIND_LABEL: Record<string, string> = {
  id:            "Id.",
  supra:         "supra",
  shortFormCase: "short form",
  full:          "full cite",
}

// ---- keyboard legend (used in App.tsx) -------------------------------------

export const LEGEND: [string, string][] = [
  ["Enter", "Confirm"],
  ["1–9",   "Pick"],
  ["A",     "Abstain"],
  ["M",     "Ambiguous"],
  ["F",     "Flag"],
  ["← →",   "Prev / next"],
  ["J",     "Next unlabeled"],
  ["E",     "Context"],
  ["⌘Z",    "Undo"],
  ["?",     "Help"],
]

export const ADJ_LEGEND: [string, string][] = [
  ["A",     "Accept reviewer A"],
  ["B",     "Accept reviewer B"],
  ["G",     "Accept engine"],
  ["1–9",   "Pick candidate"],
  ["X",     "Gold = none"],
  ["R",     "Rationale"],
  ["Enter", "Record gold"],
  ["← →",   "Prev / next"],
]

// ---- small atoms -----------------------------------------------------------

interface KeyCapProps {
  children: React.ReactNode
  wide?: boolean
  tone?: string
}

export function KeyCap({ children, wide, tone }: KeyCapProps) {
  return (
    <kbd
      className={
        "keycap" +
        (wide ? " keycap--wide" : "") +
        (tone ? " keycap--" + tone : "")
      }
    >
      {children}
    </kbd>
  )
}

interface StatusDotProps {
  status: string
  size?: string | number
}

// Decision name for aria-label (S4)
const DECISION_ARIA: Record<string, string> = {
  confirm:   "Confirmed",
  correct:   "Corrected",
  abstain:   "No antecedent",
  ambiguous: "Ambiguous",
  flag:      "Flagged",
  none:      "Unlabeled",
}

export function StatusDot({ status, size }: StatusDotProps) {
  const label = DECISION_ARIA[status] ?? status
  return (
    <span
      className={"status-dot status-dot--" + status}
      style={size ? { width: size, height: size } : undefined}
      aria-label={label}
    />
  )
}

interface ConfidenceMeterProps {
  value: number
  pick: boolean
}

export function ConfidenceMeter({ value, pick }: ConfidenceMeterProps) {
  const pct = Math.round(value * 100)
  return (
    <div className="conf" title={"Engine confidence " + pct + "%"}>
      <div className={"conf__track" + (pick ? " conf__track--pick" : "")}>
        <div className="conf__fill" style={{ width: pct + "%" }} />
      </div>
      <span className="conf__num">
        {pct}
        <span className="conf__pct">%</span>
      </span>
    </div>
  )
}

// Tiny "where in the document" indicator: a track with a dot at the citation's
// relative position and a caret at the back-reference's position.
interface PositionBarProps {
  citePos: number
  refPos: number
}

export function PositionBar({ citePos, refPos }: PositionBarProps) {
  return (
    <div className="posbar" title="Position in document">
      <div className="posbar__track" />
      <div className="posbar__cite" style={{ left: citePos * 100 + "%" }} />
      <div className="posbar__ref" style={{ left: refPos * 100 + "%" }} />
    </div>
  )
}

// ---- LegendBar (footer legend) --------------------------------------------

interface LegendBarProps {
  items: [string, string][]
}

export function LegendBar({ items }: LegendBarProps) {
  return (
    <div className="legend">
      {items.map((l) => (
        <span key={l[0]} className="legend__item">
          <KeyCap>{l[0]}</KeyCap> {l[1]}
        </span>
      ))}
    </div>
  )
}

// ---- candidate card --------------------------------------------------------

interface CandidateCardProps {
  cand:         Candidate
  citation:     ContractCitation
  docLen:       number
  indexKey:     number
  isEnginePick: boolean
  isSelected:   boolean
  inAmbigSet:   boolean
  isBuried:     boolean  // derived from buriedSet (passed in; ContractCitation has no isBuriedAside)
  refPos:       number
  onSelect:     (citationId: string) => void
  onHover:      (citationId: string | null) => void
}

export function CandidateCard({
  cand,
  citation,
  docLen,
  indexKey,
  isEnginePick,
  isSelected,
  inAmbigSet,
  isBuried,
  refPos,
  onSelect,
  onHover,
}: CandidateCardProps) {
  const citePos = citation.span ? citation.span[0] / docLen : 0

  // Format parties: { plaintiff?, defendant? } → "Plaintiff v. Defendant"
  const partiesStr = formatParties(citation.parties)

  const cls = [
    "cand",
    isBuried     ? "cand--buried"   : "",
    isSelected   ? "cand--selected" : "",
    inAmbigSet   ? "cand--ambig"    : "",
  ]
    .filter(Boolean)
    .join(" ")

  const ariaPressed = inAmbigSet ? true : isSelected ? true : false

  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(citation.id)}
      onMouseEnter={() => onHover(citation.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(citation.id)}
      onBlur={() => onHover(null)}
      aria-pressed={ariaPressed}
    >
      <div className="cand__key">
        <KeyCap>{indexKey}</KeyCap>
      </div>
      <div className="cand__body">
        <div className="cand__head">
          <span className="cand__cite">{citation.displayText}</span>
          {isEnginePick && (
            <span className="tag tag--engine" title="Engine's best guess">
              ★ guess
            </span>
          )}
          {inAmbigSet && <span className="tag tag--ambig">in set</span>}
        </div>
        <div className="cand__meta">
          <span className="cand__kind">{KIND_LABEL[citation.kind] ?? citation.kind}</span>
          {(citation.year ?? (partiesStr ? undefined : null)) !== undefined && citation.year && (
            <>
              <span className="cand__dot">·</span>
              <span>{citation.year}</span>
            </>
          )}
          {partiesStr && (
            <>
              <span className="cand__dot">·</span>
              <span>{partiesStr}</span>
            </>
          )}
          {isBuried && (
            <span className="tag tag--buried">inside a parenthetical</span>
          )}
          {/* proseIntroduced omitted — not in our contract */}
        </div>
        <PositionBar citePos={citePos} refPos={refPos} />
        <p className="cand__why">{cand.why}</p>
      </div>
      {/* Only render ConfidenceMeter when confidence is a number */}
      {typeof cand.confidence === "number" && (
        <div className="cand__conf">
          <ConfidenceMeter value={cand.confidence} pick={isEnginePick} />
        </div>
      )}
    </button>
  )
}

// ---- document viewer -------------------------------------------------------

export interface DocViewerProps {
  doc:             DocumentPayload
  current:         Backref | null
  activeCitationId: string | null
  candidateIds:    string[]
  ambigSet:        string[] | null
  buriedSet:       Set<string>  // derived set of citationIds that appear as isBuriedAside in any backref
  expanded:        boolean
  labels:          Map<string, Label>  // keyed by composite "${docId}:${backrefId}"
  docId:           string
  onPickCitation:  (citationId: string) => void
  /** Optional adjudicator tint map: citationId → "a" | "b" | "gold" */
  tintMap?:        Record<string, string>
}

export function DocViewer({
  doc,
  current,
  activeCitationId,
  candidateIds,
  ambigSet,
  buriedSet,
  expanded,
  labels,
  docId,
  onPickCitation,
  tintMap,
}: DocViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLSpanElement>(null)

  // build a flat, sorted, disjoint list of marks
  const marks = useMemo(() => {
    const m: Array<{
      start: number
      end:   number
      type:  "cite" | "backref"
      id:    string
      kind:  string
      buried?: boolean
    }> = []
    doc.citations.forEach((c) =>
      c.span &&
        m.push({
          start:  c.span[0],
          end:    c.span[1],
          type:   "cite",
          id:     c.id,
          kind:   c.kind,
          buried: buriedSet.has(c.id),
        })
    )
    doc.backrefs.forEach((b) =>
      b.span &&
        m.push({
          start: b.span[0],
          end:   b.span[1],
          type:  "backref",
          id:    b.id,
          kind:  b.kind,
        })
    )
    m.sort((a, b) => a.start - b.start)
    return m
  }, [doc, buriedSet])

  // paragraph ranges
  const paras = useMemo(() => {
    const out: Array<{ text: string; start: number; end: number }> = []
    let offset = 0
    doc.text.split("\n\n").forEach((p) => {
      out.push({ text: p, start: offset, end: offset + p.length })
      offset += p.length + 2
    })
    return out
  }, [doc])

  const currentSpan = current ? current.span : null
  const currentParaIdx = currentSpan
    ? paras.findIndex((p) => currentSpan[0] >= p.start && currentSpan[0] < p.end)
    : -1

  // re-center the focused back-reference (M2 — respect prefers-reduced-motion)
  useEffect(() => {
    const cont = scrollRef.current
    const el = currentRef.current
    if (!cont || !el) return
    const target = el.offsetTop - cont.clientHeight / 2 + el.offsetHeight / 2
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    cont.scrollTo({ top: Math.max(0, target), behavior: reduced ? "auto" : "smooth" })
  }, [current?.id, expanded])

  const candSet = useMemo(() => new Set(candidateIds), [candidateIds])
  const ambig   = useMemo(() => new Set(ambigSet ?? []), [ambigSet])
  const tint    = tintMap ?? {}

  function renderPara(p: { text: string; start: number; end: number }, pIdx: number) {
    const inPara = marks.filter((m) => m.start >= p.start && m.start < p.end)
    const nodes: React.ReactNode[] = []
    let cursor = p.start
    inPara.forEach((m, i) => {
      if (m.start > cursor)
        nodes.push(<span key={"t" + i}>{doc.text.slice(cursor, m.start)}</span>)
      const txt = doc.text.slice(m.start, m.end)
      if (m.type === "cite") {
        const classes = ["mk-cite"]
        if (m.buried)             classes.push("mk-cite--buried")
        if (candSet.has(m.id))    classes.push("mk-cite--candidate")
        if (ambig.has(m.id))      classes.push("mk-cite--ambig")
        if (tint[m.id])            classes.push("mk-cite--tint-" + tint[m.id])
        if (m.id === activeCitationId) classes.push("mk-cite--active")
        // C2 — render as button so keyboard users can operate it;
        // buried ones get an accessible note (S4)
        const buriedNote = m.buried ? " (inside a parenthetical — usually not a valid antecedent)" : ""
        nodes.push(
          <button
            key={"m" + i}
            type="button"
            className={classes.join(" ")}
            aria-label={"Pick " + txt + " as antecedent" + buriedNote}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onPickCitation(m.id)
            }}
            onFocus={() => onPickCitation(m.id)}
            onBlur={() => { /* keep candidate highlight; user may Tab back */ }}
          >
            {txt}
          </button>
        )
      } else {
        const isCur = current && m.id === current.id
        const compositeKey = `${docId}:${m.id}`
        const st = labelStatus(labels.get(compositeKey))
        const classes = ["mk-ref", "mk-ref--" + st]
        if (isCur) classes.push("mk-ref--current")
        nodes.push(
          <span
            key={"m" + i}
            ref={isCur ? currentRef : null}
            className={classes.join(" ")}
          >
            {txt}
          </span>
        )
      }
      cursor = m.end
    })
    if (cursor < p.end)
      nodes.push(<span key="tail">{doc.text.slice(cursor, p.end)}</span>)

    const dim =
      !expanded && currentParaIdx !== -1 && pIdx !== currentParaIdx
    return (
      <p
        key={pIdx}
        className={
          "doc-para" +
          (dim ? " doc-para--dim" : "") +
          (pIdx === currentParaIdx ? " doc-para--focus" : "")
        }
      >
        {nodes}
      </p>
    )
  }

  return (
    <div className="docview" ref={scrollRef}>
      <div className="docview__inner">{paras.map(renderPara)}</div>
    </div>
  )
}

// ---- doc-map gutter --------------------------------------------------------

interface DocMapProps {
  doc:     DocumentPayload
  current: Backref | null
  labels:  Map<string, Label>  // keyed by composite "${docId}:${backrefId}"
  docId:   string
  onJump:  (backrefId: string) => void
}

export function DocMap({ doc, current, labels, docId, onJump }: DocMapProps) {
  const len = doc.text.length
  return (
    <div className="docmap" title="Document map — back-references">
      <div className="docmap__spine" />
      {doc.citations.map(
        (c) =>
          c.span && (
            <span
              key={c.id}
              className="docmap__cite"
              style={{ top: (c.span[0] / len) * 100 + "%" }}
            />
          )
      )}
      {doc.backrefs.map((b) => {
        const compositeKey = `${docId}:${b.id}`
        const st = labelStatus(labels.get(compositeKey))
        const isCur = current && b.id === current.id
        return (
          <button
            key={b.id}
            className={
              "docmap__ref docmap__ref--" + st + (isCur ? " docmap__ref--current" : "")
            }
            style={{ top: (b.span[0] / len) * 100 + "%" }}
            onClick={() => onJump(b.id)}
            title={
              (KIND_LABEL[b.kind] ?? b.kind) +
              " · " +
              (DECISION_META[st] ? DECISION_META[st].label : "unlabeled")
            }
            aria-label={
              (KIND_LABEL[b.kind] ?? b.kind) +
              " · " +
              (DECISION_META[st] ? DECISION_META[st].label : "unlabeled") +
              (isCur ? " (current)" : "")
            }
          />
        )
      })}
    </div>
  )
}

// ---- helpers ----------------------------------------------------------------

/**
 * Format a ContractCitation's parties field into a display string.
 * { plaintiff?: string, defendant?: string } → "Plaintiff v. Defendant"
 */
export function formatParties(
  parties: ContractCitation["parties"]
): string | null {
  if (!parties) return null
  const { plaintiff, defendant } = parties
  if (plaintiff && defendant) return `${plaintiff} v. ${defendant}`
  if (plaintiff) return plaintiff
  if (defendant) return defendant
  return null
}
