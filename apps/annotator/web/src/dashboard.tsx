/* Antecedent Annotator — Maintainer dashboard.
   Typed port of dashboard.jsx → dashboard.tsx. No window.AA_DATA. */

import { useState, useEffect, useMemo } from "react"
import type { BatchSummary, DocListItem, Annotator } from "./types"
import { api } from "./api"
import { DECISION_META } from "./components"
import { Modal } from "./Modal"

// ---- helpers -----------------------------------------------------------------

interface MixBarProps {
  mix: BatchSummary["mix"]
}

function MixBar({ mix }: MixBarProps) {
  const total = (Object.values(mix) as number[]).reduce((a, b) => a + b, 0) || 1
  const order: (keyof BatchSummary["mix"])[] = ["confirm", "correct", "abstain", "ambiguous", "flag"]
  return (
    <div className="mixbar" title="Decision mix">
      {order.map((k) =>
        mix[k] > 0 ? (
          <span
            key={k}
            className={"mixbar__seg mixbar__seg--" + k}
            style={{ width: (mix[k] / total * 100) + "%" }}
            title={DECISION_META[k]?.label + ": " + String(mix[k])}
          />
        ) : null
      )}
    </div>
  )
}

interface KappaPillProps {
  value: number | null
}

function KappaPill({ value }: KappaPillProps) {
  if (value == null) return <span className="kappa kappa--na">single</span>
  const tone = value >= 0.81 ? "hi" : value >= 0.61 ? "mid" : "lo"
  return <span className={"kappa kappa--" + tone}>κ {value.toFixed(2)}</span>
}

const STATUS_LABEL: Record<string, string> = {
  active: "In progress",
  "needs-adjudication": "Needs adjudication",
  complete: "Complete",
}

interface KpiProps {
  label: string
  value: string | number
  sub: string
  bar?: number
  tone?: string
}

function Kpi({ label, value, sub, bar, tone }: KpiProps) {
  return (
    <div className={"kpi" + (tone ? " kpi--" + tone : "")}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__sub">{sub}</div>
      {bar != null && (
        <div className="kpi__bar">
          <div style={{ width: (bar * 100) + "%" }} />
        </div>
      )}
    </div>
  )
}

// ---- NewBatchDrawer ----------------------------------------------------------

interface NewBatchDrawerProps {
  pool: DocListItem[]
  annotators: Annotator[]
  onClose: () => void
  onCreated: () => void
}

