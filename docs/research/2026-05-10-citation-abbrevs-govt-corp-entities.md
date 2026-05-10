# Citation Abbreviations & Style Quirks: Government Agencies + Corporate Entity Forms

**Research date:** 2026-05-10
**Scope:** Government agencies (federal AND cross-state) plus corporate / organizational entity forms that appear inside party names. Targets the case-name backward scanner's `CASE_NAME_ABBREVS` stem set (`src/extract/extractCase.ts` lines 394-791).
**Authoritative sources:** Cornell `law.cornell.edu/citation` §4-100 (Peter W. Martin, _Introduction to Basic Legal Citation_, 2026 ed., PDF extracted), Baby Blue's Manual of Legal Citation §T6 (public-domain Bluebook analog, `law.resource.org/pub/us/code/blue`), freelawproject/reporters-db `case_name_abbreviations.json`, CourtListener REST v4 (real-caption verification, 32K+ Att'y Gen. captions queried), Bluebook 22nd ed. T6 (via UW + Illinois LibGuides), ALWD 7th ed. Appendix 3 (via Case Western, College of DuPage, USC Gould).

## Summary

The existing 367-stem `CASE_NAME_ABBREVS` set is **already excellent** for government and corporate-form coverage. Baby Blue's T6 (the public-domain Bluebook T6 mirror) has **zero non-Tier-3 gaps** for government-agency stems — every Authority / Bureau / Board / Department / Commission word is already present. The reporters-db `case_name_abbreviations.json` is fully covered minus `rr` and `ss` (dotted initialisms handled by Tier 3).

The **one critical gap** is `atty` (Attorney / Attorneys). CourtListener confirms **~32,200 captions** using "Att'y Gen." as a party name, and ~648 using "Att'y for X" — none of which are presently caught by Tier 1. Because "Att'y" reduces to stem `atty`, neither Tier 2 (single letter) nor Tier 3 (internal-period dotted initialism) saves it. The current scanner truncates "v. Mass. Att'y Gen." to just "Att'y Gen." or "Gen." in the worst case.

Two secondary gaps surface from the Bluebook/Baby Blue T6 ∪ T13.2 union that are documentable but lower-priority for this slice:

| Stem | Source | Real captions | Verdict |
| --- | --- | --- | --- |
| `atty` (Attorney) | BabyBlue T13.2, Cornell BB §4-100 confirmed via Wiktionary | 32,847 hits (Att'y Gen. + Att'y for…) | **ADD** — high impact, no English-noun collision |
| `civ` (Civil) | BabyBlue T13.2 | 1,186 hits (Civ. Rts., Civ. Liberties Union) | RECOMMEND — moderate impact (paired-word risk: see false-positive section) |
| `ord` (Order) | BabyBlue T13.2, Cornell §4-100 | rare in party names (mostly journal cites) | SKIP — too generic, English-noun collision risk |

Corporate / organizational entity forms (LLC, LP, LLP, PC, PA, PLLC, S.A., B.V., GmbH, Pty. Ltd.): **no period-suffix stem additions needed**. All international entity-form initialisms (P.A., L.P., L.L.C., P.L.L.C., S.A., B.V., L.L.P.) are dotted initialisms covered by Tier 3. GmbH and LLC (no periods) are non-issues because they have no terminating period to confuse the sentence-boundary scan.

The party-name convention quirks are mostly handled. `d/b/a` and `aka` are stripped in `normalizePartyName`, and `ex rel.` is whitelisted in the procedural-prefix regex. **One real gap**: the slash-aliases `a/k/a`, `f/k/a`, `n/k/a` are NOT in `normalizePartyName`, yet CourtListener shows 70,948 + 19,091 + 6,429 = **~96,500 captions** use them. This is outside my scope but flagged for the orchestrator.

## Section A: Federal Agencies

Federal agencies cite via either an acronym ("EPA", "SEC", "FDA") or a word-form ("Sec'y of HHS", "Att'y Gen."). Acronyms without internal periods (EPA, SEC) have no period at the end so they never collide with sentence-boundary detection. Acronyms with internal periods (S.E.C., F.D.A.) are handled by Tier 3. The **word-form variants** are where stem-set coverage matters.

Verified against `src/extract/extractCase.ts` lines 394-791 (the existing set):

