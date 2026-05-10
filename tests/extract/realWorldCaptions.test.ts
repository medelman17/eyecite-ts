import { describe, it, expect } from "vitest"
import { extractCitations } from "@/index"

// Real-world captions mined from the Harvard CAP corpus, 2026-05-10.
// Each entry is a verbatim citation from a published opinion that exercises
// one of the abbreviation stems added in this branch.
const REAL_WORLD_CAPTIONS: Array<{
  stem: string
  text: string
  expectedCaseName: string
  citingOpinion: string
}> = [
  // ── "tp" — NJ Township ──
  {
    stem: "tp",
    text: "See Gallup v. Tp. of Lower Merion, 329 U.S. 669.",
    expectedCaseName: "Gallup v. Tp. of Lower Merion",
    citingOpinion: "Napierkowski v. Township of Gloucester, 29 N.J. 481",
  },
  {
    stem: "tp",
    text: "Levin v. Tp. Committee of Tp. of Bridgewater, 57 N.J. 506, 515.",
    expectedCaseName: "Levin v. Tp. Committee of Tp. of Bridgewater",
    citingOpinion: "State v. Hatch, 64 N.J. 179",
  },
  // ── "atty" — Att'y Gen. ──
  {
    stem: "atty",
    text: "Ventura v. Att'y Gen., 419 F.3d 1269 (11th Cir. 2005).",
    expectedCaseName: "Ventura v. Att'y Gen.",
    citingOpinion: "Grossman v. McDonough, 466 F.3d 1325",
  },
  {
    stem: "atty",
    text: "Stephens v. Att'y Gen. of Cal., 23 F.3d 248 (9th Cir. 1994).",
    expectedCaseName: "Stephens v. Att'y Gen. of Cal.",
    citingOpinion: "Chavez v. Weber, 497 F.3d 796",
  },
  // ── "commrs" — Comm'rs (plural) ──
  {
    stem: "commrs",
    text: "See Board of County Comm'rs of Sedgwick County v. United States, 105 F. Supp. 995.",
    expectedCaseName: "Board of County Comm'rs of Sedgwick County v. United States",
    citingOpinion: "Rohr Aircraft Corp. v. County of San Diego, 362 U.S. 628",
  },
  // ── "hldgs" — Hldgs. ──
  {
    stem: "hldgs",
    text: "Sokol Hldgs., Inc. v. BMB Munal, Inc., 542 F.3d 354 (2d Cir. 2008).",
    expectedCaseName: "Sokol Hldgs., Inc. v. BMB Munal, Inc.",
    citingOpinion: "TicketNetwork, Inc. v. Darbouze, 133 F. Supp. 3d 442",
  },
  // ── "props" — Props. ──
  {
    stem: "props",
    text: "See Ascon Props., Inc. v. Mobil Oil Co., 866 F.2d 1149 (9th Cir. 1989).",
    expectedCaseName: "Ascon Props., Inc. v. Mobil Oil Co.",
    citingOpinion: "Soliman v. Philip Morris Inc., 311 F.3d 966",
  },
  // ── "prods" — Prods. ──
  {
    stem: "prods",
    text: "Union Texas Prods. Corp. v. FERC, 899 F.2d 432.",
    expectedCaseName: "Union Texas Prods. Corp. v. FERC",
    citingOpinion: "(F.3d corpus)",
  },
  // ── "ents" — Ents. ──
  {
    stem: "ents",
    text: "See Detweiler Ents., Inc. v. Warner, 103 Ohio St.3d 99.",
    expectedCaseName: "Detweiler Ents., Inc. v. Warner",
    citingOpinion: "(Ohio St.3d corpus)",
  },
  // ── "sols" — Sols. ──
  {
    stem: "sols",
    text: "DP Sols., Inc. v. Rollins, Inc., 353 F.3d 421 (5th Cir. 2003).",
    expectedCaseName: "DP Sols., Inc. v. Rollins, Inc.",
    citingOpinion: "(F.3d corpus)",
  },
  // ── "corrs" — Corrs. ──
  {
    stem: "corrs",
    text: "See Pa. Dep't of Corrs. v. Yeskey, 524 U.S. 206.",
    expectedCaseName: "Pa. Dep't of Corrs. v. Yeskey",
    citingOpinion: "(U.S. corpus)",
  },
  // ── "colls" — Colls. ──
  {
    stem: "colls",
    text: "Bd. of Regents of State Colls. v. Roth, 408 U.S. 564.",
    expectedCaseName: "Bd. of Regents of State Colls. v. Roth",
    citingOpinion: "(U.S. corpus)",
  },
  // ── "utils" — Utils. ──
  {
    stem: "utils",
    text: "Gulf States Utils. Co. v. Alabama Power Co., 824 F.2d 1465.",
    expectedCaseName: "Gulf States Utils. Co. v. Alabama Power Co.",
    citingOpinion: "(F.2d corpus)",
  },
  // ── "bur" — Bur. ──
  {
    stem: "bur",
    text: "Kreimer v. Bur. of Police for Morristown, 958 F.2d 1242.",
    expectedCaseName: "Kreimer v. Bur. of Police for Morristown",
    citingOpinion: "(F.2d corpus)",
  },
  // ── "examrs" — Exam'rs (plural) ──
  {
    stem: "examrs",
    text: "See Arkansas State Bd. of Dental Exam'rs v. Smith, 151 F.3d 838.",
    expectedCaseName: "Arkansas State Bd. of Dental Exam'rs v. Smith",
    citingOpinion: "(F.3d corpus)",
  },
  // ── "edn" — Ohio Edn. ──
  {
    stem: "edn",
    text: "See Bd. of Edn. v. Walter, 58 Ohio St. 2d 1.",
    expectedCaseName: "Bd. of Edn. v. Walter",
    citingOpinion: "Pack v. City of Cleveland, 1 Ohio St. 3d 129",
  },
  // ── "conserv" — Conserv. ──
  {
    stem: "conserv",
    text: "See Colo. River Water Conserv. Dist. v. United States, 424 U.S. 800.",
    expectedCaseName: "Colo. River Water Conserv. Dist. v. United States",
    citingOpinion: "(U.S. corpus)",
  },
  // ── "emps" — Emps. (plural) ──
  {
    stem: "emps",
    text: "Sch. Emps. Ret. Sys. v. Ernst & Young, LLP, 622 F.3d 471.",
    expectedCaseName: "Sch. Emps. Ret. Sys. v. Ernst & Young, LLP",
    citingOpinion: "(F.3d corpus)",
  },
  {
    stem: "emps",
    text: "Nat'l Treasury Emps. Union v. United States, 101 F.3d 1423.",
    expectedCaseName: "Nat'l Treasury Emps. Union v. United States",
    citingOpinion: "(F.3d corpus)",
  },
  // ── "invests" — Invests. (Ohio variant) ──
  {
    stem: "invests",
    text: "Whistler Invests., Inc. v. Depository Trust & Clearing Corp., 539 F.3d 1159.",
    expectedCaseName: "Whistler Invests., Inc. v. Depository Trust & Clearing Corp.",
    citingOpinion: "(F.3d corpus)",
  },
  // ── "boro" — NJ Boro. ──
  {
    stem: "boro",
    text: "See Matawan Boro. v. Monmouth Cty. Tax Bd., 51 N.J. 291.",
    expectedCaseName: "Matawan Boro. v. Monmouth Cty. Tax Bd.",
    citingOpinion: "McKenna v. Wiskowski, 181 N.J. Super. 482",
  },
  {
    stem: "boro",
    text: "See Wollen v. Boro. of Fort Lee, 27 N.J. 408.",
    expectedCaseName: "Wollen v. Boro. of Fort Lee",
    citingOpinion: "Bell v. Township of Bass River, 196 N.J. Super. 304",
  },
]

describe("real-world captions verification (corpus-mined)", () => {
  for (const { stem, text, expectedCaseName } of REAL_WORLD_CAPTIONS) {
    it(`[${stem}] ${text.substring(0, 60)}...`, () => {
      const cites = extractCitations(text)
      const caseCite = cites.find((c) => c.type === "case")
      if (!caseCite || caseCite.type !== "case") {
        throw new Error(`No case citation extracted from: ${text}`)
      }
      expect(caseCite.caseName).toBe(expectedCaseName)
    })
  }
})
