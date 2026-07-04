// apps/annotator/src/seed.ts
// Loads the four canonical hard-case opinions into the DB via the real eyecite-ts engine,
// sets up two annotators, one double-review batch, and demo labels for doc-hargrove.
// Idempotent: safe to re-run.

import { makeSql } from "./db.js"
import { buildDocumentPayload } from "./prefill.js"
import { upsertDocumentPayload, getDocumentPayload } from "./persist.js"

// ── Raw document texts (verbatim from design bundle) ──────────────────────────

const DOC1_TEXT =
  `¶ 12   The State first contends that the trial court erred in suppressing the evidence recovered from the vehicle. We review the grant of a motion to suppress de novo. Hogue v. State, 123 U.S. 1, 5 (2020) (quoting Corsello v. Verizon, 456 N.Y.2d 2, 9 (2010)). The constitutional question turns on whether the officer possessed reasonable suspicion at the moment of the stop. Id. at 7. A hunch, we have repeatedly held, will not suffice. Terrell v. Hawkins, 88 F.3d 410, 415 (9th Cir. 1996).

¶ 13   Two decisions frame the analysis. In Smith v. Jones, 200 F.3d 100 (9th Cir. 1999), the court held that an anonymous tip, standing alone, cannot supply reasonable suspicion. The following term, a different panel reached the opposite result on materially distinguishable facts. Smith v. Allstate Insurance Co., 305 F.3d 55, 61 (2d Cir. 2002). The State leans on the latter, but Smith, supra, at 110, forecloses its argument.

¶ 14   Numerous courts agree that a settled rule should not be unsettled lightly. See Adkins v. Pell, 14 F.4th 200 (4th Cir. 2021); Boone v. Crandall, 19 F.4th 88, 93 (4th Cir. 2021). Id. at 205. The principle is settled beyond serious dispute.

¶ 15   The dissent's reliance on Leach v. Anderl, 218 N.J. Super. 18, 30 (App. Div. 1987), is misplaced. In Yellen v. Kassin, the Appellate Division squarely held that a defendant's mere presence in a high-crime area is not enough. Yellen, 416 N.J. Super. at 590. The court there reversed a denial of suppression on facts far weaker than these. Id. at 591. We need not reach the State's remaining contention. Affirmed.`

const DOC2_TEXT =
  `¶ 4   The agreement's choice-of-law provision is enforceable on its face. See 6 Williston on Contracts § 13:6 (4th ed. 2018). Delacroix does not contend otherwise. Williston, supra, § 13:9. We therefore apply Delaware law to the merits.

¶ 5   Under Delaware law, an integration clause bars extrinsic evidence of prior understandings. Cobalt Partners v. Nguyen, 78 A.3d 1120, 1131 (Del. 2013). The clause here is unambiguous and complete. Id. at 1133. Delacroix's parol-evidence theory therefore fails. Id.

¶ 6   Nor does the implied covenant of good faith rescue the claim, for the covenant cannot override an express term. Cobalt, supra, at 1135. The judgment is affirmed.`

const DOC3_TEXT =
  `¶ 22   The admission of the 911 recording was not error. Statements made during an ongoing emergency are nontestimonial. Davis v. Washington, 547 U.S. 813, 822 (2006). The caller here described events as they unfolded. Id. at 827. That suffices under the primary-purpose test. See Michigan v. Bryant, 562 U.S. 344, 358 (2011) (citing Davis v. Washington, 547 U.S. 813, 822 (2006)). Id. at 360. The objection was properly overruled.

¶ 23   Castellano's confrontation argument fares no better. We rejected an identical contention in People v. Reyes, 41 Cal. 4th 12, 19 (2007). Reyes, supra, at 21, controls. The trial court's limiting instruction cured any conceivable prejudice. Id.`

