import { useState } from "react"
import { ReviewerWorkbench } from "./reviewer"
import { LegendBar, LEGEND, ADJ_LEGEND, KeyCap } from "./components"

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
      {(tab === "review" || tab === "adjudicate") && (
        <button
          className="topbar__help"
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))
          }
        >
          <KeyCap>?</KeyCap> shortcuts
        </button>
      )}
      <div className="topbar__who">
        {tab === "adjudicate" ? "Lead · Adjudicator" : "R. Okafor · Reviewer"}
      </div>
    </header>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>("review")

  return (
    <div className="app">
      <TopBar tab={tab} setTab={setTab} />

      {tab === "review" && (
        <ReviewerWorkbench onGoAdjudicate={() => setTab("adjudicate")} />
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

      {tab === "review" && <LegendBar items={LEGEND} />}
      {tab === "adjudicate" && <LegendBar items={ADJ_LEGEND} />}
    </div>
  )
}
