/**
 * Statute Citation Regex Patterns
 *
 * Patterns for federal (USC, CFR), state, and prose-form statute citations.
 * Intentionally broad for tokenization — extraction layer validates and
 * routes to jurisdiction-specific extractors.
 *
 * Pattern families (spec Section 2):
 * - Federal: usc, cfr (enhanced with subsections, et seq., §§)
 * - Prose: "section X of title Y"
 * - Illinois: chapter-act (ILCS chapter/act/section format)
 */

import { buildCaBareCodeRegex } from "@/data/caBareCodes"
import { buildAbbreviatedCodeRegex } from "@/data/stateStatutes"
import type { Pattern } from "./casePatterns"

export const statutePatterns: Pattern[] = [
  {
    id: "usc",
    regex:
      /\b(\d+)\s+(?:U\.S\.C\.?|USC)\s*§§?\s*(\d+[A-Za-z0-9-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      'U.S. Code citations with optional subsections and et seq. (e.g., "42 U.S.C. § 1983(a)(1) et seq.")',
    type: "statute",
  },
  {
    id: "cfr",
    regex:
      /\b(\d+)\s+C\.?F\.?R\.?\s*(?:(?:Part|pt\.)\s+|§§?\s*)(\d+(?:\.\d+)?[A-Za-z0-9-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      'Code of Federal Regulations with Part or §, subsections, et seq. (e.g., "12 C.F.R. Part 226", "40 C.F.R. § 122.26(b)(14)")',
    type: "statute",
  },
  {
    // Internal Revenue Code (IRC) — federal tax code citations. The `I.R.C.`
    // form is the canonical Bluebook abbreviation; bare `IRC` is also common.
    // Without this pattern, Ohio's `R.C.` regex matches the suffix of
    // `I.R.C.` and silently routes every IRC citation to Ohio jurisdiction
    // (14/14 misclassifications in a 37-opinion NJ sweep). #376
    //
    // Listed BEFORE `abbreviated-code` so the longer `I.R.C.` match wins
    // span dedup over Ohio's `R.C.` match at the same position.
    //
    // Captures: (1) section body.
    id: "irc",
    regex:
      /\b(?:I\.R\.C\.|IRC)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description: 'Internal Revenue Code: "I.R.C. § 1367", "IRC § 1341" — #376',
    type: "statute",
  },
  {
    // New Hampshire Revised Statutes Annotated — chapter form. NH uniquely
    // cites the chapter number alone (no section) as a valid citation:
    // `RSA chapter 169-D`, `RSA ch. 458-C`, `RSA [chapter] 173-B`. The
    // bracketed-chapter form (`[chapter]`) is a typographical convention
    // used by some NH opinions to indicate the chapter token was inserted
    // by the reporter rather than original text. The colon-section form
    // (`RSA 511:2`) is already handled by `abbreviated-code`. #378
    //
    // Captures: (1) chapter body — digits + optional hyphen-letter suffix
    // (NH uses forms like `169-D`, `458-C`).
    id: "rsa-chapter",
    regex: /\bRSA\s+(?:\[chapter\]|chapter|ch\.?)\s+(\d+(?:-[A-Z])?)/g,
    description:
      'New Hampshire RSA chapter-only form: "RSA chapter 169-D" / "RSA ch. 458-C" — #378',
    type: "statute",
  },
  {
    // Ohio Revised Code Chapter form: `R.C. Chapter 4509`, `R. C. Chapter
    // 1702`. The chapter number is treated as a complete citation (Ohio,
    // like NH, allows chapter-only references). Spacing between `R.` and
    // `C.` is optional — both `R.C.` and `R. C.` are accepted. #388
    //
    // Captures: (1) chapter number.
    id: "oh-chapter",
    regex: /\bR\.?\s*C\.?\s+Chapter\s+(\d+)/g,
    description:
      'Ohio Revised Code chapter-only form: "R.C. Chapter 4509" / "R. C. Chapter 1702" — #388',
    type: "statute",
  },
  {
    // Oregon Revised Statutes chapter-only form: `ORS chapter 34`. The
    // modern `ORS NNN.NNN` section form is already handled by
    // `abbreviated-code`; this pattern captures chapter-only references.
    // #387
    //
    // Captures: (1) chapter number.
    id: "ors-chapter",
    regex: /\bORS\s+chapter\s+(\d+)/g,
    description: 'Oregon Revised Statutes chapter-only form: "ORS chapter 34" — #387',
    type: "statute",
  },
  {
    id: "prose",
    regex: /\b[Ss]ection\s+(\d+[A-Za-z0-9-]*(?:\([^)]*\))*)\s+of\s+title\s+(\d+)\b/g,
    description:
      'Prose-form federal citations (e.g., "section 1983 of title 42"). Note: MD-style "section X of the Y Article" deferred to PR 3.',
    type: "statute",
  },
  {
    id: "named-code",
    // Matches: [State abbrev]. [Code/Law Name] § [section]
    // Captures: (1) jurisdiction prefix, (2) code name text, (3) section+subsections+et seq
    //
    // Code-name body (#328): each word must be capitalized — real code names
    // are title-case sequences like `Penal Code`, `Civ. Prac. & Rem. Code Ann.`,
    // `Insurance Law`. The previous broad `[A-Za-z.&',\s]+?` accepted lowercase
    // prose, so when the input had a stray earlier `California` followed by
    // sentence prose then `California Penal Code § 549`, the regex absorbed
    // the entire intervening clause into the code-name span.
    //
    // Section body: period only allowed when followed by alphanumeric, so a
    // trailing sentence period is not absorbed (#283).
    regex:
      /\b(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|(?<!W\.?\s?)Va\.?|Ala(?:bama)?\.?)\s+([A-Z][A-Za-z.&']*(?:(?:\s+|,\s+)(?:&|[A-Z][A-Za-z.&']*))*)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Named-code state citations (NY, CA, TX, MD, VA, AL) with jurisdiction prefix + code name + §",
    type: "statute",
  },
  {
    // New York bare named-code form: `Penal Law § 130.52`, `Labor Law §
    // 220 [3-a]`. NY opinions omit the `N.Y.` prefix when citing their own
    // state's codes (other states use `Code` while NY uses `Law` — the
    // word `Law` after the code name is the disambiguator). The enumerated
    // list of NY law names is closed; matching is restricted to known NY
    // codes so the false-positive risk is bounded. Bracket-subdivision
    // groups `[3]`, `[a]`, `[iv]` are accepted alongside the canonical
    // `(N)` form — NY style is to use brackets when paren collisions are
    // a concern. #386
    //
    // Listed AFTER `named-code` so the longer `N.Y. Penal Law § N` form
    // wins span dedup when the `N.Y.` prefix is present.
    //
    // Captures: (1) code name, (2) section body with bracket/paren chain.
    id: "ny-bare-named-code",
    regex:
      /\b(Penal|Labor|Real Property|General Business|General Obligations|General Municipal|Municipal Home Rule|Criminal Procedure|Insurance|Executive|Judiciary|Civil Practice|Civil Rights|Education|Public Health|Banking|Domestic Relations|Environmental Conservation|Election|Social Services|Estates Powers and Trusts|Vehicle and Traffic|Surrogate's Court Procedure|Family Court|Court of Claims|Workers' Compensation|Highway|Tax|Personal Property)\s+Law\s+§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\)|\[[^\]]*\])*(?:\s+(?:\([^)]*\)|\[[^\]]*\]))*)/g,
    description:
      'New York bare named-code form: "Penal Law § 130.00 [3]", "Labor Law § 220 [3-a]" — #386',
    type: "statute",
  },
  {
    id: "mass-chapter",
    // Matches: Mass. Gen. Laws ch. X, § Y / M.G.L.A. c. X, § Y / G.L. c. X, § Y / A.L.M. c. X, § Y
    // Spacing between corpus prefix and `c.` is optional (`G.L.c.` is common
    // Massachusetts court style). The section connector accepts both `§` and
    // `sec.` / `Sec.` (Massachusetts opinions use both). The section portion
    // itself is optional — chapter-only citations like `G.L. c. 93A`
    // refer to the entire chapter and are valid by themselves. #364
    //
    // Section body: period only allowed when followed by alphanumeric, so a
    // trailing sentence period is not absorbed (#283).
    regex:
      /\b(Mass\.?\s*Gen\.?\s*Laws|General\s+Laws|M\.?G\.?L\.?A?\.?|A\.?L\.?M\.?|G\.?\s*L\.?)\s*(?:ch\.?|c\.?)\s*(\w+)(?:,?\s*(?:§§?|[Ss]ec\.?|[Ss]ection)\s*(\w+(?:[\w/-]|\.(?=\w))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?))?/g,
    description: 'Massachusetts chapter-based citations (e.g., "Mass. Gen. Laws ch. 93A, § 2")',
    type: "statute",
  },
  {
    id: "chapter-act",
    // IL: "735 ILCS 5/2-1001" or "735 Ill. Comp. Stat. 5/2-1001"
    // Captures: (1) chapter, (2) act, (3) section+subsections+et seq
    //
    // Section body: digits then alphanumeric/colon/slash/hyphen OR
    // period-followed-by-alphanumeric (lookahead). The period guard
    // prevents sentence-ending punctuation from being absorbed into
    // the section field (`5 ILCS 100/1-1.` → section "1-1", not "1-1.";
    // #283 / #331).
    regex:
      /\b(\d+)\s+(?:ILCS|Ill\.?\s*Comp\.?\s*Stat\.?)\s*(?:Ann\.?\s+)?(\d+)\/(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description: 'Illinois Compiled Statutes chapter-act citations (e.g., "735 ILCS 5/2-1001")',
    type: "statute",
  },
  {
    id: "ill-rev-stat",
    // Pre-1993 Illinois Revised Statutes (#330): `Ill. Rev. Stat. YYYY, ch. N,
    // par. N.N(N)`. Modern Illinois opinions still use this form when
    // referencing the historical version of a statute.
    //
    // Tolerance: spaced/no-space (`Ill. Rev. Stat.` / `Ill.Rev.Stat.`),
    // capitalized/lowercase `[Cc]h.`, singular/plural `pars?.`, optional
    // commas after `Stat.` and after the chapter number.
    //
    // Captures: (1) year-of-edition, (2) chapter (incl. letter suffix `110A`),
    //   (3) paragraph body (subparagraphs + et seq.).
    regex:
      /\bIll\.?\s*Rev\.?\s*Stat\.?,?\s+(\d{4}),?\s+[Cc]h\.\s+(\d+[A-Z]?),?\s+pars?\.\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      "Illinois Revised Statutes (pre-1993): Ill. Rev. Stat. YYYY, ch. N, par. N",
    type: "statute",
  },
  {
    // Revised Laws of Hawaii — pre-1955 Hawaii statutory compilations
    // (`RLH 1935 § 2545`, `RLH 1945 § 7186`, `RLH 1955 § 7186`). Modern
    // Hawaii opinions still cite RLH when discussing pre-1955 statutory
    // history. The `RLH` token is distinctively Hawaii-only. #359
    //
    // Captures: (1) edition year, (2) section body.
    id: "rlh",
    regex:
      /\bRLH\s+(\d{4})\s+§\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description: 'Revised Laws of Hawaii (pre-1955): "RLH 1935 § 2545" — #359',
    type: "statute",
  },
  {
    // Pre-1973 Colorado Revised Statutes (prose form): `Section 148-21-34,
    // Colorado Revised Statutes 1963` / `Section 13-25-126, Colo. Rev. Stat.
    // 1973`. Pre-1973 Colorado used a chapter-article-section numbering
    // scheme that surfaces here as the section body (`148-21-34`). The
    // section comes BEFORE the code name — opposite of the canonical
    // `<code> § <section>` shape — so this needs its own pattern.
    //
    // Listed BEFORE `abbreviated-code` so the prose-form container wins span
    // dedup over the abbreviated-code match (which would otherwise consume
    // the trailing `Colorado Revised Statutes 1963` and treat `1963` as the
    // section, producing a duplicate citation). #352
    //
    // Captures: (1) section body, (2) optional edition year (1963/1973).
    id: "colorado-prose",
    regex:
      /\b[Ss]ection\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+Colo(?:rado)?\.?\s+Rev(?:ised)?\.?\s+Stat(?:utes)?\.?(?:\s+Ann(?:otated)?\.?)?(?:\s+(19\d{2}))?/g,
    description:
      'Pre-1973 Colorado prose form: "Section 148-21-34, Colorado Revised Statutes 1963" — #352',
    type: "statute",
  },
  {
    // Florida postfix form: `section 812.035(7), Florida Statutes` or
    // `§83.15, Florida Statutes`. The code name appears AFTER the section
    // — canonical Florida court style since at least the 1970s. Listed
    // BEFORE `abbreviated-code` so the container-shape wins span dedup
    // (otherwise the trailing `Florida Statutes` could tokenize as a
    // separate abbreviated-code match). #356
    //
    // Captures: (1) section body.
    id: "florida-postfix",
    // Use a lookbehind boundary (`(?<![A-Za-z])`) instead of `\b` so the
    // pattern can start at `§` — `\b` requires a word/non-word transition
    // and `§` is a non-word char, so `\b` fails when `§` is the first char.
    // No trailing `\b` because `Fla. Stat.` ends with `.` (non-word) and
    // `\b` wouldn't anchor at end-of-string. The closed alternation
    // (`Florida Statutes | Fla. Stat.`) is specific enough on its own.
    regex:
      /(?<![A-Za-z])(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+(?:Florida\s+Statutes|Fla\.\s*Stat\.)/g,
    description:
      'Florida postfix statute form: "section 812.035(7), Florida Statutes" / "§83.15, Florida Statutes" — #356',
    type: "statute",
  },
  {
    // Florida spelled-out-prefix form: `Florida Statute 679.504(3)` or
    // `Florida Statutes §73.071(3)(b)`. Spelled-out (singular or plural)
    // code name with optional `§` connector — distinct from the canonical
    // Bluebook `Fla. Stat. §` prefix handled by `abbreviated-code`.
    //
    // Captures: (1) section body.
    id: "florida-prefix-spelled",
    regex:
      /\bFlorida\s+Statutes?\s*§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/g,
    description:
      'Florida spelled-out prefix form: "Florida Statute 679.504(3)" / "Florida Statutes §73.071" — #356',
    type: "statute",
  },
  {
    // Idaho postfix form: `Section 23-908(4), Idaho Code` — the code name
    // appears AFTER the section. Sibling to florida-postfix. Listed BEFORE
    // `abbreviated-code` so the container-shape wins span dedup (otherwise
    // the trailing `Idaho Code` could tokenize as a separate abbreviated-code
    // match). #360
    //
    // Captures: (1) section body.
    id: "idaho-postfix",
    regex:
      /(?<![A-Za-z])(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+Idaho\s+Code(?:\s+Ann\.?)?/g,
    description:
      'Idaho postfix statute form: "Section 23-908(4), Idaho Code" — #360',
    type: "statute",
  },
  {
    // Montana postfix form: `§ 77-6-205(2), MCA` or `Section 40-4-121(7)(a),
    // MCA` — the dominant Montana citation style (every modern Montana opinion
    // uses this form). Sibling to florida-postfix and idaho-postfix. The
    // trailing edition-year parenthetical (`MCA (1983)`) is left to the
    // generic year-paren absorber in extractCitations.ts to attach. #372
    //
    // Captures: (1) section body.
    id: "mca-postfix",
    regex:
      /(?<![A-Za-z])(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+MCA/g,
    description: 'Montana Code Annotated postfix form: "§ 77-6-205(2), MCA" — #372',
    type: "statute",
  },
  {
    // Tennessee Code Annotated postfix form: `§ 39-904, T.C.A.` — the code
    // name appears AFTER the section, separated by a comma. Sibling to
    // florida-postfix, idaho-postfix, mca-postfix. Listed BEFORE
    // `abbreviated-code` so the container shape wins span dedup. #398
    //
    // Captures: (1) section body.
    id: "tca-postfix",
    regex:
      /(?<![A-Za-z])(?:[Ss]ections?|[Ss]ec\.?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+T\.?C\.?A\.?/g,
    description:
      'Tennessee Code Annotated postfix form: "§ 39-904, T.C.A." — #398',
    type: "statute",
  },
  {
    // Nebraska Reissue Revised Statutes 1943 (R.R.S. 1943) — historical
    // form: `section 38-901, R. R. S. 1943` or `§ 30-2806, R.R.S. 1943,
    // Reissue 1975`. Nebraska compiled its statutes in 1943 and re-issues
    // volumes on a rolling basis, so the trailing `Reissue YYYY` clause
    // gives the volume year. The `R.R.S.` token admits inter-letter
    // spacing (`R. R. S.`) — common OCR variant. Listed BEFORE
    // `abbreviated-code` so the container shape wins. #373
    //
    // Captures: (1) section body, (2) optional Reissue year.
    id: "rrs-1943",
    regex:
      /(?<![A-Za-z])(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+R\.?\s*R\.?\s*S\.?\s+1943(?:,\s+Reissue\s+(\d{4}))?/g,
    description:
      'Nebraska Reissue Revised Statutes 1943: "§ 30-2806, R.R.S. 1943, Reissue 1975" — #373',
    type: "statute",
  },
  {
    // Rhode Island General Laws 1956 — modern RI statutory code. The
    // `G.L. 1956` (or spaced `G. L. 1956`) prefix is distinctive because
    // of the `1956` literal year, which disambiguates from Massachusetts
    // `G.L. c. NNN` (chapter form). RI opinions often include a
    // `(YYYY Reenactment)` parenthetical indicating which reenactment
    // volume was in effect. #393
    //
    // Captures: (1) optional reenactment year, (2) section body.
    id: "rigl-1956",
    regex:
      /\bG\.?\s*L\.?\s+1956\s*(?:\((\d{4})\s+Reenactment\))?\s*,?\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/g,
    description:
      'Rhode Island General Laws 1956: "G.L. 1956 (1969 Reenactment) §11-23-1" — #393',
    type: "statute",
  },
  {
    // Maryland article-letter codes — post-2002 the Maryland Code is
    // organized into named articles, each with a 2- or 3-letter prefix
    // used as the bare citation form (no `Md.` prefix): `HG § 19-906`,
    // `CP § 10-105(e)(4)`, `R.P. § 8-211`. This is the dominant Maryland
    // citation style for any Maryland appellate opinion since 2002. The
    // letter prefixes are a closed enumeration; matching is restricted to
    // that set to keep the false-positive risk bounded. #368
    //
    // The mandatory `§` connector disambiguates the letter prefix from
    // ordinary prose tokens like `IN` or `TR` that happen to appear at
    // the start of a sentence.
    //
    // Captures: (1) code-letter prefix, (2) section body.
    id: "md-article-letter",
    regex:
      /\b(AB|AG|BO|BR|CJ|CL|CP|CR|CS|EC|ED|EL|EN|ET|FI|FL|GP|HG|HO|HS|HU|IN|LE|LG|LU|NR|PS|PUC|R\.?P\.?|RP|SF|SG|TA|TG|TP|TR)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)/g,
    description:
      'Maryland article-letter codes: "HG § 19-906", "CP § 10-105", "R.P. § 8-211" — #368',
    type: "statute",
  },
  {
    // Minnesota Statutes year-edition form: `Minn. St. 1971, § 176.66`.
    // The year (1971/1974/etc.) is the edition of Minnesota Statutes, not
    // the section number — abbreviated-code would mis-capture the year as
    // section. Listed BEFORE `abbreviated-code` so the year-edition shape
    // wins. The trailing `, § N` is REQUIRED so we don't false-positive on
    // bare years that happen to follow `Minn. St.`. #371
    //
    // Captures: (1) edition year, (2) section body.
    id: "minn-st-year-edition",
    regex:
      /\bMinn\.?\s+(?:Stat|St)\.?\s+(19\d{2}),\s*§\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\)|\[[^\]]*\])*)/g,
    description:
      'Minnesota Statutes year-edition form: "Minn. St. 1971, § 176.66" — #371',
    type: "statute",
  },
  {
    // Kansas Statutes Annotated year-edition / Supp. form: `K.S.A. 2009
    // Supp. 44-501(d)(2)`. The year between K.S.A. and the section number
    // is the compilation/supplement year, not the section — abbreviated-code
    // would mis-capture the year. The Supp. token is optional (some Kansas
    // courts write `K.S.A. YYYY NN-NNN` without `Supp.` to mean the bound
    // volume of that year). Listed BEFORE `abbreviated-code` so this shape
    // wins. The internal comma (`23-9,101`) is the Kansas comma-section
    // form, also supported. #367
    //
    // Captures: (1) edition year, (2) optional Supp. marker, (3) section.
    id: "ksa-year-edition",
    regex:
      /\bK\.?\s*S\.?\s*A\.?\s+(\d{4})(?:\s+(Supp\.?))?\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9])|,(?=\d))*(?:\([^)]*\))*)/g,
    description:
      'Kansas Statutes Annotated year-edition: "K.S.A. 2009 Supp. 44-501(d)(2)" — #367',
    type: "statute",
  },
  {
    // Indiana Code year-edition form: `IC 1971, 35-13-4-4` — the year
    // between IC and the section is the compilation/edition year of the
    // Indiana Code, not the section. abbreviated-code would silently
    // capture the year as section. The trailing `, NN-N-N` separator
    // distinguishes this from a bare `IC NN-N-N` modern citation. Listed
    // BEFORE `abbreviated-code` so this shape wins. #363
    //
    // Captures: (1) edition year, (2) section body.
    id: "ic-year-edition",
    regex:
      /\bIC\s+(\d{4}),\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/g,
    description: 'Indiana Code year-edition form: "IC 1971, 35-13-4-4" — #363',
    type: "statute",
  },
  {
    id: "abbreviated-code",
    regex: buildAbbreviatedCodeRegex(),
    description: "Abbreviated state code citations for all US jurisdictions",
    type: "statute",
  },
  {
    // New Mexico bare-section form: `Section 32A-2-7(A)`, `§ 41-2-2`. NM
    // opinions cite NMSA 1978 sections without a code prefix — the three-
    // hyphen section format (`\d[A-Z]?-\d[A-Z]?-\d[A-Z]?`) is distinctive
    // among state codes and serves as the disambiguator. Listed AFTER
    // `abbreviated-code` so a full `NMSA 1978, § 41-2-2` citation is not
    // double-counted by this bare-section pattern (the abbreviated-code
    // container would otherwise tie with this contained pattern, leaving
    // a duplicate cite at the inner span). #382
    //
    // Captures: (1) section body — three-part hyphenated form with
    // optional uppercase-letter suffixes and optional parenthetical
    // subsection (`(A)`, `(B)`, `(1)`).
    id: "nm-bare-section",
    regex:
      /(?<![A-Za-z])(?:§\s*|[Ss]ection\s+)(\d+[A-Z]?-\d+[A-Z]?-\d+[A-Z]?(?:\([A-Za-z0-9]+\))*)/g,
    description:
      'New Mexico bare-section form: "Section 32A-2-7(A)" / "§ 41-2-2" — #382',
    type: "statute",
  },
  {
    id: "ca-bare-code",
    regex: buildCaBareCodeRegex(),
    description:
      'California bare-code citations (#296) — `Pen. Code § 148`, `Code Civ. Proc., § 1021.5`, `Bus. & Prof. Code § 17200` (no "Cal." prefix; common in single-jurisdiction California practice).',
    type: "statute",
  },
  {
    // Pre-1975 Alabama Code (Code-prefix form): `Code 1940, T. 15, § 389`.
    // The leading `Code [of Alabama,] 1940` is an unambiguous Alabama signal,
    // so the title body uses `T.` / `Tit.` / `Title` interchangeably. The
    // section uses the period-followed-by-alphanumeric guard from #283.
    // Captures: (1) chapter (title), (2) section body. Year is hardcoded to
    // 1940 in the extractor (the prefix asserts 1940). #343
    id: "ala-code-prefix",
    regex:
      /\bCode(?:\s+of\s+Alabama)?,?\s+1940,?\s+T(?:itle|it)?\.\s+(\d+),?\s+§\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/g,
    description:
      'Alabama Code 1940 (Code-prefix form, pre-1975): "Code 1940, T. 15, § 389" / "Code of Alabama 1940, T. NN, § NNN" — #343',
    type: "statute",
  },
  {
    // Pre-1975 Alabama Code (Title-first with mandatory Code trailer):
    // `Title 26, Section 214, Code of Alabama 1940, as Recompiled 1958`.
    // Requires the trailing `Code [of Alabama] YYYY` clause so the spelled-out
    // `Title NN` form doesn't false-positive on bare prose like USC's
    // `Title 18, § 1001`. Captures: (1) title, (2) section, (3) edition year,
    // (4) optional recompilation year.
    id: "ala-title-trailer",
    regex:
      /\bTitle\s+(\d+),?\s+(?:§|Sec(?:tion)?s?\.?)\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+Code(?:\s+of\s+Alabama)?,?\s+(\d{4})(?:,?\s+(?:as\s+)?[Rr]ecompiled\s+(\d{4}))?/g,
    description:
      'Alabama Code (Title-first with Code trailer): "Title 26, Section 214, Code of Alabama 1940, as Recompiled 1958" — #343',
    type: "statute",
  },
  {
    // Pre-1975 Alabama Code (abbreviated bare form): `Tit. 52, § 361`.
    // The `Tit.` abbreviation is itself an Alabama signal — USC and other
    // federal codes spell out `Title` instead. Optional Code trailer captures
    // year and recompilation when present. Captures: (1) title, (2) section,
    // (3) optional edition year, (4) optional recompilation year.
    id: "ala-tit-bare",
    regex:
      /\bTit\.\s+(\d+),?\s+§\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)(?:,?\s+Code(?:\s+of\s+Alabama)?,?\s+(\d{4})(?:,?\s+(?:as\s+)?[Rr]ecompiled\s+(\d{4}))?)?/g,
    description:
      'Alabama Code (abbreviated `Tit.` form): "Tit. 52, § 361" — #343',
    type: "statute",
  },
]