const DOC4_TEXT =
  `¶ 7   A holographic will must be entirely in the testator's hand. N.Y. Est. Powers & Trusts Law § 3-2.2 (McKinney 2021). The instrument offered here is typewritten in part. Id. The proponent's reliance on substantial compliance is therefore unavailing.

¶ 8   We have twice declined to adopt that doctrine. In re Estate of Ferris, 99 N.Y.2d 14, 21 (2002). The Court of Appeals has not retreated from Ferris. Ferris, supra, at 23. Nor has the Legislature acted. § 3-2.2, supra.`

// ── Document metadata ─────────────────────────────────────────────────────────

interface DocMeta {
  id: string
  source: "ocr" | "native"
  court: string
  year: number
  caption: string
  docket: string
  text: string
}

const DOCS: DocMeta[] = [
  {
    id: "doc-hargrove",
    caption: "Hargrove v. State",
    docket: "No. 2024-CR-0188",
    court: "Ct. App.",
    year: 2024,
    source: "native",
    text: DOC1_TEXT,
  },
  {
    id: "doc-ferro",
    caption: "Ferro Holdings, LLC v. Delacroix Capital",
    docket: "No. 23-CV-4471",
    court: "Del. Super. Ct.",
    year: 2023,
    source: "native",
    text: DOC2_TEXT,
  },
  {
    id: "doc-castellano",
    caption: "People v. Castellano",
    docket: "No. B312094",
    court: "Cal. Ct. App.",
    year: 2023,
    source: "ocr",
    text: DOC3_TEXT,
  },
  {
    id: "doc-whitcomb",
    caption: "In re Estate of Whitcomb",
    docket: "File No. 2021-3380",
    court: "N.Y. Sur. Ct.",
    year: 2022,
    source: "native",
    text: DOC4_TEXT,
  },
]

// ── Annotators ────────────────────────────────────────────────────────────────

