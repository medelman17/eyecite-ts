import { useState } from "react"
import { ReviewerWorkbench } from "./reviewer"
import { AdjudicatorWorkbench } from "./adjudicator"
import { MaintainerDashboard } from "./dashboard"
import { LegendBar, LEGEND, ADJ_LEGEND, KeyCap } from "./components"
import { AnnouncerRoot } from "./announcer"

type Tab = "review" | "adjudicate" | "dash"

function TopBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">A</span>
        Antecedent Annotator
        <span className="brand__sub">Citation back-reference ground-truth</span>
      </div>
      <nav className="tabs" aria-label="Main navigation">
        <button
          className={tab === "review" ? "on" : ""}
          onClick={() => setTab("review")}
          aria-current={tab === "review" ? "page" : undefined}
        >
          Review
        </button>
        <button
          className={tab === "adjudicate" ? "on" : ""}
          onClick={() => setTab("adjudicate")}
          aria-current={tab === "adjudicate" ? "page" : undefined}
        >
          Adjudicate
        </button>
        <button
          className={tab === "dash" ? "on" : ""}
          onClick={() => setTab("dash")}
          aria-current={tab === "dash" ? "page" : undefined}
        >
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
    <AnnouncerRoot>
      <div className="app">
        <TopBar tab={tab} setTab={setTab} />

        {tab === "review" && (
          <ReviewerWorkbench onGoAdjudicate={() => setTab("adjudicate")} />
        )}

        {tab === "adjudicate" && (
          <AdjudicatorWorkbench />
        )}

        {tab === "dash" && (
          <MaintainerDashboard
            onOpenBatch={() => setTab("review")}
            onAdjudicate={() => setTab("adjudicate")}
          />
        )}

        {tab === "review" && <LegendBar items={LEGEND} />}
        {tab === "adjudicate" && <LegendBar items={ADJ_LEGEND} />}
      </div>
    </AnnouncerRoot>
  )
}