function NewBatchDrawer({ pool, annotators, onClose, onCreated }: NewBatchDrawerProps) {
  const [picked, setPicked] = useState<string[]>([])
  const [name, setName] = useState("batch-" + String(Date.now()).slice(-4))
  const [mode, setMode] = useState<"single" | "double">("single")
  const [reviewers, setReviewers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function toggle(id: string) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.concat(id))
  }

  function toggleRev(id: string) {
    setReviewers((p) => p.includes(id) ? p.filter((x) => x !== id) : p.concat(id))
  }

  const totalRefs = pool
    .filter((d) => picked.includes(d.id))
    .reduce((n, d) => n + d.backrefCount, 0)

  async function doCreate() {
    if (!picked.length) return
    if (mode === "double" && reviewers.length < 2) return
    setCreating(true)
    setErrorMsg(null)
    try {
      await api.createBatch({ name, mode, documentIds: picked, reviewers })
      setCreated(true)
      onCreated()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <Modal onClose={onClose} labelledById="new-batch-heading">
      <div className="drawer" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {created ? (
          <div className="drawer__done">
            <div className="drawer__done-mark" aria-hidden="true">✓</div>
            <h3 id="new-batch-heading">Batch created</h3>
            <p>
              {picked.length} documents · {totalRefs} back-references ·{" "}
              {mode === "double"
                ? String(reviewers.length) + " reviewers"
                : "single annotation"}.
              The engine will pre-compute guesses before it appears in reviewers&rsquo; queues.
            </p>
            <button className="primary-btn primary-btn--confirm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <header className="drawer__head">
              <h3 id="new-batch-heading">New batch</h3>
              <button className="x-btn" onClick={onClose} aria-label="Close">×</button>
            </header>
            <div className="drawer__body">
              <div className="field">
                <label>Batch name</label>
                <input
                  className="text-input"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="e.g. batch-043"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>
              <div className="field">
                <label>Documents from pool</label>
                <div className="pool">
                  {pool.map((d) => (
                    <button
                      key={d.id}
                      className={"pool-row" + (picked.includes(d.id) ? " pool-row--on" : "")}
                      onClick={() => toggle(d.id)}
                    >
                      <span className="pool-row__check">{picked.includes(d.id) ? "✓" : ""}</span>
                      <span className="pool-row__cap">{d.id}</span>
                      <span className="pool-row__meta">
                        <span className={"src src--" + d.source}>{d.source === "ocr" ? "OCR" : "native"}</span>
                        {" · "}{d.backrefCount} refs
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Annotation mode</label>
                <div className="seg">
                  <button
                    className={"seg__opt" + (mode === "single" ? " seg__opt--on" : "")}
                    onClick={() => setMode("single")}
                  >
                    Single
                  </button>
                  <button
                    className={"seg__opt" + (mode === "double" ? " seg__opt--on" : "")}
                    onClick={() => setMode("double")}
                  >
                    Double + adjudication
                  </button>
                </div>
                <p className="field__hint">
                  {mode === "double"
                    ? "Two reviewers label independently; disagreements route to an adjudication queue and κ is reported."
                    : "One reviewer per back-reference. Fastest path to a labeled set."}
                </p>
              </div>
              <div className="field">
                <label>
                  Assign reviewers{" "}
                  {mode === "double" && <span className="field__req">(2+)</span>}
                </label>
                <div className="rev-pick">
                  {annotators.map((a) => (
                    <button
                      key={a.id}
                      className={"rev-chip" + (reviewers.includes(a.id) ? " rev-chip--on" : "")}
                      onClick={() => toggleRev(a.id)}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
              {errorMsg && (
                <div className="field" style={{ color: "var(--c-flag)", fontSize: 13 }}>
                  {errorMsg}
                </div>
              )}
            </div>
            <footer className="drawer__foot">
              <span className="drawer__summary">{picked.length} docs · {totalRefs} back-refs</span>
              <button
                className="primary-btn primary-btn--confirm"
                disabled={creating || !picked.length || !name.trim() || (mode === "double" && reviewers.length < 2)}
                onClick={() => void doCreate()}
              >
                {creating ? "Creating…" : "Create batch"}
              </button>
            </footer>
          </>
        )}
      </div>
      </Modal>
    </div>
  )
}

// ---- ExportModal -------------------------------------------------------------

interface ExportModalProps {
  batch: BatchSummary
  onClose: () => void
}

function ExportModal({ batch, onClose }: ExportModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const exportHref = api.exportUrl(batch.id)

  useEffect(() => {
    setLoading(true)
    fetch(exportHref)
      .then((r) => r.text())
      .then((txt) => {
        // Show first 3 lines of NDJSON as a preview
        const lines = txt.split("\n").filter(Boolean).slice(0, 3)
        setPreview(lines.length ? lines.join("\n") : "(no gold decisions yet)")
      })
      .catch(() => setPreview("(preview unavailable)"))
      .finally(() => setLoading(false))
  }, [exportHref])

  return (
    <div className="overlay" onClick={onClose}>
      <Modal onClose={onClose} labelledById="export-heading">
      <div className="drawer drawer--export" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <header className="drawer__head">
          <h3 id="export-heading">Export gold — {batch.name}</h3>
          <button className="x-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="drawer__body">
          <p className="field__hint">
            {batch.labeled} labels ·{" "}
            {batch.mode === "double"
              ? "adjudicated gold (κ " + (batch.kappa != null ? batch.kappa.toFixed(2) : "—") + ")"
              : "single-annotation"}
            . JSON Lines, one record per back-reference:
          </p>
          <pre className="code">
            {loading ? "Loading preview…" : (preview ?? "")}
          </pre>
        </div>
        <footer className="drawer__foot">
          <span className="drawer__summary">{batch.labeled} records</span>
          <div className="drawer__foot-btns">
            <button className="ghost-btn" onClick={onClose}>Cancel</button>
            <a
              href={exportHref}
              download={batch.id + "-gold.jsonl"}
              className="primary-btn primary-btn--confirm"
              onClick={onClose}
            >
              Download .jsonl
            </a>
          </div>
        </footer>
      </div>
      </Modal>
    </div>
  )
}

// ---- loading states ----------------------------------------------------------

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; batches: BatchSummary[]; pool: DocListItem[]; annotators: Annotator[] }

// ---- main component ----------------------------------------------------------

interface MaintainerDashboardProps {
  onOpenBatch?: () => void
  onAdjudicate?: () => void
}

export function MaintainerDashboard({ onOpenBatch, onAdjudicate }: MaintainerDashboardProps) {
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" })
  const [showNew, setShowNew] = useState(false)
  const [showExport, setShowExport] = useState<BatchSummary | null>(null)

  function doLoad() {
    setLoadState({ phase: "loading" })
    Promise.all([
      api.listBatches(),
      api.listDocuments(),
      api.listAnnotators(),
    ])
      .then(([batches, pool, annotators]) => {
        setLoadState({ phase: "ready", batches, pool, annotators })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setLoadState({ phase: "error", message })
      })
  }

  useEffect(() => { doLoad() }, [])

  if (loadState.phase === "loading") {
    return (
      <div className="dash" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--ink-3)", fontSize: 14 }}>Loading corpus…</div>
      </div>
    )
  }

  if (loadState.phase === "error") {
    return (
      <div className="dash" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--c-flag)", fontSize: 14 }}>Error: {loadState.message}</div>
      </div>
    )
  }

  const { batches, pool, annotators } = loadState

  const totals = useMemo(() => {
    let labeled = 0, backrefCount = 0, disagreements = 0, flagged = 0
    const kappas: number[] = []
    batches.forEach((b) => {
      labeled += b.labeled
      backrefCount += b.backrefCount
      disagreements += b.disagreements
      flagged += b.flagged
      if (b.kappa != null) kappas.push(b.kappa)
    })
    const meanK = kappas.length ? kappas.reduce((a, c) => a + c, 0) / kappas.length : null
    return { labeled, backrefCount, disagreements, flagged, meanK }
  }, [batches])

  return (
    <div className="dash">
      <header className="dash__head">
        <div>
          <h1 className="dash__title">Corpus</h1>
          <p className="dash__sub">
            Antecedent ground-truth — {batches.length} batches · {totals.labeled} of {totals.backrefCount} back-references labeled
          </p>
        </div>
        <button
          className="primary-btn primary-btn--confirm dash__new"
          onClick={() => setShowNew(true)}
        >
          + New batch
        </button>
      </header>

      <div className="kpis">
        <Kpi
          label="Labeled back-refs"
          value={totals.labeled}
          sub={"of " + String(totals.backrefCount) + " across all batches"}
          bar={totals.backrefCount ? totals.labeled / totals.backrefCount : 0}
        />
        <Kpi
          label="Mean agreement"
          value={totals.meanK != null ? "κ " + totals.meanK.toFixed(2) : "—"}
          sub="double-annotated batches"
          tone={totals.meanK != null && totals.meanK >= 0.8 ? "hi" : "mid"}
        />
        <Kpi
          label="Awaiting adjudication"
          value={totals.disagreements}
          sub="reviewer disagreements"
          tone={totals.disagreements ? "warn" : "ok"}
        />
        <Kpi
          label="Flagged"
          value={totals.flagged}
          sub="punted as hard"
          tone="flag"
        />
      </div>

      <div className="batch-grid">
        {batches.map((b) => (
          <article key={b.id} className={"batch-card" + (b.status === "active" ? " batch-card--active" : "")}>
            <div className="batch-card__top">
              <div>
                <div className="batch-card__name">{b.name}</div>
                <div className="batch-card__meta">
                  {b.docCount} docs · {b.backrefCount} back-refs ·{" "}
                  <span className={"mode mode--" + b.mode}>
                    {b.mode === "double" ? "double-annotated" : "single"}
                  </span>
                </div>
              </div>
              <span className={"status-tag status-tag--" + b.status}>
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>

            <div className="batch-card__progress">
              <div className="bar">
                <div
                  className="bar__fill"
                  style={{ width: (b.backrefCount ? b.labeled / b.backrefCount * 100 : 0) + "%" }}
                />
              </div>
              <span className="bar__num">
                {b.backrefCount ? Math.round(b.labeled / b.backrefCount * 100) : 0}%
              </span>
            </div>

            <MixBar mix={b.mix} />

            <div className="batch-card__foot">
              <div className="reviewers">
                {b.reviewers.map((r) => (
                  <span key={r} className="avatar" title={r}>
                    {r.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                ))}
                <span className="reviewers__names">{b.reviewers.join(" · ")}</span>
              </div>
              <KappaPill value={b.kappa} />
            </div>

            <div className="batch-card__foot">
              {b.disagreements > 0 && (
                <span className="batch-card__stat">
                  {b.disagreements} disagreements
                </span>
              )}
              {b.flagged > 0 && (
                <span className="batch-card__stat batch-card__stat--flag">
                  {b.flagged} flagged
                </span>
              )}
            </div>

            <div className="batch-card__actions">
              {b.status === "active" && onOpenBatch && (
                <button className="ghost-btn ghost-btn--on" onClick={onOpenBatch}>
                  Open in workbench →
                </button>
              )}
              {b.status === "needs-adjudication" && onAdjudicate && (
                <button className="ghost-btn ghost-btn--on" onClick={onAdjudicate}>
                  {b.disagreements} to adjudicate →
                </button>
              )}
              {b.disagreements === 0 && b.status !== "active" && (
                <span className="batch-card__spacer" />
              )}
              <button className="ghost-btn" onClick={() => setShowExport(b)}>
                Export gold
              </button>
            </div>
          </article>
        ))}
      </div>

      {showNew && (
        <NewBatchDrawer
          pool={pool}
          annotators={annotators}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false)
            doLoad()
          }}
        />
      )}
      {showExport && (
        <ExportModal batch={showExport} onClose={() => setShowExport(null)} />
      )}
    </div>
  )
}