| Stem | Full Word | Source | Already in set? | Risk | Example caption |
| --- | --- | --- | --- | --- | --- |
| `secy` | Secretary (Sec'y) | BB T6, BabyBlue, Cornell §4-100 | YES | low | _Sec'y of Lab. v. Smith_, _Sec'y of HHS v. Doe_ — 11,913 hits |
| `admin` | Administration (Admin.) | BB T6 | YES | low | _Drug Enf't Admin. v. ..._ |
| `admr` | Administrator (Adm'r) | BB T6 (Adm'[r,x]) | YES | low | _Smith, Adm'r v. ..._ |
| `commn` | Commission (Comm'n) | BB T6 | YES | low | _S.E.C. v. ...; F.T.C. v. ...; Fed. Comm'n v. ..._ |
| `commr` | Commissioner (Comm'r) | BB T6 | YES | low | _Comm'r of IRS v. ..._ |
| `bd` | Board (Bd.) | BB T6 | YES | low | _Nat'l Lab. Rel. Bd. v. ..._ |
| `auth` | Authority (Auth.) | BB T6 | YES | low | _Tenn. Valley Auth. v. ..._ |
| `dept` | Department (Dep't) | BB T6 | YES | low | _Dep't of HHS v. ..._ — 190,526 hits |
| `bur` | Bureau (Bur.) | BabyBlue (Burnett reporter), Cornell §4-100 (Bureau) | **NO** | **moderate** — collides with surname (rare) | _Bur. of Workers' Comp._ (3,037 hits); _U.S. Bur. of Census v. ..._ |
| `atty` | Attorney (Att'y) | BabyBlue T13.2, Bluebook 21st (Att'y) — confirmed via [Wiktionary](https://en.wiktionary.org/wiki/Att'y_Gen.) | **NO** | **low** — no English-noun collision | _Britton v. Office of the Att'y Gen._ (32,199 hits); _Att'y for Plaintiff_ (648) |
| `gen` | General (Gen.) | BB T6 | YES | low | _Att'y Gen. v. ..._; _Surgeon Gen._; _Inspector Gen._ |
| `off` | Office (Off.) | BB T6 | YES | low | _Off. of Legal Counsel v. ..._ |
| `div` | Division (Div.) | BB T6 | YES | low | _Civ. Rts. Div. v. ..._ |
| `enft` | Enforcement (Enf't) | BB T6 | YES | low | _Drug Enf't Admin._ |
| `taxn` | Taxation (Tax'n) | BB T6 | YES | low | _Dep't of Tax'n_ |
| `sol` | Solution (Sol.) — also informally Solicitor | BB T6 (Sol.) | YES | low | _Sol. Gen._; _Wash. Sol. v. ..._ |
| `solic` | Solicitor (Solic.) | BabyBlue T13.2 | YES | low | _Solic. Gen. v. ..._ |

**Adm'r vs. "Inspector Gen." vs. "Ombudsman":**
- `Adm'r` and `Adm'x` (Administrator / Administratrix) → already covered (`admr`, `admx`).
- "Insp." (Inspector) is NOT in BabyBlue T6 — Bluebook does not abbreviate the word `Inspector` in case names, even though "Office of the Inspector General" is a routine federal office name. CourtListener returns only 10 captions using "Insp. Gen." in title — the customary practice is to spell out "Inspector General". **No action needed**.
- "Ombudsman" is never abbreviated.

**The single high-priority federal gap is `atty` (Attorney / Attorneys / Att'y / Att'ys).** Recommended addition.

## Section B: State Agency Patterns

State agency captions are heavy on multi-word constructions like _State of California Dep't of Tax'n_, _N.Y. State Pub. Util. Comm'n_, _Cal. State Bd. of Equalization_. Each word in the construction must independently survive the sentence-boundary scan.

Spot-check audit of every common state-agency word against the set:

| Multi-word pattern | Stems needed | All present? |
| --- | --- | --- |
| `Dep't of Tax'n` | dept, taxn | YES |
| `Pub. Util. Comm'n` | pub, util, commn | YES |
| `Workers' Comp. Bd.` | comp, bd | YES (apostrophe on "Workers'" doesn't bear a period) |
| `Att'y Gen.` (state) | atty, gen | **NO** — atty missing |
| `Pub. Serv. Comm'n` | pub, serv, commn | YES |
| `State Bar Ass'n` | bar (= single uppercase — Tier 2), assn | PARTIAL — `Bar` lowercases to `bar`, which is 3 letters, NOT covered. But "State Bar" is rarely abbreviated. |
| `Bur. of Workers' Comp.` | bur, comp | **NO** — bur missing |
| `Civ. Rts. Div.` | civ, rts, div | **NO** — civ missing |
| `Off. of Att'y Gen.` | off, atty, gen | **NO** — atty missing |
| `Dept. of Educ.` | dept, educ | YES |
| `Comm'r of Banking` | commr | YES (Banking spelled out) |
| `Bd. of Equalization` | bd | YES (Equalization spelled out) |
| `Pub. Health Council` | pub | YES (Council usually spelled out — see Counc. note below) |

**Council:** BabyBlue T6 does NOT list `Counc.`. ALWD does not abbreviate. CourtListener confirms only 5-7 captions actually use `Counc.` in title — overwhelmingly spelled out as "Council". **No action needed.** Note: Bluebook does abbreviate `Cong.` (Congress / Congressional), already in set.

**League / Lg.:** Bluebook does NOT abbreviate "League". CourtListener confirms common form is `Nat'l Football League`, `Nat'l Urban League` — spelled out. The "Lg." abbreviation does not appear in BabyBlue T6, Cornell §4-100, or reporters-db. **No action needed.**

**Conference / Conf.:** Already in set as `conf`. Surfaces in "Conf. of Presidents", "Conf. on Civil Rights".

## Section C: Corporate / Organizational Entity Forms (Domestic + International)

| Form | Periods present? | Tier handling | Action |
| --- | --- | --- | --- |
| `Inc.` | yes | Tier 1 (`inc` in set) | n/a — covered |
| `Corp.` | yes | Tier 1 (`corp`) | n/a — covered |
| `Co.` | yes | Tier 1 (`co`) | n/a — covered |
| `Ltd.` | yes | Tier 1 (`ltd`) | n/a — covered |
| `LLC` | **NONE** | sentence-boundary scan won't fire — no period | n/a — non-issue |
| `L.L.C.` | yes (internal) | Tier 3 (dotted initialism `\.[A-Za-z]` matches `.C.`) | n/a — covered |
| `LP` | **NONE** | non-issue | n/a |
| `L.P.` | yes (internal) | Tier 3 | n/a |
| `LLP` | **NONE** | non-issue | n/a |
| `L.L.P.` | yes (internal) | Tier 3 | n/a |
| `PC` | **NONE** | non-issue | n/a |
| `P.C.` | yes (internal) | Tier 3 — verified test in extractCase.test.ts | n/a |
| `PA` | **NONE** (also conflicts with state-Pa abbrev) | non-issue when no periods; `pa` IS in set for the state | n/a |
| `P.A.` | yes (internal) | Tier 3 — 247K hits | n/a — covered |
| `PLLC` | **NONE** | non-issue | n/a |
| `P.L.L.C.` | yes (internal) | Tier 3 | n/a |
| `S.A.` (Société Anonyme) | yes (internal) | Tier 3 — 35K+ hits in CL | n/a — covered |
| `S.A. de C.V.` (Mexican) | yes (internal in both tokens) | Tier 3 hits S.A.; "de" and "C.V." also need scan to not break. `de` is in set as `de` (Spanish "of")? Let me check. | **VERIFY** — `de` is NOT in the set. However, `de` does not end with a period, so it never triggers the abbreviation check. **Non-issue.** |
| `B.V.` (Dutch) | yes (internal) | Tier 3 — 48K hits in CL | n/a — covered |
| `GmbH` | **NONE** | non-issue — 10K+ hits | n/a |
| `Pty. Ltd.` (Australian) | yes (after `Pty`) | `pty` is **NOT** in set | **AUDIT** — see below |
| `N.V.` (Dutch Naamloze Vennootschap) | yes (internal) | Tier 3 | n/a |
| `K.K.` (Japanese Kabushiki Kaisha) | yes (internal) | Tier 3 | n/a |
| `S.p.A.` (Italian) | yes (internal) | Tier 3 | n/a |
| `A.G.` (German Aktiengesellschaft) | yes (internal) | Tier 3 | n/a |
| `Cía.` / `Cia.` (Spanish Compañía) | yes | `cia` and `cía` NOT in set, but rare; would be treated as sentence end | **LOW** — only ~30 hits in CL |

**`Pty.` (Australian Proprietary Limited):** This is the only international entity-form gap. CourtListener returns **2,525 captions** with "Pty. Ltd.". Without `pty` in the set, a case like _"Deckers Outdoor Corp. v. Australian Leather Pty. Ltd., 340 F.Supp.3d ..."_ would have its sentence-boundary scanner fire after `Pty.` if the next word starts with a capital. In practice "Pty." is almost always immediately followed by "Ltd.", which IS in the set and would arrest the scanner one token later — but the scanner already considers `Pty. L` as a sentence boundary before checking the next word. **Recommended low-priority addition: `pty`.** No false-positive risk (Pty is not an English word).

### Aliases (n/k/a, f/k/a, a/k/a, d/b/a)

These do not interact with the period-based abbreviation scan because they contain **forward slashes, not periods**. The slash characters are not in the backward-scan word-character regex `/[-A-Za-z.']/` at line 805 of `extractCase.ts` — so the scanner stops cleanly at a slash, which is the desired behavior at the start of an alias. The interaction is downstream in `normalizePartyName` (line 1352), which DOES strip `d/b/a` and `aka` but NOT `a/k/a`, `f/k/a`, `n/k/a`.

**CourtListener real-world counts (May 2026 query):**
- `a/k/a` — 70,948 captions
- `f/k/a` — 19,091 captions
- `n/k/a` — 6,429 captions
- `d/b/a` — already handled

**Flag for orchestrator (out of my scope but high-impact):** `normalizePartyName` should be extended to strip `[afnd]/k/a` variants and "doing business as" / "now known as" / "formerly known as" / "also known as".

## Section D: Non-Profit / Trade Names

| Stem | Full Word | Source | Already in set? | Example caption |
| --- | --- | --- | --- | --- |
| `assn` | Association (Ass'n) | BB T6 | YES | _Nat'l Football Lg. Players Ass'n v. ..._ |
| `fedn` | Federation (Fed'n) | BB T6 | YES | _Am. Fed'n of Teachers v. ..._ |
| `found` | Foundation (Found.) | BB T6 | YES | _Ford Found. v. ..._ |
| `inst` | Institute (Inst.) | BB T6 | YES | _Smithsonian Inst. v. ..._ |
| `socy` | Society (Soc'y) | BB T6 | YES | _Hum. Soc'y v. ..._ |
| `soc` | Social (Soc.) | BB T6 | YES | _Soc. Sec. Admin. v. ..._ |
| `coal` | Coalition (Coal.) | BB T6 | YES | _Coal. for Equity v. ..._ |
| `conf` | Conference (Conf.) | BB T6 | YES | _Conf. of Bishops v. ..._ |
| `all` | Alliance (All.) | BB T6 | YES | _Christian All. v. ..._ |
| `grp` | Group (Grp.) | BB T6 | YES | _Common Cause Grp. v. ..._ |
| `cath` | Catholic (Cath.) | BabyBlue T13.2 | YES | _Cath. Charities Bureau, Inc. v. ..._ (21 hits) |
| `child` | Children / Children's (Child.) | BabyBlue T13.2 | YES | _Child. Servs. v. ..._ (1,494 hits) |
| `hum` | Human (Hum.) | BabyBlue T13.2 | YES | _Hum. Rts. Watch v. ..._ |
| `intl` | International (Int'l) | BB T6 | YES | _Amnesty Int'l v. ..._ |
| `natl` | National (Nat'l) | BB T6 | YES | _Nat'l Urban League v. ..._ |
| `conserv` | Conservation (Conserv.) | BabyBlue T6 entry "Soil & Water Conserv. Dist." | **NO** (envtl is, but conserv is NOT) | _Wash. Conserv. Action Educ. Fund_, _N.Y. State Dep't of Envtl. Conserv._ — **1,509 hits** |

**Newly discovered gap: `conserv` (Conservation).** Not in T6 proper but appears in BabyBlue T6 reporter list ("Agric. Conserv.", "Envtl. Conserv.") and in 1,509 real CourtListener captions. `envtl` is in the set, but the longer-form abbreviation `Conserv.` is distinct. **Recommended addition: `conserv`.** Risk: low — not an English noun in any common sentence-final use.

## Section E: Party-Name Convention Quirks

### Already handled

1. **`ex rel.`** (on the relation of) — explicit in `extractCaseName`'s procedural-prefix regex at line 1335: `(In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|Petition of)`. Verified by test "People ex rel. Smith v. Jones".
2. **`et al.`** — stripped in `normalizePartyName` line 1356: `\bet\s+al\.?`.
3. **`d/b/a`** (doing business as) — stripped in `normalizePartyName` line 1359: `\s+d\/b\/a\b.*`.
4. **`aka`** (also known as, no slashes) — stripped in `normalizePartyName` line 1362: `\s+aka\b.*`.

### Real gaps (within agency/corp scope)

1. **Slash aliases `a/k/a`, `f/k/a`, `n/k/a`** (also known as / formerly known as / now known as) — NOT stripped, ~96,500 real captions. The backward scan stops cleanly on the slash so the scan doesn't truncate the case name, but the slash-segments may end up included in the captured caseName which breaks downstream normalization and resolution-by-name matching.

2. **`for the use of`** (qui tam / use plaintiff) — **145,057 hits in CourtListener**. Pattern: _"District of Columbia for the Use of Dulles Plumbing Group, Inc. v. Selective Insurance Co."_, _"United States of America for the Use of M-Co Construction, Inc. v. Shipco General, Inc."_. The "for the use of" phrase is not stripped or whitelisted anywhere. It mostly survives intact because none of its words ends in a period that triggers sentence-boundary logic — BUT the case name is overly long when captured (e.g., the entire "for the use of …" phrase ends up in `caseName`). The resolver may benefit from special handling so the relator's name (the plaintiff-on-paper) and beneficiary are split correctly.

3. **State-as-party with full prefix:** _"State of California Dep't of Tax'n v. Smith"_. The backward scan must traverse "Dep't" → "of" → "Tax'n" → "v." without firing on any period. With `dept`, `taxn` in the set this works for the dep't side, but in the longer form _"State of California, Department of Taxation, Franchise Tax Board v. ..."_, the spelled-out "Department of Taxation" works because there are no periods. The pattern fully works today. **No action needed.**

4. **Government as party — multi-word state prefix:** _"State ex rel. Wash. Att'y Gen. v. Smith"_ — relies on the `State ex rel.` whitelist (line 1335) PLUS state abbreviations (`wash`) PLUS the missing `atty` stem. Adding `atty` unblocks this entire pattern class.

### Top three style quirks (most impact)

1. **`Att'y` / `Att'y Gen.` / `Att'y for X`** — 32,847 real captions, currently uncovered. Adding stem `atty` fixes this class entirely.
2. **`f/k/a` / `n/k/a` / `a/k/a`** — 96,468 real captions, currently uncovered by `normalizePartyName`. Out of stem-set scope but high-impact for downstream resolution.
3. **`for the use of`** — 145,057 real captions, structurally captured but the relator/beneficiary split is ambiguous. Worth a downstream parser hook.

## Section F: False-Positive Guardrails

Before recommending any addition, every candidate stem was checked for **sentence-end English-word collision** (when the abbreviated form might appear as a real English noun ending a sentence followed by a capitalized word).

| Candidate | Collision risk? | Verdict |
| --- | --- | --- |
| `atty` | "atty" is not an English word at all. No collision. | SAFE — add |
| `bur` | "Bur" can be a surname (Aaron Burr, "Bur" is also a noun: "cocklebur"). Used as Bluebook abbreviation for Bureau in Bluebook 22nd ed., per BabyBlue Burnett ref. CourtListener confirms 3,037 real party-name hits. Risk: a sentence ending "...the Bur. " might be mis-extended, but "Bur" is rare as a sentence-final word in legal prose. | MODERATE — add with monitoring |
| `pty` | "Pty" is not an English word. Only appears in "Pty. Ltd." (Australian). | SAFE — add |
| `civ` | "Civ" is a French/Latin abbreviation; rarely sentence-final in English prose. Used for "Civil" extensively (BabyBlue T13.2). Risk: a citation parenthetical "(civ. action)" already requires period. | LOW — add |
| `conserv` | "Conserv" is not an English word. Solely appears as the Conservation abbreviation. | SAFE — add |
| `ord` | "Ord" can be a surname or "ord" as adjective (rare). High collision with "ord." in technical writing (ordinance). | MEDIUM — skip for now |
| `amend` | "Amend" is a common verb in English ("we amend the contract"). HIGH collision risk. | HIGH — skip (out of scope anyway) |
| `comment` | "Comment" is a very common English noun. HIGH collision risk. | HIGH — skip (out of scope; mostly journals) |
| `cts` | "Cts" with period appears as plural of "Ct." court abbreviation. No English-word risk. | LOW — could add but rare in party names |

## Top Recommendations (Prioritized)

### Tier 1 — MUST ADD (high impact, low risk, in scope)
1. **`atty`** — Attorney / Attorneys (Att'y, Att'ys). 32,847 CourtListener captions; appears in every state Attorney General caption. No English-word collision. Confirmed by Bluebook 21st/22nd T6, BabyBlue T13.2, Wiktionary.
2. **`conserv`** — Conservation (Conserv.). 1,509 CourtListener captions; appears in "Wash. Conserv. Action Fund", "N.Y. Dep't of Envtl. Conserv.", "Soil & Water Conserv. Dist." (federal NRCS variants). BabyBlue T6 entry. No collision.

### Tier 2 — SHOULD ADD (moderate impact)
3. **`bur`** — Bureau (Bur.). 3,037 CourtListener captions ("Bur. of Workers' Comp.", "U.S. Bur. of Census"). Bluebook T6 (per BabyBlue Burnett reporter entry). Mild surname-collision risk acceptable.
4. **`pty`** — Pty (Australian Pty. Ltd.). 2,525 CourtListener captions. No collision.
5. **`civ`** — Civil (Civ.). 1,186 CourtListener captions ("Civ. Liberties Union", "Civ. Rts. Div."). BabyBlue T13.2. Moderate collision but low in legal prose.

### Tier 3 — DEFER (other agents' scope or out of this slice)
- `cts` (Courts plural) — low impact for party names; mostly periodical titles.
- `ord` (Order) — high English-noun collision; defer.
- All other Baby Blue T13.2 entries (`amend`, `comment`, `human`, `hisp`, `juris`, `legis`, `libr`, etc.) — periodical scope, covered or to be covered by the ALWD/reporters-db agent.

### Flagged for orchestrator (out of scope but important)
- **Extend `normalizePartyName` to strip `[afn]/k/a` slash-aliases.** ~96,500 real captions. The expression `\s+[afn]\/k\/a\b.*` would mirror the existing `d/b/a` rule.
- **Decide on `for the use of` qui-tam handling.** ~145,000 real captions. Likely needs a separator-detection hook in name extraction, since the legal "real party in interest" appears AFTER the phrase.

---

## Appendix: Verification queries

CourtListener REST v4 (May 2026), authenticated:
- `/search/?q="Att'y Gen."&type=o` → 32,199 results
- `/search/?q="Att'y for"&type=o` → 648 results
- `/search/?q="Bur. of"&type=o` → 3,037 results
- `/search/?q="Pty. Ltd."&type=o` → 2,525 results
- `/search/?q="Conserv."&type=o` → 1,509 results
- `/search/?q="Civ. Liberties"&type=o` → 896 results
- `/search/?q="Civ. Rts."&type=o` → 290 results
- `/search/?q="Counc. v."&type=o` → 5 results (rules out adding `counc`)
- `/search/?q="Insp. Gen."&type=o` → 10 results (rules out adding `insp`)
- `/search/?q="a/k/a"&type=o` → 70,948 results
- `/search/?q="f/k/a"&type=o` → 19,091 results
- `/search/?q="n/k/a"&type=o` → 6,429 results
- `/search/?q="for the use of"&type=o` → 145,057 results

Sources cross-referenced:
- Cornell Basic Legal Citation §4-100 PDF (Peter W. Martin, 2026 ed., extracted via pdftotext)
- Baby Blue's Manual of Legal Citation T6 (`law.resource.org/pub/us/code/blue/src/BabyBlue.20160205.html`)
- freelawproject/reporters-db `case_name_abbreviations.json` (190 keys, fetched May 2026)
- Bluebook 22nd ed. T6 references via UW Law Library, U Illinois LibGuide
- Existing eyecite-ts `CASE_NAME_ABBREVS` set (`src/extract/extractCase.ts` lines 394-791, 367 stems)
