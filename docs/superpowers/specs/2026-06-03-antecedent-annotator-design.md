# Antecedent Annotator — Design Spec

**Date:** 2026-06-03
**Status:** Approved (brainstorming). The **frontend UX** is being produced by an external Claude design pass from the brief below; **this repo's implementation plan covers the backend** — API + Postgres + the eyecite-ts resolver-prefill pipeline + corpus sampling from the CourtListener replica + label export — and the **data contract** the UI consumes.
**Goal:** a reviewer-friendly workbench for legal experts to produce the ground-truth labeled `Id./supra → antecedent` corpus — the blocked item gating the learned ranker (#811 follow-on), the scope-vs-salience error split (02·Q5), and conformal abstention calibration (#800/#820 α).
**Related:** the short-form-resolution research series (`docs/research/2026-06-02-shortform-resolution-*`, `2026-06-03-…-readers-guide.md`), the CourtListener replica corpus source ([[reference-courtlistener-replica]]), #810 / #812.

---

> The brief below is the exact text handed to the external design pass. It is the agreed design.

## What this is, in one paragraph
Legal writing is full of back-references. Rather than repeat a full citation, authors write **"Id."** ("same source as the one I just cited") or **"Smith, supra"** ("that *Smith* case I cited earlier"). We're building software that automatically figures out what each back-reference points to — and to measure and improve it, we need a **ground-truth dataset**: for every "Id."/"supra" in a batch of real court documents, a human expert records *which earlier citation it actually refers to* (its **antecedent**). This app is the workbench those experts use. It is **not** freeform labeling: an existing engine already makes a best guess and lists the plausible earlier citations, so the human's job is mostly to **confirm the guess with one keystroke** and **correct it when wrong**. Speed and trust are everything — a session means judging hundreds of these.

## Why it matters
These human labels are the one missing ingredient that unlocks three things we otherwise can't do: measure how often the engine is wrong, train a smarter ranker, and calibrate when the engine should abstain instead of guess. No such labeled dataset exists publicly; expert judgment is the only way to produce it.

## The core task the human performs
For one highlighted back-reference at a time, decide its antecedent:
- **Confirm** the engine's pre-selected guess (the overwhelmingly common case — must be one keystroke).
- **Correct** it — choose a different citation (from the engine's ranked candidates, or any earlier citation in the document).
- **Abstain** — "there is no valid antecedent."
- **Ambiguous** — "two or more earlier citations are equally plausible and nothing disambiguates them" (e.g., two different *Smith* cases, same year).
- **Flag / unsure** — punt a genuinely hard one with a note, move on, come back later.

Three hard cases the design must accommodate gracefully (they're the whole point):
1. **Ambiguity** — two unrelated *Smith* cases were cited; "Smith, supra" could be either.
2. **Abstain** — the back-reference legitimately resolves to nothing.
3. **Buried citations** — a citation that appears *inside another citation's parenthetical* ("Hogue … (quoting Corsello …)") is usually **not** a valid antecedent; the human must tell a real candidate from a buried one.

## Personas
- **Legal Reviewer (primary user).** A lawyer or law-trained annotator who reads dense legal prose fluently. Goal: move fast, with just enough context to decide confidently, and a frictionless confirm/correct. Pain to avoid: hunting through a 30-page opinion to find what "Id." refers to.
- **Adjudicator / Lead.** Reviews disagreements and flagged cases and sets the final "gold" answer. Goal: a focused disagreement queue with side-by-side annotator choices.
- **Maintainer / Data Steward** (technical). Loads document batches, monitors progress + inter-annotator agreement, exports the finished gold dataset.

## User stories (primary loop first)
1. As a Reviewer, I land directly on the next un-labeled back-reference, with the engine's best-guess antecedent **pre-selected**, so I confirm with one key.
2. As a Reviewer, when the guess is wrong, I pick the correct antecedent from a ranked candidate list — or, if not listed, from any earlier citation in the document.
3. As a Reviewer, for each candidate I see its **full citation text, party names, year, and where it sits in the document**, plus *why the engine guessed* (confidence + any warning like "two same-name authorities").
4. As a Reviewer, I read the **sentence/paragraph around the back-reference** without losing my place, expandable on demand.
5. As a Reviewer, I can mark **abstain**, **ambiguous**, or **flag-with-note** and jump to the next — all keyboard-driven.
6. As a Reviewer, I can revisit/change any prior label; progress autosaves and resumes across sessions.
7. As a Reviewer, I see progress ("37 / 120 in this batch").
8. As an Adjudicator, I see a queue of disagreements/flags with both reviewers' choices + the engine's guess, and record the gold answer + rationale.
9. As a Maintainer, I create a batch, assign it (optionally double-annotated), watch completion + agreement (κ), and export gold labels.

## What's on screen
- The **document text** with every back-reference marked and the **current one focused**; immediate context emphasized.
- A **candidate panel**: each candidate as a card — full text, parties, year, position-in-doc indicator, the engine's pick marked + its **confidence** and any **warning**; buried/aside citations visually distinguished.
- **Decision controls**: Confirm · Pick · Abstain · Ambiguous · Flag (+note), keyboard-shortcutted; Confirm is most prominent + default.
- **Progress + navigation**: position in batch, next/prev, jump to flagged.

## Workflow & states
Per item: `pre-filled guess → reviewer action → persisted → advance`. A back-reference is `unlabeled → labeled (by N reviewers) → adjudicated (gold)`. Save/resume, batches, configurable single vs. double annotation with adjudication.

## UX principles — "reviewer-friendly"
- **Machine proposes, human disposes** — optimize for guess-is-right (one keystroke); corrections near-instant.
- **Keyboard-first** — rarely touch the mouse; hundreds per session.
- **Earned trust through transparency** — show *why* the engine guessed (confidence, candidate ranking, warnings).
- **Context without overwhelm** — enough text to decide; progressive disclosure for more.
- **Forgiving** — trivial to change a past label; flag-and-move-on so one hard item never blocks the batch.
- **Calm density** — information-dense but low-fatigue (clear focus, restrained color, legible legal typography).

## Data shapes (the contract between backend and frontend)
**Per document (input):** `{ id, source: "ocr"|"native", court, year, text, citations: [{ id, kind: "full"|"id"|"supra", span:[start,end], displayText, parties?, year? }], backrefs: [{ id, span, kind, engineGuess: citationId|null, candidates: [{ citationId, rank, confidence, isBuriedAside, why }], engineWarning? }] }`
**Per label (output):** `{ backrefId, decision: { type: "antecedent"|"abstain"|"ambiguous"|"flag", citationId? }, annotatorId, agreedWithEngine: bool, note?, createdAt }`

## Technical context
Local, **dockerized via compose**: React/TS frontend + an API backend + **Postgres**. The corpus is sourced read-only from the CourtListener replica; the eyecite-ts engine pre-computes each back-reference's guess + candidates into Postgres before annotation. The external design pass owns the **frontend UX**; this repo owns the backend, DB, engine integration, and contract. Desktop-first, keyboard-centric; no public/SSO auth for v1 (small trusted team, run locally).

## Non-goals (v1)
- Not a citation-*extraction* editor — humans label antecedent *links*, not what counts as a citation (one "this isn't really a citation" flag is the exception).
- Not crowd/public scale — a handful of expert annotators.
- Not the ranker/calibration itself — this only produces the labels.

## Success criteria
- An expert confidently labels well over 100 back-references/hour, resumes anytime, rarely feels stuck.
- Disagreements surface cleanly for adjudication; agreement (κ) is measurable.
- Output is a clean, exportable **gold corpus of ~300–1,000 labeled back-references**, over-sampling the hard cases (nested parentheticals, same-name ambiguity).

## Open design questions (for the frontend pass)
- Single- vs. double-annotation default; prominence of the adjudication surface.
- Default amount of document context shown (clause? paragraph? collapsible full doc?).
- How to rank/scan many candidates; how to represent "buried/aside" candidates.
- The exact keyboard scheme for confirm/correct/abstain/ambiguous/flag.

## Baked-in assumptions (revisit if wrong)
Small **expert** annotator team (not crowd); **pre-fill-and-confirm** core interaction; **double-annotation + adjudication** available but optional; **~300–1,000-case** target.
