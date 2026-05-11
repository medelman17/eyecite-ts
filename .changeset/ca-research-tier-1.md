---
"eyecite-ts": patch
---

fix: California research Tier 1 — 8 procedural prefixes, 7 history signals, `(in bank)` disposition

Synthesis of a six-agent research dispatch that audited California Style Manual citation forms across all practice disciplines (CSM core + appellate practice, family/probate/dependency, administrative agencies, criminal + bar, tax + business + employment, environmental + land use + specialty). Six research docs land alongside this change at `docs/research/2026-05-11-ca-style-*.md`.

This PR implements the **Tier 1 mechanical additions** — items where the existing parser infrastructure can absorb the change with a regex edit or table entry. Bigger structural items (CSM year-first format from #19, `Cal. Daily Op. Serv.` tokenization, slip-op-with-docket pattern, agency-decision citation type, `¶ N` paragraph pincite) are flagged in the research docs for follow-on work.

### Procedural prefix additions (8)

- `Conservatorship of the Person and Estate of` — longest first; CA combined form
- `Conservatorship of the Person of` — CA Probate
- `Conservatorship of the Estate of` — CA Probate
- `In re Conservatorship of` — precision upgrade
- `In re Guardianship of` — precision upgrade
- `In re Adoption of` — precision upgrade (e.g., `In re Adoption of Kelsey S.`)
- `Inquiry Concerning Judge` — Commission on Judicial Performance discipline captions (e.g., `Inquiry Concerning Judge Saucedo, 2 Cal. 4th CJP Supp. 33`)
- `Appeal of` — Office of Tax Appeals (OTA) and predecessor BOE captions (e.g., `Appeal of Jali, LLC`)

### `HistorySignal` additions (6)

- `not_published` — depublication: `ordered not pub.`, `nonpub. opn.`, `not for publication`
- `petition_for_review_filed` / `_granted` / `_denied` — CA Supreme Court petition-for-review status (parallels federal cert. denied/granted)
- `superseded_by_grant_of_review` — pre-2019 CA depublication-on-review rule
- `modified_on_denial_of_rehearing` — common CA post-judgment modification signal

### Disposition addition

- `in bank` — California Supreme Court's en-banc equivalent. Anchored at content end so it doesn't trip on `dissenting from denial of rehearing in bank` (same defense applied to `en banc` in #235).

### Tests

16 new regression tests + 2 regression controls confirming `(en banc)` still maps to `en banc` (not `in bank`) and the prior `review denied` signal (from #238) is unaffected.
