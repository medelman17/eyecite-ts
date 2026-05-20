---
name: 2026-05-10 issue triage + parser improvements handoff
description: Briefing for the next agent who will triage the 20 newly-filed parser-improvement issues and start landing fixes.
---

# Session Handoff: Issue Triage + Parser Improvements

**Created:** 2026-05-10 20:00
**Branch:** main (synced; just merged PR #227)
**Previous handoff:** none

## Goal

Hand off a clean slate to the next agent. They will triage 20 newly-filed parser-improvement GitHub issues (#228–247) and start implementing fixes. The previous session completed a large case-name abbreviation expansion (PR #227, merged); the issues are everything *else* the cross-jurisdictional research surfaced.

## Current State

- **Branch:** `main`, up to date with origin. `v0.13.1` tag just landed.
- **Open PRs:** **#248** — changesets bot's "chore: version packages" PR consolidating the 5 patch bumps from PR #227. Worth verifying it's clean and then merging when ready.
- **Open issues filed by the prior session:** 20 (#228–247), all labeled `enhancement,extraction,claude`. Plus cross-reference comments on three pre-existing issues: **#13** (`infra` support), **#19** (CA date-first format), **#204** (paragraph pincites).
- **Untracked files in working tree** (carry-overs from before, NOT this session's work — leave alone): `.agents/`, `.codex/`, `AGENTS.md`, `citation-diagram.html`, `docs/superpowers/{plans,specs}/`, `issue-drafts/`.

### Completed (compressed)

- [x] **PR #227 merged** — case-name lookback abbreviation expansion. 5 squashed commits → +68 stems, 28 synthetic tests + 34 corpus-sourced real-world tests, 5 changesets, 16 research reports in `docs/research/`.
- [x] **20 GH issues filed** (#228–247) — one per parser-improvement target identified in the audit.
- [x] **Cross-reference comments** added to #13, #19, #204 linking them to the audit's recommended approach.
- [x] **Parser-improvement roadmap** retained as `docs/research/2026-05-10-citation-style-quirks.md` (~970 lines, 10 numbered sections + lettered remediation proposals A–N + 20 failing-test fixtures).

### In Progress (full detail)

**Nothing.** The next agent picks up from a clean main.

### Not Started (pointers only — see issues for full detail)

The 20 new issues fall into clusters. Suggested triage priority below; full self-contained problem statements with failing inputs and proposed fixes live in each issue body.

## Key Decisions Made

1. **Bug-fix branch convention:** every fix lands on a feature branch (`fix/<short-slug>`), gets a changeset (`pnpm changeset`), and lands via PR. **Never commit directly to main.**
2. **Test pattern:** synthetic tests with `extractCitations(text)` → `find(c => c.type === "case")` → `expect(caseCite.caseName).toBe(...)`. See `tests/extract/extractCase.test.ts` and `tests/extract/realWorldCaptions.test.ts` for patterns.
3. **Corpus-sourced regression tests:** preferred over synthetic when possible. The Harvard CAP corpus is available locally (organized by reporter dir → volume zips → JSON per opinion). Mining script template in this session's transcript (search "mine_v3.py" / "mine_v4.py" if needed); produced `tests/extract/realWorldCaptions.test.ts`.
4. **PR title/body convention:** "fix: ..." or "feat: ..." or "test: ..." prefix. Body has a `## Summary` and `## Test plan` section. Always sign with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
5. **No client / firm names in any committed artifact** (PR, issue, changeset, commit message, source file, doc). This includes the case-law corpus path — if mining, reference it generically.
6. **The pincite parser refactor (audit §A) unblocks several issues.** Doing it first is the cheapest path to fixing #204 (paragraph pincites), #236 (CSM at p./pp.), #247 (multiple discrete pincites), and parts of #13 (infra).

## Failed Approaches & Gotchas

- **Some abbreviation stems added in PR #227 don't have corpus evidence in case-name position** (`coun`, `discipl`, `civ`, `vet`, `petr`, `respt`, etc.). Real captions either spell the word out (`Council`, `Disciplinary`) or use the abbreviation only in court designations / reporter abbreviations (`Tex. Civ. App.`, `Vet. App.`). The stems were added defensively based on style-manual research; they don't hurt because they don't collide with English sentence-end words.
- **Synthetic captions with parenthesized middle tokens trip the case-name scanner.** Example: `"Amaya Grp. Hldgs. (IOM) Ltd. v. Smith"` extracts as `"Ltd. v. Smith"` because `(IOM)` is treated as a court parenthetical and resets the lookback. Avoid embedding parentheticals in test inputs unless that's what you're testing.
- **Corpus uses Unicode curly apostrophe `'` (U+2019), not ASCII `'`.** Mining regexes must use `['’‘]` character class. Synthetic test captions for the codebase should use ASCII apostrophe — eyecite-ts already normalizes both via `[]+→stem` stripping.
- **Some "deferred" stems** (`supers`, `vol`, `retire`, `lic`) had **zero corpus matches** even after a wide sweep because the abbreviated form is rare in published opinions. They're covered by synthetic tests; their inclusion in `CASE_NAME_ABBREVS` is defensible regardless.
- **Pre-existing diagnostic noise:** the LSP reports `Cannot find module '@/index'` errors in `tests/extract/extractCase.test.ts` and the new `realWorldCaptions.test.ts`. This is LSP-side only; `pnpm typecheck` is clean. Ignore those diagnostics.
- **Pre-existing TS6133 unused-var diagnostic** on `metaParenFromToken` in `src/extract/extractCase.ts`. Not introduced by recent work. Address if convenient.

## Critical File Locations

- **Case-name abbreviation set:** `src/extract/extractCase.ts:394-863` (`CASE_NAME_ABBREVS`). 3-tier matching logic at `isLikelyAbbreviationPeriod` (~line 870–910).
- **Pincite parsing:** `src/extract/extractCase.ts` (search for `PINCITE_REGEX`, `LOOKAHEAD_PINCITE_REGEX`, `parsePincite`, `PinciteInfo`). The roadmap proposes a grammar refactor here.
- **Citation patterns:** `src/patterns/` — particularly `casePatterns.state-vendor-neutral` (referenced by #233 hyphenated neutral cites and #230 multi-word neutral courts).
- **Short-form patterns:** `src/extract/extractShortForms.ts`, `src/resolve/` (for #13 infra, #204 paragraph pincites).
- **Signal table:** `src/extract/extractCase.ts:SIGNAL_TABLE` (referenced by #229 TX writ history, #238 CA review denied, #239 combined signals).
- **Parenthetical parsing:** `src/extract/extractCase.ts:parseParenthetical` (referenced by #232 LA slash-dates, #235 justice attribution, #229 TX em-dash + bracket).
- **Procedural prefix regex:** `src/extract/extractCase.ts:PROCEDURAL_PREFIX_REGEX` (referenced by #242 procedural prefix expansion, #244 BIA `Matter of A-B-`).
- **Normalize party name (slash-aliases):** `src/extract/extractCase.ts:normalizePartyName` around line 1352 (referenced by #240).
- **Tests:** `tests/extract/extractCase.test.ts` (main), `tests/extract/realWorldCaptions.test.ts` (corpus-sourced).
- **Audit / roadmap doc:** `docs/research/2026-05-10-citation-style-quirks.md` — 10 numbered sections + lettered remediation proposals A–N + 20 failing-test fixtures.
- **Regional research docs:** `docs/research/2026-05-10-citation-abbrevs-{ny-nj,pa-de-md-dc-wv,new-england,ca,tx-ok,southeast,deep-south,great-lakes,plains-upper-midwest,western-pacific,federal-courts,federal-specialty,govt-corp-entities,alwd-reporters-db,foreign-tribal-territorial}.md`.

## Environment State

- Node 22 (CI also tests 18 + 20)
- pnpm 10 via corepack
- Working tree clean of *our* work; pre-existing untracked files listed above
- `pnpm test` baseline: **1922 tests passing**, 9 skipped (post-merge from #227)
- `pnpm typecheck` clean
- `pnpm lint` has 163 pre-existing warnings (no errors) — not blocking

## Next Steps (prioritized)

### Step 1: Verify and merge #248

The changesets bot opened **PR #248** ("chore: version packages") consolidating the 5 patch changesets from #227. Verify it's clean (it should bump from `0.13.1` to `0.13.2`), then merge. This triggers the npm publish.

```bash
gh pr view 248
gh pr checks 248
gh pr merge 248 --squash --delete-branch
```

### Step 2: Triage the 20 new issues

Recommended priority tiers (titles abbreviated; see issues for full self-contained problem statements):

**Tier A — Quick wins, low risk, learn the codebase:**
- **#234** Reporter edition future-proofing (`F.5th`, `Cal.6th`) — small regex change, preventative. Good warm-up.
- **#242** Procedural prefix expansion (`Commonwealth ex rel.`, `In the Interest of`, etc.) — adds entries to one regex. Mechanical.
- **#239** Combined signals (`See, e.g.,`, `Compare ... with ...`) — adds to `VALID_SIGNALS`. Mechanical.
- **#238** CA `review denied/granted` history — adds to `SIGNAL_TABLE`. Mechanical.

**Tier B — High corpus impact:**
- **#240** Party-name slash-aliases (`d/b/a`, `f/k/a`, `n/k/a`, `a/k/a`) — flagged as **~96k corpus matches**. Single-file change in `normalizePartyName`. Highest-ROI fix.
- **#229** Texas writ/petition history inside court parenthetical — touches `SIGNAL_TABLE` and `parseParenthetical`. Adds ~13 entries; em-dash and nested-bracket court handling is the harder half.

**Tier C — Pincite parser refactor (audit §A):**
- **#204** Paragraph pincites `¶ N` — *the single highest-impact extraction gap*. Touches `PinciteInfo` to add `kind: "page" | "starPage" | "paragraph"` discriminator. Read the cross-reference comment I added.
- **#236** CSM `at p.` / `at pp.` pincites — same refactor unblocks this.
- **#247** Multiple discrete pincites (`410 U.S. 113, 115, 153`) — same refactor area.
- **#13** (pre-existing) `infra` short-form — partly same area; also needs a two-pass resolver model since `infra` points forward.

**Tier D — Multi-word / hyphenated neutral citations:**
- **#233** Hyphenated neutral cites (`2010-NMSC-007`, `2024-Ohio-764`) — extend `state-vendor-neutral` regex.
- **#230** Multi-word neutral court designations (`IL App (1st)`, `OK CIV APP`) — same regex area.
- **#231** NY Slip Op `(U)`/`[U]` markers — adjacent (NY uses brackets-around-page).

**Tier E — California Style Manual cluster** (consider doing together — they all rely on a "CSM mode" flag):
- **#19** (pre-existing) CA year-first format `(YYYY) vol Cal.Nth`
- **#237** CSM bracketed parallel `[266 Cal.Rptr. 569]`
- **#236** CSM `at p.` / `at pp.` (also Tier C)

**Tier F — Specialty / less-common:**
- **#228** State LEXIS variants
- **#232** Louisiana date-in-number format
- **#235** Justice-attribution parens
- **#241** Bankruptcy `(In re X)` admin parens
- **#244** BIA `Matter of A-B-` hyphenated initials
- **#243** ITC `Certain X` no-`v.` captions
- **#245** PTAB/ITC docket-form citations
- **#246** Multi-stage subsequent history chains

### Step 3: Pick one, branch, fix, PR

```bash
# Per issue, the convention is:
git checkout -b fix/<issue-slug>
# ... make changes, add tests ...
pnpm test
pnpm typecheck
pnpm changeset  # interactive — patch/minor/major + summary
git add <files>
git commit -m "..."  # with Co-Authored-By Claude footer (see prior commits for format)
git push -u origin <branch>
gh pr create --title "..." --body "..."  # link to the issue
```

The user explicitly required:
- **No client / firm names** in any committed artifact (PR, issue, changeset, commit, source, doc).

### Step 4: When clusters of related issues land

Consider whether to bundle related fixes into a single PR or split. The user previously preferred bundled when the changes share a refactor (e.g., the pincite parser refactor could land #204 + #236 + #247 in one PR). For independent fixes, separate PRs are cleaner.

## Linked Artifacts

- **PR #227** (merged): https://github.com/medelman17/eyecite-ts/pull/227 — the abbreviation expansion + research artifacts
- **PR #248** (open, awaiting merge): https://github.com/medelman17/eyecite-ts/pull/248 — version packages chore
- **Audit roadmap**: `docs/research/2026-05-10-citation-style-quirks.md`
- **Per-issue self-contained briefs**: each of #228–247 has a complete problem statement, failing inputs, expected behavior, proposed fix, and acceptance criteria. The next agent can pick any issue and start from its body alone.
- **Cross-reference comments on**: #13, #19, #204 (linking the audit's recommendations into pre-existing issues)
- **Project conventions**: `CLAUDE.md` at repo root

## Open Question for the Next Agent

The user's `/loop` / autonomous workflows weren't used in this session. If you want to batch-fix multiple Tier A issues in parallel, the `superpowers:dispatching-parallel-agents` skill works well for non-overlapping fixes (proven during the 16-agent research dispatch in this session). Each agent gets its own branch + PR.
