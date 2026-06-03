import { useEffect, useState } from "react"
import { api } from "./api"
import type { BatchSummary } from "./types"

type Tab = "review" | "adjudicate" | "dash"

function TopBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">A</span>
        Antecedent Annotator
        <span className="brand__sub">Citation back-reference ground-truth</span>
      </div>
      <nav className="tabs">
        <button className={tab === "review" ? "on" : ""} onClick={() => setTab("review")}>
          Review
        </button>
        <button
          className={tab === "adjudicate" ? "on" : ""}
          onClick={() => setTab("adjudicate")}
        >
          Adjudicate
        </button>
        <button className={tab === "dash" ? "on" : ""} onClick={() => setTab("dash")}>
          Corpus
        </button>
      </nav>
      <div className="topbar__spacer" />
      <div className="topbar__who">Antecedent Annotator</div>
    </header>
  )
}

type BatchStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; batches: BatchSummary[] }
  | { state: "error"; message: string }

export default function App() {
  const [tab, setTab] = useState<Tab>("review")
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({ state: "idle" })

  useEffect(() => {
    setBatchStatus({ state: "loading" })
    api
      .listBatches()
      .then((batches) => setBatchStatus({ state: "ok", batches }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setBatchStatus({ state: "error", message })
      })
  }, [])

  const statusLine =
    batchStatus.state === "loading"
      ? "Loading batches…"
      : batchStatus.state === "ok"
        ? `${batchStatus.batches.length} batch${batchStatus.batches.length !== 1 ? "es" : ""} loaded`
        : batchStatus.state === "error"
          ? `Error: ${batchStatus.message}`
          : ""

  return (
    <div className="app">
      <TopBar tab={tab} setTab={setTab} />

      {tab === "review" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "var(--ink-3)",
          }}
        >
          <div style={{ fontSize: 16 }}>Coming next: Review</div>
          {statusLine && (
            <div style={{ fontSize: 12, color: "var(--ink-4)" }}>{statusLine}</div>
          )}
        </div>
      )}

      {tab === "adjudicate" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
          }}
        >
          <div style={{ fontSize: 16 }}>Coming next: Adjudicate</div>
        </div>
      )}

      {tab === "dash" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
          }}
        >
          <div style={{ fontSize: 16 }}>Coming next: Corpus</div>
        </div>
      )}
    </div>
  )
}
