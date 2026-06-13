/* Antecedent Annotator — Adjudicator surface.
   Resolves the disagreement / flag queue: two reviewers' choices side-by-side
   plus the engine guess, over full document context, and records the gold answer.
   Typed port of adjudicator.jsx → adjudicator.tsx. No window.AA_DATA. */

import { useState, useEffect, useRef } from "react"
import type {
  AdjudicationItem,
  DocumentPayload,
  Annotator,
  ContractCitation,
  GoldDecision,
  ReviewerLabelRef,
} from "./types"

// Local draft type — same shape as GoldDecision but without the at/by fields
// which are only needed at POST time.
type GoldDraft =
  | { type: "antecedent"; citationId: string }
  | { type: "abstain" }
  | { type: "ambiguous"; citationIds: string[] }
  | { type: "none" }
import { api } from "./api"
import { KIND_LABEL, KeyCap, StatusDot, ConfidenceMeter, DocViewer, DocMap } from "./components"
import { useAnnounce } from "./announcer"

// ---- constants ---------------------------------------------------------------

const CURRENT_BATCH = "batch-042"
const ADJ_LS_KEY = "aa_adjudicator_state_v1"

// ---- helpers -----------------------------------------------------------------

type CiteLookup = Map<string, ContractCitation>

interface DecisionDisplay {
  text: string
  cites: string[]
}

function describeDecision(label: ReviewerLabelRef["decision"] | null, lookup: CiteLookup): DecisionDisplay {
  if (!label) return { text: "—", cites: [] }
  if (label.type === "antecedent") {
    const cit = lookup.get(label.citationId)
    return { text: cit ? cit.displayText : label.citationId, cites: [label.citationId] }
  }
  if (label.type === "abstain") return { text: "No valid antecedent", cites: [] }
  if (label.type === "ambiguous") {
    const ids = label.citationIds ?? []
    return {
      text: ids.map((id) => {
        const c = lookup.get(id)
        if (!c) return id
        const p = c.parties
        if (p?.plaintiff && p?.defendant) return `${p.plaintiff} v. ${p.defendant}`
        if (p?.plaintiff) return p.plaintiff
        if (p?.defendant) return p.defendant
        return c.displayText
      }).join("  ·  "),
      cites: ids,
    }
  }
  if (label.type === "flag") return { text: "Flagged", cites: [] }
  return { text: "—", cites: [] }
}

function sameDecision(
  a: GoldDraft | GoldDecision | ReviewerLabelRef["decision"] | null,
  b: ReviewerLabelRef["decision"] | null,
): boolean {
  if (!a || !b || a.type !== b.type) return false
  if (a.type === "antecedent" && b.type === "antecedent") return a.citationId === b.citationId
  if (a.type === "ambiguous" && b.type === "ambiguous") {
    const aCids = ("citationIds" in a ? (a.citationIds ?? []) : []).slice().sort()
    const bCids = (b.citationIds ?? []).slice().sort()
    return JSON.stringify(aCids) === JSON.stringify(bCids)
  }
  return true
}

function describeGold(draft: GoldDraft | null, lookup: CiteLookup): string {
  if (!draft) return ""
  if (draft.type === "antecedent") {
    const cit = lookup.get(draft.citationId)
    return cit ? cit.displayText : draft.citationId
  }
  if (draft.type === "abstain") return "No valid antecedent"
  if (draft.type === "ambiguous") {
    return draft.citationIds.map((id) => {
      const c = lookup.get(id)
      return c ? c.displayText : id
    }).join("  ·  ")
  }
  if (draft.type === "none") return "None (abstain)"
  return "—"
}

// ---- loading states ----------------------------------------------------------

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; queue: AdjudicationItem[]; docs: Map<string, DocumentPayload>; annotators: Map<string, string> }

// ---- main component ----------------------------------------------------------

