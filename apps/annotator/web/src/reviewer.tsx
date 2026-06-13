/* Antecedent Annotator — Reviewer workbench (primary surface).
   Typed port of reviewer.jsx → reviewer.tsx.
   Data source: live API (api.getBatchDocuments, api.getDocumentLabels, api.postLabel).
   No window.AA_DATA. localStorage is a resume mirror only; DB is source of truth. */

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import type { DocumentPayload, Backref, Label, ContractCitation } from "./types"
import { api } from "./api"
import {
  DECISION_META,
  KIND_LABEL,
  KeyCap,
  StatusDot,
  CandidateCard,
  DocViewer,
  DocMap,
  labelStatus,
  formatParties,
} from "./components"
import { Modal } from "./Modal"
import { useAnnounce } from "./announcer"

// ---- constants --------------------------------------------------------------

// TODO: Replace with reviewer selector / auth when multi-reviewer UI is built.
const CURRENT_ANNOTATOR = "r-okafor"
const CURRENT_BATCH = "batch-042"

const LS_KEY = "aa_reviewer_state_v2"

// ---- helpers ----------------------------------------------------------------

/** Composite key used for the labels Map to stay safe across documents. */
function labelKey(docId: string, backrefId: string): string {
  return `${docId}:${backrefId}`
}

/** Derive the set of citation IDs that appear as isBuriedAside===true in any
 *  backref across the entire document list. Used for mk-cite--buried / buried tag. */
function computeBuriedSet(docs: DocumentPayload[]): Set<string> {
  const s = new Set<string>()
  docs.forEach((d) =>
    d.backrefs.forEach((b) =>
      b.candidates.forEach((c) => {
        if (c.isBuriedAside) s.add(c.citationId)
      })
    )
  )
  return s
}

// ---- main component ---------------------------------------------------------

interface ReviewerWorkbenchProps {
  onGoAdjudicate?: () => void
}

// Flat ordered item across the batch
interface WorkItem {
  doc:     DocumentPayload
  backref: Backref
}

// Loading state machine
type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; docs: DocumentPayload[] }