const ANNOTATORS = [
  { id: "r-okafor", name: "R. Okafor" },
  { id: "t-vasquez", name: "T. Vasquez" },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = makeSql()
  try {
    // ── Step 1: Upsert the four documents via the real engine ──────────────────
    let docsUpserted = 0
    for (const doc of DOCS) {
      const payload = buildDocumentPayload(doc.text, {
        id: doc.id,
        source: doc.source,
        court: doc.court,
        year: doc.year,
        caption: doc.caption,
        docket: doc.docket,
      })
      await upsertDocumentPayload(sql, payload)
      docsUpserted++
      console.log(
        `  doc ${doc.id}: ${payload.citations.length} citations, ${payload.backrefs.length} backrefs`,
      )
    }

    // ── Step 2: Upsert annotators ──────────────────────────────────────────────
    for (const ann of ANNOTATORS) {
      await sql`
        insert into annotators (id, name)
        values (${ann.id}, ${ann.name})
        on conflict (id) do update set name = excluded.name
      `
    }
    console.log(`  annotators: ${ANNOTATORS.map((a) => a.id).join(", ")}`)

    // ── Step 3: Upsert batch, batch_items, batch_reviewers ────────────────────
    await sql`
      insert into batches (id, name, mode)
      values ('batch-042', 'Reasonable-Suspicion Set 042', 'double')
      on conflict (id) do update set
        name = excluded.name,
        mode = excluded.mode
    `

    for (const doc of DOCS) {
      await sql`
        insert into batch_items (batch_id, document_id)
        values ('batch-042', ${doc.id})
        on conflict do nothing
      `
    }

    for (const ann of ANNOTATORS) {
      await sql`
        insert into batch_reviewers (batch_id, annotator_id)
        values ('batch-042', ${ann.id})
        on conflict do nothing
      `
    }

    // ── Step 4: Demo labels for doc-hargrove only ──────────────────────────────
    // Read back the REAL engine's prefilled backrefs for doc-hargrove.
    const hargrovePay = await getDocumentPayload(sql, "doc-hargrove")
    let labelsInserted = 0

    if (!hargrovePay || hargrovePay.backrefs.length === 0) {
      console.log("  doc-hargrove has 0 backrefs — skipping demo labels")
    } else {
      const backrefs = hargrovePay.backrefs

      // Find the first backref that has ≥2 candidates (for t-vasquez's deliberate disagreement).
      const firstMultiIdx = backrefs.findIndex((b) => b.candidates.length >= 2)

      // t-vasquez flags the LAST backref (per spec); this creates adjudication content.
      const flagIdx = backrefs.length - 1

      for (let i = 0; i < backrefs.length; i++) {
        const b = backrefs[i]

        // ── r-okafor: agree with engine when a guess exists, else abstain ──────
        const okaforCitId = b.engineGuess
        const okaforType = okaforCitId !== null ? "antecedent" : "abstain"
        const okaforAgreed = okaforCitId !== null

        await sql`
          insert into labels
            (document_id, backref_id, annotator_id, decision_type, citation_id,
             ambiguous_citation_ids, agreed_with_engine, note)
          values (
            ${"doc-hargrove"}, ${b.id}, ${"r-okafor"},
            ${okaforType}, ${okaforCitId},
            ${null}, ${okaforAgreed}, ${null}
          )
          on conflict (document_id, backref_id, annotator_id) do update set
            decision_type          = excluded.decision_type,
            citation_id            = excluded.citation_id,
            ambiguous_citation_ids = excluded.ambiguous_citation_ids,
            agreed_with_engine     = excluded.agreed_with_engine,
            note                   = excluded.note
        `
        labelsInserted++

        // ── t-vasquez: mirrors r-okafor with two deliberate differences ─────────
        let vasquezType: "antecedent" | "abstain" | "flag" = okaforType as
          | "antecedent"
          | "abstain"
        let vasquezCitId: string | null = okaforCitId
        let vasquezAgreed = okaforAgreed
        let vasquezNote: string | null = null

        if (i === firstMultiIdx && firstMultiIdx !== -1) {
          // Genuine disagreement: pick the second candidate instead of engine's guess.
          const alt = b.candidates.find((cand) => cand.citationId !== b.engineGuess)
          if (alt) {
            vasquezType = "antecedent"
            vasquezCitId = alt.citationId
            vasquezAgreed = false
          }
        } else if (i === flagIdx) {
          // Flag on the last backref (per spec) — creates adjudication content.
          vasquezType = "flag"
          vasquezCitId = null
          vasquezAgreed = false
          vasquezNote = "Revisit — unsure about chained Id."
        }

        await sql`
          insert into labels
            (document_id, backref_id, annotator_id, decision_type, citation_id,
             ambiguous_citation_ids, agreed_with_engine, note)
          values (
            ${"doc-hargrove"}, ${b.id}, ${"t-vasquez"},
            ${vasquezType}, ${vasquezCitId},
            ${null}, ${vasquezAgreed}, ${vasquezNote}
          )
          on conflict (document_id, backref_id, annotator_id) do update set
            decision_type          = excluded.decision_type,
            citation_id            = excluded.citation_id,
            ambiguous_citation_ids = excluded.ambiguous_citation_ids,
            agreed_with_engine     = excluded.agreed_with_engine,
            note                   = excluded.note
        `
        labelsInserted++
      }

      const disagreeNote =
        firstMultiIdx !== -1
          ? `backref #${firstMultiIdx} (${backrefs[firstMultiIdx].id}) has ≥2 candidates → t-vasquez picks alt`
          : "no multi-candidate backref found — skipped disagreement"
      const flagNote = `backref #${flagIdx} (${backrefs[flagIdx].id}) [last] → t-vasquez flag`

      console.log(`  demo labels: ${disagreeNote}; ${flagNote}`)
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log("\nSeed complete:")
    console.log(`  ${docsUpserted} documents upserted`)
    console.log(`  ${ANNOTATORS.length} annotators upserted`)
    console.log(`  batch 'batch-042' (double) with ${DOCS.length} docs, 2 reviewers`)
    console.log(`  ${labelsInserted} demo labels inserted/updated (doc-hargrove only)`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("seed failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