export function AdjudicatorWorkbench() {
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" })

  // localStorage restore for index only
  const initIdx = (() => {
    try {
      const raw = localStorage.getItem(ADJ_LS_KEY)
      if (raw) return (JSON.parse(raw) as { idx?: number }).idx ?? 0
    } catch (_) { /* ignore */ }
    return 0
  })()

  const [currentIndex, setCurrentIndex] = useState(initIdx)
  const [activeCite, setActiveCite] = useState<string | null>(null)
  const [draft, setDraft] = useState<GoldDraft | null>(null)
  const [rationale, setRationale] = useState("")
  const [toast, setToast] = useState<{ msg: string; tone: string; id: number } | null>(null)
  const ratRef = useRef<HTMLTextAreaElement>(null)
  const announce = useAnnounce()

  // ---- load ------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    setLoadState({ phase: "loading" })

    async function load() {
      try {
        const [queue, annotators] = await Promise.all([
          api.getAdjudication(CURRENT_BATCH),
          api.listAnnotators(),
        ])
        if (cancelled) return

        const annotatorMap = new Map<string, string>(
          annotators.map((a: Annotator) => [a.id, a.name])
        )

        // Fetch documents for each unique documentId in the queue
        const docIds = [...new Set(queue.map((q) => q.documentId))]
        const docPayloads = await Promise.all(
          docIds.map((id) => api.getDocument(id).catch((): DocumentPayload | null => null))
        )
        if (cancelled) return

        const docsMap = new Map<string, DocumentPayload>()
        docPayloads.forEach((d) => { if (d) docsMap.set(d.id, d) })

        setLoadState({ phase: "ready", queue, docs: docsMap, annotators: annotatorMap })
        // Clamp index in case queue shrank
        setCurrentIndex((i) => Math.min(i, Math.max(0, queue.length - 1)))
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setLoadState({ phase: "error", message })
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ---- toast auto-dismiss ----------------------------------------------------

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1700)
    return () => clearTimeout(t)
  }, [toast])

  // ---- persist index to localStorage -----------------------------------------

  useEffect(() => {
    try { localStorage.setItem(ADJ_LS_KEY, JSON.stringify({ idx: currentIndex })) } catch (_) { /* ignore */ }
  }, [currentIndex])

  // ---- keyboard handler ------------------------------------------------------
  // Placed above early returns to satisfy Rules of Hooks.
  // Re-registered each render (no dep array) so closures stay fresh.
  // Body guards on loadState.phase === "ready" so it is a no-op while loading.
  useEffect(() => {
    if (loadState.phase !== "ready") return
    const { queue, docs: docsMap } = loadState
    if (queue.length === 0) return
    const item = queue[currentIndex]
    if (!item) return
    const doc = docsMap.get(item.documentId)
    const backref = doc?.backrefs.find((b) => b.id === item.backrefId) ?? null
    const [revA, revB] = item.reviewers

    function showToastKb(msg: string, tone: string) {
      setToast({ msg, tone, id: Date.now() })
    }

    function setGoldDraftKb(decision: GoldDraft) {
      setDraft(decision)
    }

    function pickCandidateGoldKb(citationId: string) {
      setDraft({ type: "antecedent", citationId })
    }

    async function recordGoldKb() {
      if (!draft) { showToastKb("Choose a gold answer first", "neutral"); return }
      const rat = rationale.trim() || undefined
      try {
        const stored = await api.postGold({
          documentId:  item.documentId,
          backrefId:   item.backrefId,
          type:        draft.type,
          citationId:  draft.type === "antecedent" ? draft.citationId : undefined,
          citationIds: draft.type === "ambiguous" ? draft.citationIds : undefined,
          rationale:   rat,
          by:          "lead",
        })
        queue[currentIndex] = { ...item, gold: stored }
        showToastKb("Gold recorded", "confirm")
        // S2 — announce decision
        announce("Gold recorded")
        setTimeout(() => setCurrentIndex((i) => Math.min(queue.length - 1, i + 1)), 120)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToastKb("Failed: " + msg, "flag")
        // S2 — announce failure assertively
        announce("Failed to record gold: " + msg, true)
      }
    }

    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const tag = (el.tagName ?? "").toLowerCase()
      if (tag === "textarea" || tag === "input") {
        if (e.key === "Escape") el.blur()
        return
      }
      // S1 — don't double-fire Enter/Space on focused buttons
      if ((e.key === "Enter" || e.key === " ") && el.closest("button, a, [role=button]")) return
      const k = e.key.toLowerCase()
      if (e.key === "Enter") {
        e.preventDefault(); void recordGoldKb()
      } else if (k === "a" && revA) {
        e.preventDefault()
        // Accept reviewer A's decision as gold
        const dec = revA.decision
        if (dec.type === "antecedent") setGoldDraftKb({ type: "antecedent", citationId: dec.citationId })
        else if (dec.type === "abstain") setGoldDraftKb({ type: "abstain" })
        else if (dec.type === "ambiguous") setGoldDraftKb({ type: "ambiguous", citationIds: dec.citationIds })
        else setGoldDraftKb({ type: "none" })
      } else if (k === "b" && revB) {
        e.preventDefault()
        const dec = revB.decision
        if (dec.type === "antecedent") setGoldDraftKb({ type: "antecedent", citationId: dec.citationId })
        else if (dec.type === "abstain") setGoldDraftKb({ type: "abstain" })
        else if (dec.type === "ambiguous") setGoldDraftKb({ type: "ambiguous", citationIds: dec.citationIds })
        else setGoldDraftKb({ type: "none" })
      } else if (k === "g" && item.engineGuess) {
        e.preventDefault()
        pickCandidateGoldKb(item.engineGuess)
      } else if (k === "x") {
        e.preventDefault()
        setGoldDraftKb({ type: "none" })
      } else if (k === "r") {
        e.preventDefault()
        ratRef.current?.focus()
      } else if (e.key >= "1" && e.key <= "9") {
        const cand = backref?.candidates[parseInt(e.key, 10) - 1]
        if (cand) { e.preventDefault(); pickCandidateGoldKb(cand.citationId) }
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setCurrentIndex((i) => Math.min(queue.length - 1, i + 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // ---- reset draft when item changes -----------------------------------------
  // Placed above early returns to satisfy Rules of Hooks.
  // Body guards on loadState.phase === "ready" so it is a no-op while loading.

  useEffect(() => {
    if (loadState.phase !== "ready") return
    const g = loadState.queue[currentIndex]?.gold
    if (!g) {
      setDraft(null)
      setRationale("")
      return
    }
    setRationale(g.rationale ?? "")
    // Convert GoldDecision → GoldDraft (strip at/by, keep type fields)
    if (g.type === "antecedent" && g.citationId) setDraft({ type: "antecedent", citationId: g.citationId })
    else if (g.type === "abstain") setDraft({ type: "abstain" })
    else if (g.type === "ambiguous" && g.citationIds) setDraft({ type: "ambiguous", citationIds: g.citationIds })
    else setDraft({ type: "none" })
  }, [currentIndex, loadState]) // intentionally includes loadState to guard correctly

  // ---- guard: not ready ------------------------------------------------------

  if (loadState.phase === "loading") {
    return (
      <div className="adj" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--ink-3)", fontSize: 14 }}>Loading adjudication queue…</div>
      </div>
    )
  }

  if (loadState.phase === "error") {
    return (
      <div className="adj" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--c-flag)", fontSize: 14 }}>Error: {loadState.message}</div>
      </div>
    )
  }

  const { queue, docs: docsMap, annotators: annotatorMap } = loadState

  if (queue.length === 0) {
    return (
      <div className="adj" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--ink-3)", fontSize: 14 }}>No items in adjudication queue.</div>
      </div>
    )
  }

  const item = queue[currentIndex]
  const doc = docsMap.get(item.documentId)

  // Build a cross-doc citation lookup from all loaded docs
  const citeLookup: CiteLookup = new Map()
  docsMap.forEach((d) => d.citations.forEach((c) => citeLookup.set(c.id, c)))

  // Build buriedSet for DocViewer
  const buriedSet = new Set<string>()
  docsMap.forEach((d) =>
    d.backrefs.forEach((b) =>
      b.candidates.forEach((cand) => { if (cand.isBuriedAside) buriedSet.add(cand.citationId) })
    )
  )

  // Find the matching backref in the document
  const backref = doc?.backrefs.find((b) => b.id === item.backrefId) ?? null

  const [revA, revB] = item.reviewers

  const resolvedCount = queue.filter((q) => q.gold !== null).length

  // ---- helpers (inside render to close over mutable state) ------------------

  function showToast(msg: string, tone: string) {
    setToast({ msg, tone, id: Date.now() })
  }

  function setGoldDraft(decision: GoldDraft) {
    setDraft(decision)
  }

  function pickCandidateGold(citationId: string) {
    setDraft({ type: "antecedent", citationId })
  }

  async function recordGold() {
    if (!draft) { showToast("Choose a gold answer first", "neutral"); return }

    const rat = rationale.trim() || undefined

    try {
      const stored = await api.postGold({
        documentId:  item.documentId,
        backrefId:   item.backrefId,
        type:        draft.type,
        citationId:  draft.type === "antecedent" ? draft.citationId : undefined,
        citationIds: draft.type === "ambiguous" ? draft.citationIds : undefined,
        rationale:   rat,
        by:          "lead",
      })
      // Mutate the queue item locally so the checkmark appears
      queue[currentIndex] = { ...item, gold: stored }
      showToast("Gold recorded", "confirm")
      // S2 — announce decision
      announce("Gold recorded")
      setTimeout(() => setCurrentIndex((i) => Math.min(queue.length - 1, i + 1)), 120)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast("Failed: " + msg, "flag")
      // S2 — announce failure assertively
      announce("Failed to record gold: " + msg, true)
    }
  }

  function jump(idx: number) { setCurrentIndex(idx) }

  // ---- tint map for DocViewer ------------------------------------------------

  const tintMap: Record<string, string> = {}
  if (revA) describeDecision(revA.decision, citeLookup).cites.forEach((id) => { tintMap[id] = "a" })
  if (revB) describeDecision(revB.decision, citeLookup).cites.forEach((id) => { tintMap[id] = "b" })
  if (draft?.type === "antecedent") tintMap[draft.citationId] = "gold"
  if (draft?.type === "ambiguous") draft.citationIds.forEach((id) => { tintMap[id] = "gold" })

  const agree = revA && revB ? sameDecision(revA.decision, revB.decision) : false
  const goldRec = item.gold

  // Backref display text: text slice from doc
  const backrefText = doc && backref
    ? doc.text.slice(backref.span[0], backref.span[1])
    : item.backrefId

  // Doc caption for header
  const docCaption = doc?.caption ?? item.documentId
  const docMeta = [doc?.docket, doc?.court, doc?.year].filter(Boolean).join(" · ")

  // Reviewer name resolution
  function revName(r: ReviewerLabelRef): string {
    return annotatorMap.get(r.annotatorId) ?? r.annotatorId
  }

  const TYPE_LABEL: Record<string, string> = {
    antecedent: "Antecedent",
    abstain: "No antecedent",
    ambiguous: "Ambiguous",
    flag: "Flagged",
  }

  return (
    <div className="adj">
      {/* queue rail */}
      <aside className="rv-rail">
        <div className="prog">
          <svg className="prog__ring" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" className="prog__bg" />
            <circle
              cx="24" cy="24" r="18"
              className="prog__fg"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - resolvedCount / queue.length)}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <div className="prog__txt">
            <div className="prog__name">Disagreements</div>
            <div className="prog__count"><strong>{resolvedCount}</strong> / {queue.length} adjudicated</div>
          </div>
        </div>
        <div className="rail-list">
          {queue.map((q, i) => {
            const d = docsMap.get(q.documentId)
            const br = d?.backrefs.find((b) => b.id === q.backrefId)
            const done = q.gold !== null
            const refText = br && d ? d.text.slice(br.span[0], br.span[1]) : q.backrefId
            return (
              <button
                key={q.id}
                className={"adj-row" + (i === currentIndex ? " adj-row--on" : "")}
                onClick={() => jump(i)}
              >
                <span className={"adj-row__badge adj-row__badge--" + q.reason}>
                  {q.reason === "flag" ? "⚑" : "⇄"}
                </span>
                <span className="adj-row__main">
                  <span className="adj-row__ref">{refText}</span>
                  <span className="adj-row__doc">{d?.caption ?? q.documentId}</span>
                </span>
                {done ? <span className="adj-row__done">✓</span> : <StatusDot status="none" />}
              </button>
            )
          })}
        </div>
      </aside>

      {/* document */}
      <main className="rv-doc">
        <header className="rv-doc__bar">
          <div className="rv-doc__id">
            <span className="rv-doc__caption">{docCaption}</span>
            <span className="rv-doc__meta">{docMeta}</span>
          </div>
          <div className="adj-legend">
            {revA && <span className="adj-legend__item"><span className="swatch swatch--a" /> {revName(revA)}</span>}
            {revB && <span className="adj-legend__item"><span className="swatch swatch--b" /> {revName(revB)}</span>}
            <span className="adj-legend__item"><span className="swatch swatch--gold" /> gold</span>
          </div>
        </header>
        <div className="rv-doc__stage">
          {doc && backref ? (
            <>
              <DocMap
                doc={doc}
                current={backref}
                labels={new Map()}
                docId={doc.id}
                onJump={() => { /* adjudicator doesn't jump by backref */ }}
              />
              <DocViewer
                doc={doc}
                current={backref}
                activeCitationId={activeCite}
                candidateIds={backref.candidates.map((c) => c.citationId)}
                ambigSet={null}
                buriedSet={buriedSet}
                expanded={false}
                labels={new Map()}
                docId={doc.id}
                tintMap={tintMap}
                onPickCitation={pickCandidateGold}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
              Document not loaded
            </div>
          )}
        </div>
      </main>

      {/* adjudication panel */}
      <section className="rv-panel">
        <header className="panel-head" key={"ah" + item.id}>
          <div className="panel-head__top">
            {backref && (
              <span className={"kind-pill kind-pill--" + backref.kind}>
                {KIND_LABEL[backref.kind] ?? backref.kind}
              </span>
            )}
            <span className={"reason-pill reason-pill--" + item.reason}>
              {item.reason === "flag" ? "flagged" : "disagreement"}
            </span>
          </div>
          <div className="panel-head__ref">{backrefText}</div>
          {backref?.engineWarning && (
            <div className="panel-head__where">{backref.engineWarning}</div>
          )}
        </header>

        <div className="panel-scroll" key={"as" + item.id}>
          {/* engine */}
          <div className="adj-block">
            <div className="adj-block__label">Engine guess</div>
            <button
              type="button"
              className={"adj-src adj-src--engine" + (draft?.type === "antecedent" && draft.citationId === item.engineGuess ? " adj-src--chosen" : "")}
              onClick={() => item.engineGuess && pickCandidateGold(item.engineGuess)}
              onMouseEnter={() => setActiveCite(item.engineGuess)}
              onMouseLeave={() => setActiveCite(null)}
              onFocus={() => setActiveCite(item.engineGuess)}
              onBlur={() => setActiveCite(null)}
              aria-pressed={draft?.type === "antecedent" && draft.citationId === item.engineGuess}
            >
              <span className="adj-src__txt">
                {item.engineGuess
                  ? (citeLookup.get(item.engineGuess)?.displayText ?? item.engineGuess)
                  : "Declined (no guess)"}
              </span>
              <KeyCap>G</KeyCap>
            </button>
          </div>

          {/* reviewers */}
          <div className="adj-block">
            <div className="adj-block__label">
              Reviewers{" "}
              {agree
                ? <span className="agree-tag agree-tag--yes">agree</span>
                : <span className="agree-tag agree-tag--no">disagree</span>}
            </div>
            {([{ r: revA, tone: "a", key: "A" }, { r: revB, tone: "b", key: "B" }] as const).map(({ r, tone, key }) => {
              if (!r) return null
              const dec = describeDecision(r.decision, citeLookup)
              const isGold = draft !== null && sameDecision(draft, r.decision)
              const typeLabel = TYPE_LABEL[r.decision.type] ?? r.decision.type
              return (
                <button
                  key={key}
                  type="button"
                  className={"adj-src adj-src--" + tone + (isGold ? " adj-src--chosen" : "")}
                  onClick={() => {
                    const d = r.decision
                    if (d.type === "antecedent") setGoldDraft({ type: "antecedent", citationId: d.citationId })
                    else if (d.type === "abstain") setGoldDraft({ type: "abstain" })
                    else if (d.type === "ambiguous") setGoldDraft({ type: "ambiguous", citationIds: d.citationIds })
                    else setGoldDraft({ type: "none" })
                  }}
                  onMouseEnter={() => setActiveCite(dec.cites[0] ?? null)}
                  onMouseLeave={() => setActiveCite(null)}
                  onFocus={() => setActiveCite(dec.cites[0] ?? null)}
                  onBlur={() => setActiveCite(null)}
                  aria-pressed={isGold}
                >
                  <span className={"swatch swatch--" + tone} />
                  <span className="adj-src__body">
                    <span className="adj-src__who">{revName(r)}</span>
                    <span className="adj-src__dec">
                      <span className="adj-src__type">{typeLabel}</span>
                      {(r.decision.type === "antecedent" || r.decision.type === "ambiguous") && (
                        <span className="adj-src__cite">{dec.text}</span>
                      )}
                      {r.decision.type === "flag" && (
                        <span className="adj-src__cite adj-src__cite--note">&ldquo;{dec.text}&rdquo;</span>
                      )}
                    </span>
                  </span>
                  <KeyCap>{key}</KeyCap>
                </button>
              )
            })}
          </div>

          {/* candidates */}
          {backref && (
            <div className="adj-block">
              <div className="adj-block__label">Set gold from candidates</div>
              <div className="cand-list">
                {backref.candidates.map((cand, i) => {
                  const cit = citeLookup.get(cand.citationId)
                  const chosen = draft?.type === "antecedent" && draft.citationId === cand.citationId
                  const isBuried = buriedSet.has(cand.citationId)
                  return (
                    <button
                      key={cand.citationId}
                      type="button"
                      className={"cand" + (isBuried ? " cand--buried" : "") + (chosen ? " cand--selected" : "")}
                      onClick={() => pickCandidateGold(cand.citationId)}
                      onMouseEnter={() => setActiveCite(cand.citationId)}
                      onMouseLeave={() => setActiveCite(null)}
                      onFocus={() => setActiveCite(cand.citationId)}
                      onBlur={() => setActiveCite(null)}
                      aria-pressed={chosen}
                    >
                      <div className="cand__key"><KeyCap>{i + 1}</KeyCap></div>
                      <div className="cand__body">
                        <div className="cand__head">
                          <span className="cand__cite">{cit?.displayText ?? cand.citationId}</span>
                          {cand.citationId === item.engineGuess && (
                            <span className="tag tag--engine">★ guess</span>
                          )}
                          {isBuried && <span className="tag tag--buried">parenthetical</span>}
                        </div>
                        <p className="cand__why">{cand.why}</p>
                      </div>
                      {typeof cand.confidence === "number" && (
                        <div className="cand__conf">
                          <ConfidenceMeter value={cand.confidence} pick={cand.citationId === item.engineGuess} />
                        </div>
                      )}
                    </button>
                  )
                })}
                <button
                  className={"adj-abstain" + (draft?.type === "none" ? " adj-abstain--on" : "")}
                  onClick={() => setGoldDraft({ type: "none" })}
                >
                  ∅ Gold = no valid antecedent <KeyCap>X</KeyCap>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* gold dock */}
        <div className="dock">
          {goldRec && (
            <div className="dock__state dock__state--confirm">
              <StatusDot status="confirm" /> Gold recorded
              <span className="dock__state__hint"> — update to change</span>
            </div>
          )}
          <div className="adj-gold">
            <span className="adj-gold__label">Gold answer</span>
            <span className="adj-gold__val">
              {draft ? describeGold(draft, citeLookup) : <em>not set</em>}
            </span>
          </div>
          <textarea
            ref={ratRef}
            className="dock__note"
            placeholder="Rationale for the gold answer (press R to focus)"
            value={rationale}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRationale(e.target.value)}
          />
          <button
            className="primary-btn primary-btn--confirm"
            disabled={!draft}
            onClick={() => void recordGold()}
          >
            <span>Record gold</span><KeyCap wide tone="dark">Enter</KeyCap>
          </button>
        </div>
      </section>

      {toast && (
        <div key={toast.id} className={"toast toast--" + (toast.tone === "neutral" ? "" : toast.tone)}>
          <StatusDot status={toast.tone === "neutral" ? "none" : toast.tone} /> {toast.msg}
        </div>
      )}
    </div>
  )
}