export function ReviewerWorkbench({ onGoAdjudicate }: ReviewerWorkbenchProps) {
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" })
  const [labels, setLabels] = useState<Map<string, Label>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeCite, setActiveCite] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [ambiguousMode, setAmbiguousMode] = useState(false)
  const [ambigSet, setAmbigSet] = useState<string[]>([])
  const [flagMode, setFlagMode] = useState(false)
  const [note, setNote] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<"all" | "unlabeled" | "flagged">("all")
  const [showHelp, setShowHelp] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: string; id: number } | null>(null)
  const [showComplete, setShowComplete] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const panelHeadRef = useRef<HTMLElement>(null)
  const undoRef = useRef<Array<{ key: string; prev: Label | undefined; index: number }>>([])
  const announce = useAnnounce()

  // ---- load -----------------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    setLoadState({ phase: "loading" })

    async function load() {
      try {
        const docs = await api.getBatchDocuments(CURRENT_BATCH)

        // Resume: fetch existing labels for each doc in parallel
        const labelEntries = await Promise.all(
          docs.map((d) =>
            api
              .getDocumentLabels(d.id, CURRENT_ANNOTATOR)
              .then((ls) => ls.map((l) => [labelKey(d.id, l.backrefId), l] as [string, Label]))
              .catch(() => [] as [string, Label][])
          )
        )
        if (cancelled) return

        const labelsMap = new Map<string, Label>(labelEntries.flat())

        // Resume: restore last position from localStorage mirror
        let restoredIndex = 0
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (raw) {
            const saved = JSON.parse(raw) as { currentIndex?: number }
            restoredIndex = saved.currentIndex ?? 0
          }
        } catch (_) {
          // ignore
        }

        setLabels(labelsMap)
        setLoadState({ phase: "ready", docs })

        // Compute items count to clamp
        const total = docs.flatMap((d) => d.backrefs).length
        setCurrentIndex(Math.min(restoredIndex, Math.max(0, total - 1)))
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setLoadState({ phase: "error", message })
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ---- derived state (only when ready) --------------------------------------

  const docs = loadState.phase === "ready" ? loadState.docs : []

  const items: WorkItem[] = useMemo(
    () => docs.flatMap((d) => d.backrefs.map((b) => ({ doc: d, backref: b }))),
    [docs]
  )

  /** citeLookup: citationId → ContractCitation (across all docs) */
  const citeLookup = useMemo<Map<string, ContractCitation>>(() => {
    const m = new Map<string, ContractCitation>()
    docs.forEach((d) => d.citations.forEach((c) => m.set(c.id, c)))
    return m
  }, [docs])

  /** buriedSet: set of citationIds that appear isBuriedAside===true in ANY backref */
  const buriedSet = useMemo(() => computeBuriedSet(docs), [docs])

  // ---- local-storage mirror -------------------------------------------------

  useEffect(() => {
    if (loadState.phase !== "ready") return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ currentIndex }))
    } catch (_) {
      // ignore
    }
  }, [loadState.phase, currentIndex])

  // ---- transient toast auto-dismiss -----------------------------------------

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1700)
    return () => clearTimeout(t)
  }, [toast])

  // ---- reset transient selection when item changes --------------------------

  useEffect(() => {
    if (items.length === 0) return
    const item = items[currentIndex]
    if (!item) return
    const { doc, backref } = item
    const lab = labels.get(labelKey(doc.id, backref.id))
    if (lab && lab.decision.type === "antecedent") {
      setSelected(lab.decision.citationId)
    } else {
      setSelected(backref.engineGuess)
    }
    if (lab && lab.decision.type === "ambiguous") {
      setAmbiguousMode(true)
      setAmbigSet(lab.decision.citationIds.slice())
    } else {
      setAmbiguousMode(false)
      setAmbigSet([])
    }
    setFlagMode(false)
    setNote(lab?.note ?? "")
  }, [currentIndex]) // intentionally omit labels/items — matches prototype behaviour

  // ---- M3 / S2: focus panel head + announce item on navigation -------------

  useEffect(() => {
    if (loadState.phase !== "ready" || items.length === 0) return
    const item = items[currentIndex]
    if (!item) return
    const kindLabel = KIND_LABEL[item.backref.kind] ?? item.backref.kind
    const st = labelStatus(labels.get(labelKey(item.doc.id, item.backref.id)))
    const statusLabel = DECISION_META[st]?.label ?? "unlabeled"
    announce(`Item ${currentIndex + 1} of ${items.length}, ${kindLabel}, ${statusLabel}`)
    // Move focus to panel head so Tab order resumes from there
    panelHeadRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loadState.phase])

  // ---- keyboard handler (stable with useCallback) --------------------------
  // Placed above early returns to satisfy Rules of Hooks.
  // The body guards on loadState.phase === "ready" so it is a no-op while
  // loading/erroring/empty.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (loadState.phase !== "ready") return
      const readyItems: WorkItem[] = items  // items is derived from loadState above
      if (readyItems.length === 0) return
      const readyItem = readyItems[currentIndex]
      if (!readyItem) return
      const readyBackref = readyItem.backref
      const readyDoc = readyItem.doc
      const readyCurKey = labelKey(readyDoc.id, readyBackref.id)
      const readyLabeledCount = labels.size

      function showToastLocal(msg: string, tone: string) {
        setToast({ msg, tone, id: Date.now() })
      }

      function advanceLocal() {
        setCurrentIndex((i) => Math.min(readyItems.length - 1, i + 1))
      }

      async function recordLocal(
        key: string,
        docId: string,
        backrefId: string,
        label: Label,
        toastMsg: string,
        tone: string
      ) {
        undoRef.current.push({ key, prev: labels.get(key), index: currentIndex })
        setLabels((prev) => {
          const next = new Map(prev)
          next.set(key, label)
          return next
        })
        showToastLocal(toastMsg, tone)
        announce(toastMsg)
        const willCount = labels.has(key) ? readyLabeledCount : readyLabeledCount + 1
        if (willCount >= readyItems.length) setTimeout(() => setShowComplete(true), 350)
        advanceLocal()
        try {
          await api.postLabel(label)
        } catch (err: unknown) {
          console.warn("postLabel failed", docId, backrefId, err)
          announce("Save failed — check connection", true)
        }
      }

      function doConfirmLocal() {
        if (flagMode) { void saveFlagLocal(); return }
        if (ambiguousMode) { void saveAmbiguousLocal(); return }
        if (!selected) return
        const agreed = selected === readyBackref.engineGuess
        const label: Label = {
          documentId:      readyDoc.id,
          backrefId:       readyBackref.id,
          annotatorId:     CURRENT_ANNOTATOR,
          decision:        { type: "antecedent", citationId: selected },
          agreedWithEngine: agreed,
        }
        void recordLocal(
          readyCurKey, readyDoc.id, readyBackref.id, label,
          agreed ? "Confirmed" : "Correction saved",
          agreed ? "confirm" : "correct"
        )
      }

      function doAbstainLocal() {
        const label: Label = {
          documentId:      readyDoc.id,
          backrefId:       readyBackref.id,
          annotatorId:     CURRENT_ANNOTATOR,
          decision:        { type: "abstain" },
          agreedWithEngine: readyBackref.engineGuess === null,
        }
        void recordLocal(readyCurKey, readyDoc.id, readyBackref.id, label, "No antecedent", "abstain")
      }

      async function saveAmbiguousLocal() {
        if (ambigSet.length < 2) {
          showToastLocal("Pick 2+ candidates first", "neutral")
          return
        }
        const label: Label = {
          documentId:      readyDoc.id,
          backrefId:       readyBackref.id,
          annotatorId:     CURRENT_ANNOTATOR,
          decision:        { type: "ambiguous", citationIds: ambigSet.slice() },
          agreedWithEngine: false,
        }
        await recordLocal(readyCurKey, readyDoc.id, readyBackref.id, label, "Marked ambiguous", "ambiguous")
        setAmbiguousMode(false)
      }

      async function saveFlagLocal() {
        const label: Label = {
          documentId:      readyDoc.id,
          backrefId:       readyBackref.id,
          annotatorId:     CURRENT_ANNOTATOR,
          decision:        { type: "flag" },
          agreedWithEngine: false,
          note:            note.trim() || undefined,
        }
        await recordLocal(readyCurKey, readyDoc.id, readyBackref.id, label, "Flagged for later", "flag")
        setFlagMode(false)
      }

      function undoLocal() {
        const last = undoRef.current.pop()
        if (!last) { showToastLocal("Nothing to undo", "neutral"); return }
        setLabels((prev) => {
          const next = new Map(prev)
          if (last.prev) {
            next.set(last.key, last.prev)
            void api.postLabel(last.prev).catch(() => undefined)
          } else {
            next.delete(last.key)
          }
          return next
        })
        setCurrentIndex(last.index)
        showToastLocal("Undone", "neutral")
      }

      function toggleAmbiguousLocal() {
        if (ambiguousMode) { setAmbiguousMode(false); return }
        setFlagMode(false)
        const seed = readyBackref.candidates.slice(0, 2).map((c) => c.citationId)
        setAmbigSet(seed)
        setAmbiguousMode(true)
      }

      function toggleFlagLocal() {
        if (flagMode) { setFlagMode(false); return }
        setAmbiguousMode(false)
        setFlagMode(true)
        setTimeout(() => noteRef.current?.focus(), 30)
      }

      function selectCandidateLocal(citationId: string) {
        if (ambiguousMode) {
          setAmbigSet((set) =>
            set.includes(citationId) ? set.filter((x) => x !== citationId) : [...set, citationId]
          )
        } else {
          setSelected(citationId)
        }
      }

      function nextUnlabeledLocal() {
        for (let k = 1; k <= readyItems.length; k++) {
          const idx = (currentIndex + k) % readyItems.length
          const it = readyItems[idx]
          if (!labels.has(labelKey(it.doc.id, it.backref.id))) {
            setCurrentIndex(idx)
            return
          }
        }
      }

      const el = e.target as HTMLElement
      const tag = (el.tagName ?? "").toLowerCase()
      const typing = tag === "textarea" || tag === "input"
      if (typing) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void saveFlagLocal() }
        else if (e.key === "Escape") { setFlagMode(false); el.blur() }
        return
      }
      // S1 — don't double-fire on focused activatable controls
      if ((e.key === "Enter" || e.key === " ") && el.closest("button, a, [role=button]")) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); undoLocal(); return
      }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doConfirmLocal() }
      else if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1
        if (readyBackref.candidates[idx]) { e.preventDefault(); selectCandidateLocal(readyBackref.candidates[idx].citationId) }
      }
      else if (e.key.toLowerCase() === "a") { e.preventDefault(); doAbstainLocal() }
      else if (e.key.toLowerCase() === "m") { e.preventDefault(); toggleAmbiguousLocal() }
      else if (e.key.toLowerCase() === "f") { e.preventDefault(); toggleFlagLocal() }
      else if (e.key.toLowerCase() === "e") { e.preventDefault(); setExpanded((x) => !x) }
      else if (e.key.toLowerCase() === "j") { e.preventDefault(); nextUnlabeledLocal() }
      else if (e.key === "ArrowRight") { e.preventDefault(); setCurrentIndex((i) => Math.min(readyItems.length - 1, i + 1)) }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); setCurrentIndex((i) => Math.max(0, i - 1)) }
      else if (e.key === "?") { e.preventDefault(); setShowHelp((x) => !x) }
      else if (e.key === "Escape") { setShowHelp(false) }
    },
    // Re-attach whenever any of these change so closures stay fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadState, currentIndex, selected, ambiguousMode, ambigSet, flagMode, note, items, labels]
  )

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  // ---- guard: not yet ready -------------------------------------------------

  if (loadState.phase === "loading") {
    return (
      <div className="rv" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--ink-3)", fontSize: 14 }}>Loading batch…</div>
      </div>
    )
  }

  if (loadState.phase === "error") {
    return (
      <div className="rv" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--c-flag)", fontSize: 14 }}>
          Error loading batch: {loadState.message}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rv" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--ink-3)", fontSize: 14 }}>
          No documents in this batch.
        </div>
      </div>
    )
  }

  // ---- safe to dereference --------------------------------------------------

  const item    = items[currentIndex]
  const doc     = item.doc
  const backref = item.backref
  const docLen  = doc.text.length
  const refPos  = backref.span ? backref.span[0] / docLen : 0
  const curKey  = labelKey(doc.id, backref.id)
  const curLabel = labels.get(curKey)
  const curStatus = labelStatus(curLabel)
  const candidateIds = backref.candidates.map((c) => c.citationId)
  const labeledCount = labels.size

  // ---- actions --------------------------------------------------------------

  function showToast(msg: string, tone: string) {
    setToast({ msg, tone, id: Date.now() })
  }

  function advance() {
    setCurrentIndex((i) => Math.min(items.length - 1, i + 1))
  }

  async function record(
    key: string,
    docId: string,
    backrefId: string,
    label: Label,
    toastMsg: string,
    tone: string
  ) {
    undoRef.current.push({ key, prev: labels.get(key), index: currentIndex })
    setLabels((prev) => {
      const next = new Map(prev)
      next.set(key, label)
      return next
    })
    showToast(toastMsg, tone)
    // S2 — announce decision for screen readers (assertive for failures, polite for success)
    announce(toastMsg)
    const willCount = labels.has(key) ? labeledCount : labeledCount + 1
    if (willCount >= items.length) setTimeout(() => setShowComplete(true), 350)
    advance()
    // Persist to DB (fire-and-forget; local state already updated)
    try {
      await api.postLabel(label)
    } catch (err: unknown) {
      // Non-fatal: local state reflects the decision; surface lightly
      console.warn("postLabel failed", docId, backrefId, err)
      announce("Save failed — check connection", true)
    }
  }

  function doConfirm() {
    if (flagMode) { void saveFlag(); return }
    if (ambiguousMode) { void saveAmbiguous(); return }
    if (!selected) return
    const agreed = selected === backref.engineGuess
    const label: Label = {
      documentId:      doc.id,
      backrefId:       backref.id,
      annotatorId:     CURRENT_ANNOTATOR,
      decision:        { type: "antecedent", citationId: selected },
      agreedWithEngine: agreed,
    }
    void record(
      curKey, doc.id, backref.id, label,
      agreed ? "Confirmed" : "Correction saved",
      agreed ? "confirm" : "correct"
    )
  }

  function doAbstain() {
    // agreedWithEngine = true when engine also had no guess
    const label: Label = {
      documentId:      doc.id,
      backrefId:       backref.id,
      annotatorId:     CURRENT_ANNOTATOR,
      decision:        { type: "abstain" },
      agreedWithEngine: backref.engineGuess === null,
    }
    void record(curKey, doc.id, backref.id, label, "No antecedent", "abstain")
  }

  async function saveAmbiguous() {
    if (ambigSet.length < 2) {
      showToast("Pick 2+ candidates first", "neutral")
      return
    }
    const label: Label = {
      documentId:      doc.id,
      backrefId:       backref.id,
      annotatorId:     CURRENT_ANNOTATOR,
      decision:        { type: "ambiguous", citationIds: ambigSet.slice() },
      agreedWithEngine: false,
    }
    await record(curKey, doc.id, backref.id, label, "Marked ambiguous", "ambiguous")
    setAmbiguousMode(false)
  }

  async function saveFlag() {
    const label: Label = {
      documentId:      doc.id,
      backrefId:       backref.id,
      annotatorId:     CURRENT_ANNOTATOR,
      decision:        { type: "flag" },
      agreedWithEngine: false,
      note:            note.trim() || undefined,
    }
    await record(curKey, doc.id, backref.id, label, "Flagged for later", "flag")
    setFlagMode(false)
  }

  function toggleAmbiguous() {
    if (ambiguousMode) { setAmbiguousMode(false); return }
    setFlagMode(false)
    const seed = backref.candidates.slice(0, 2).map((c) => c.citationId)
    setAmbigSet(seed)
    setAmbiguousMode(true)
  }

  function toggleFlag() {
    if (flagMode) { setFlagMode(false); return }
    setAmbiguousMode(false)
    setFlagMode(true)
    setTimeout(() => noteRef.current?.focus(), 30)
  }

  function selectCandidate(citationId: string) {
    if (ambiguousMode) {
      setAmbigSet((set) =>
        set.includes(citationId) ? set.filter((x) => x !== citationId) : [...set, citationId]
      )
    } else {
      setSelected(citationId)
    }
  }

  function jumpTo(backrefId: string) {
    // Need to find by composite key to avoid cross-doc collisions
    const idx = items.findIndex(
      (it) => it.backref.id === backrefId && it.doc.id === doc.id
    )
    if (idx !== -1) setCurrentIndex(idx)
  }

  // ---- backref display text -------------------------------------------------
  // "backref.find" in the prototype → use citeLookup for display text
  const backrefDisplayText =
    citeLookup.get(backref.id)?.displayText ?? doc.text.slice(backref.span[0], backref.span[1])

  // ---- primary button label -------------------------------------------------
  const primaryLabel = ambiguousMode
    ? "Save ambiguous"
    : flagMode
    ? "Save flag"
    : !selected
    ? "No selection"
    : selected === backref.engineGuess
    ? "Confirm guess"
    : "Save correction"

  // ---- batch name for ProgressHeader ----------------------------------------
  // We don't have a batch name from the docs payload; use the batch ID.
  const batchName = CURRENT_BATCH

  return (
    <div className="rv">
      {/* LEFT: progress + queue */}
      <aside className="rv-rail">
        <ProgressHeader batchName={batchName} labeled={labeledCount} total={items.length} />
        <div className="rail-filters">
          {(["all", "unlabeled", "flagged"] as const).map((f) => (
            <button
              key={f}
              className={"chip" + (filter === f ? " chip--on" : "")}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="rail-list">
          {docs.map((d) => {
            const rows = d.backrefs.filter((b) => {
              const lab = labels.get(labelKey(d.id, b.id))
              if (filter === "unlabeled") return !lab
              if (filter === "flagged")   return labelStatus(lab) === "flag"
              return true
            })
            if (!rows.length) return null
            return (
              <div key={d.id} className="rail-doc">
                <div className="rail-doc__title">{d.caption ?? d.id}</div>
                {rows.map((b) => {
                  const idx = items.findIndex(
                    (it) => it.backref.id === b.id && it.doc.id === d.id
                  )
                  const lab = labels.get(labelKey(d.id, b.id))
                  const st  = labelStatus(lab)
                  // backref display text in sidebar
                  const refText =
                    citeLookup.get(b.id)?.displayText ?? doc.text.slice(b.span[0], b.span[1])
                  return (
                    <button
                      key={b.id}
                      className={"rail-row" + (idx === currentIndex ? " rail-row--on" : "")}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <StatusDot status={st} />
                      <span className="rail-row__kind">{KIND_LABEL[b.kind] ?? b.kind}</span>
                      <span className="rail-row__txt">{refText}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </aside>

      {/* CENTER: opinion */}
      <main className="rv-doc">
        <header className="rv-doc__bar">
          <div className="rv-doc__id">
            {doc.caption && (
              <span className="rv-doc__caption">{doc.caption}</span>
            )}
            <span className="rv-doc__meta">
              {[doc.docket, doc.court, doc.year].filter(Boolean).join(" · ")}
              {doc.source && (
                <>
                  {" · "}
                  <span className={"src src--" + doc.source}>
                    {doc.source === "ocr" ? "OCR" : "native"}
                  </span>
                </>
              )}
            </span>
          </div>
          <button
            className={"ghost-btn" + (expanded ? " ghost-btn--on" : "")}
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? "Focus context" : "Expand context"} <KeyCap>E</KeyCap>
          </button>
        </header>
        <div className="rv-doc__stage">
          <DocMap
            doc={doc}
            current={backref}
            labels={labels}
            docId={doc.id}
            onJump={jumpTo}
          />
          <DocViewer
            doc={doc}
            current={backref}
            activeCitationId={activeCite}
            candidateIds={candidateIds}
            ambigSet={ambiguousMode ? ambigSet : null}
            buriedSet={buriedSet}
            expanded={expanded}
            labels={labels}
            docId={doc.id}
            onPickCitation={selectCandidate}
          />
        </div>
      </main>

      {/* RIGHT: candidates + decision */}
      <section className="rv-panel">
        <header
          className="panel-head"
          key={"h" + backref.id}
          ref={panelHeadRef}
          tabIndex={-1}
          style={{ outline: "none" }}
        >
          <div className="panel-head__top">
            <span className={"kind-pill kind-pill--" + backref.kind}>
              {KIND_LABEL[backref.kind] ?? backref.kind}
            </span>
            <span className="panel-head__pos">
              {currentIndex + 1} of {items.length}
            </span>
          </div>
          <div className="panel-head__ref">
            {backrefDisplayText}
            <span className="panel-head__caret">·</span>
          </div>
          <div className="panel-head__where">
            {backref.engineGuess
              ? "Resolve the antecedent of this back-reference."
              : "The engine declined to guess — judge whether any antecedent is valid."}
          </div>
        </header>

        {backref.engineWarning && (
          <div className="warn">
            <span className="warn__icon">⚠</span>
            <span>{backref.engineWarning}</span>
          </div>
        )}

        <div className="panel-scroll" key={"s" + backref.id}>
          <div className="cand-list">
            {backref.candidates.map((cand, i) => {
              const cit = citeLookup.get(cand.citationId)
              if (!cit) return null
              return (
                <CandidateCard
                  key={cand.citationId}
                  cand={cand}
                  citation={cit}
                  docLen={docLen}
                  indexKey={i + 1}
                  isEnginePick={cand.citationId === backref.engineGuess}
                  isSelected={!ambiguousMode && selected === cand.citationId}
                  inAmbigSet={ambiguousMode && ambigSet.includes(cand.citationId)}
                  isBuried={buriedSet.has(cand.citationId)}
                  refPos={refPos}
                  onSelect={selectCandidate}
                  onHover={setActiveCite}
                />
              )
            })}
          </div>

          {/* selected non-candidate (picked from doc) */}
          {selected && !candidateIds.includes(selected) && !ambiguousMode && (() => {
            const manualCit = citeLookup.get(selected)
            if (!manualCit) return null
            const manualParties = formatParties(manualCit.parties)
            return (
              <div className="cand cand--manual">
                <div className="cand__key">
                  <span className="manual-dot" />
                </div>
                <div className="cand__body">
                  <div className="cand__head">
                    <span className="cand__cite">{manualCit.displayText}</span>
                    <span className="tag tag--manual">manual pick</span>
                  </div>
                  {manualParties && (
                    <div className="cand__meta">
                      <span>{manualParties}</span>
                    </div>
                  )}
                  <p className="cand__why">
                    Chosen directly from the opinion — not among the engine&#39;s ranked candidates.
                  </p>
                </div>
              </div>
            )
          })()}

          <p className="pick-hint">
            Not listed? Click any earlier citation in the opinion to pick it.
          </p>
        </div>

        {/* decision dock */}
        <div className="dock">
          {curLabel && (
            <div className={"dock__state dock__state--" + curStatus}>
              <StatusDot status={curStatus} /> Labeled:{" "}
              <strong>{DECISION_META[curStatus]?.label}</strong>
              <span className="dock__state__hint">— act again to change</span>
            </div>
          )}
          {ambiguousMode && (
            <div className="dock__mode">
              Pick 2+ equally-plausible candidates with <KeyCap>1</KeyCap>–
              <KeyCap>9</KeyCap>, then <KeyCap wide>Enter</KeyCap>. Selected:{" "}
              {ambigSet.length}
            </div>
          )}
          {flagMode && (
            <textarea
              ref={noteRef}
              className="dock__note"
              placeholder="Why is this hard? (optional) — Enter to save, Esc to cancel"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNote(e.target.value)
              }
            />
          )}
          <button
            className={
              "primary-btn primary-btn--" +
              (selected === backref.engineGuess && !ambiguousMode && !flagMode
                ? "confirm"
                : "correct")
            }
            disabled={!selected && !ambiguousMode && !flagMode}
            onClick={doConfirm}
          >
            <span className="primary-btn__label">{primaryLabel}</span>
            <KeyCap wide tone="dark">
              Enter
            </KeyCap>
          </button>
          <div className="dock__row">
            <button
              className={
                "verb-btn verb-btn--abstain" +
                (curStatus === "abstain" ? " verb-btn--on" : "")
              }
              onClick={doAbstain}
            >
              <span className="verb-btn__g">∅</span> Abstain <KeyCap>A</KeyCap>
            </button>
            <button
              className={
                "verb-btn verb-btn--ambiguous" + (ambiguousMode ? " verb-btn--on" : "")
              }
              onClick={toggleAmbiguous}
            >
              <span className="verb-btn__g">⊜</span> Ambiguous <KeyCap>M</KeyCap>
            </button>
            <button
              className={"verb-btn verb-btn--flag" + (flagMode ? " verb-btn--on" : "")}
              onClick={toggleFlag}
            >
              <span className="verb-btn__g">⚑</span> Flag <KeyCap>F</KeyCap>
            </button>
          </div>
        </div>
      </section>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {toast && (
        <div key={toast.id} className={"toast toast--" + toast.tone}>
          <StatusDot status={toast.tone === "neutral" ? "none" : toast.tone} /> {toast.msg}
        </div>
      )}
      {showComplete && (
        <CompletionCard
          labels={labels}
          items={items}
          onClose={() => setShowComplete(false)}
          onAdjudicate={onGoAdjudicate}
        />
      )}
    </div>
  )
}

// ---- sub-components ---------------------------------------------------------

interface ProgressHeaderProps {
  batchName: string
  labeled:   number
  total:     number
}

function ProgressHeader({ batchName, labeled, total }: ProgressHeaderProps) {
  const pct = total ? labeled / total : 0
  const R = 18
  const C = 2 * Math.PI * R
  return (
    <div className="prog">
      <svg className="prog__ring" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={R} className="prog__bg" />
        <circle
          cx="24" cy="24" r={R}
          className="prog__fg"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <div className="prog__txt">
        <div className="prog__name">{batchName}</div>
        <div className="prog__count">
          <strong>{labeled}</strong> / {total} labeled
        </div>
      </div>
    </div>
  )
}

interface CompletionCardProps {
  labels:       Map<string, Label>
  items:        WorkItem[]
  onClose:      () => void
  onAdjudicate?: () => void
}

function CompletionCard({ labels, items, onClose, onAdjudicate }: CompletionCardProps) {
  const counts: Record<string, number> = {
    confirm: 0, correct: 0, abstain: 0, ambiguous: 0, flag: 0,
  }
  items.forEach((it) => {
    const lab = labels.get(labelKey(it.doc.id, it.backref.id))
    const s = labelStatus(lab)
    if (counts[s] != null) counts[s]++
  })
  const agreed = counts.confirm
  const total = items.length
  return (
    <div className="overlay" onClick={onClose}>
      <Modal onClose={onClose} labelledById="complete-heading">
        <div className="complete" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="complete__mark" aria-hidden="true">✓</div>
          <h3 id="complete-heading">Batch complete</h3>
          <p>
            All {total} back-references labeled. The engine&#39;s guess was confirmed on{" "}
            <strong>{agreed}</strong> of them ({Math.round((agreed / total) * 100)}%).
          </p>
          <div className="complete__mix">
            {(["confirm", "correct", "abstain", "ambiguous", "flag"] as const).map(
              (k) =>
                counts[k] > 0 && (
                  <div key={k} className="complete__stat">
                    <StatusDot status={k} /> <strong>{counts[k]}</strong>{" "}
                    {DECISION_META[k].label}
                  </div>
                )
            )}
          </div>
          <div className="complete__btns">
            <button className="ghost-btn" onClick={onClose}>
              Keep reviewing
            </button>
            {onAdjudicate && (
              <button className="primary-btn primary-btn--confirm" onClick={onAdjudicate}>
                Go to adjudication →
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface HelpOverlayProps {
  onClose: () => void
}

function HelpOverlay({ onClose }: HelpOverlayProps) {
  const rows: [string, string][] = [
    ["Enter / Space", "Confirm the highlighted candidate"],
    ["1 – 9",         "Pick candidate by rank"],
    ["A",             "Abstain — no valid antecedent"],
    ["M",             "Mark ambiguous (then pick 2+)"],
    ["F",             "Flag with a note"],
    ["E",             "Expand / focus document context"],
    ["← / →",         "Previous / next back-reference"],
    ["J",             "Jump to next unlabeled"],
    ["?",             "Toggle this help"],
  ]
  return (
    <div className="overlay" onClick={onClose}>
      <Modal onClose={onClose} labelledById="help-heading">
        <div className="overlay__card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <h3 id="help-heading">Keyboard</h3>
          <div className="overlay__grid">
            {rows.map((r) => (
              <div key={r[0]} className="overlay__row">
                <KeyCap wide>{r[0]}</KeyCap>
                <span>{r[1]}</span>
              </div>
            ))}
          </div>
          <button className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
