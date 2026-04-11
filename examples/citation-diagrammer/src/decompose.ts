import type { Citation } from "eyecite-ts"
import type { ComponentCategory, DiagramNode } from "./types"

/**
 * Decompose a Citation into a DiagramNode tree.
 * Handles all 11 citation types exhaustively.
 */
export function decompose(citation: Citation): DiagramNode {
  const text = citation.matchedText

  switch (citation.type) {
    case "case":
      return decomposeCase(citation, text)
    case "statute":
      return decomposeStatute(citation, text)
    case "constitutional":
      return decomposeConstitutional(citation, text)
    case "journal":
      return decomposeJournal(citation, text)
    case "neutral":
      return decomposeNeutral(citation, text)
    case "publicLaw":
      return decomposePublicLaw(citation, text)
    case "federalRegister":
      return decomposeFederalRegister(citation, text)
    case "statutesAtLarge":
      return decomposeStatutesAtLarge(citation, text)
    case "id":
      return decomposeId(citation, text)
    case "supra":
      return decomposeSupra(citation, text)
    case "shortFormCase":
      return decomposeShortFormCase(citation, text)
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function node(
  label: string,
  displayLabel: string,
  value: string,
  category: ComponentCategory,
  text: string,
  searchFrom = 0,
): DiagramNode {
  const idx = text.indexOf(value, searchFrom)
  const charStart = idx >= 0 ? idx : searchFrom
  const charEnd = charStart + value.length
  return {
    label,
    displayLabel,
    value,
    category,
    presence: "present",
    charStart,
    charEnd,
  }
}

function inferredNode(
  label: string,
  displayLabel: string,
  value: string,
  category: ComponentCategory,
  at: number,
): DiagramNode {
  return {
    label,
    displayLabel,
    value,
    category,
    presence: "inferred",
    charStart: at,
    charEnd: at,
  }
}

function rootNode(
  typeName: string,
  text: string,
  confidence: number,
  children: DiagramNode[],
): DiagramNode {
  return {
    label: typeName,
    displayLabel: typeName.toUpperCase(),
    value: text,
    category: "marker",
    presence: "present",
    confidence,
    charStart: 0,
    charEnd: text.length,
    children: children.filter((c) => c.value.length > 0),
  }
}

// ── Per-type decomposers ────────────────────────────────────────

function decomposeCase(
  c: Extract<Citation, { type: "case" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  // Signal
  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  // Case name with plaintiff/defendant children
  if (c.caseName) {
    const caseNode = node("caseName", "Case Name", c.caseName, "identity", text, cursor)
    const caseChildren: DiagramNode[] = []

    if (c.plaintiff && c.defendant) {
      const plf = node("plaintiff", "Plf.", c.plaintiff, "identity", c.caseName)
      caseChildren.push(plf)

      const vIdx = c.caseName.indexOf(" v. ")
      if (vIdx >= 0) {
        caseChildren.push({
          label: "versus",
          displayLabel: "v.",
          value: "v.",
          category: "marker",
          presence: "present",
          charStart: caseNode.charStart + vIdx + 1,
          charEnd: caseNode.charStart + vIdx + 3,
        })
      }

      const def = node("defendant", "Def.", c.defendant, "identity", c.caseName, vIdx >= 0 ? vIdx + 4 : 0)
      def.charStart += caseNode.charStart
      def.charEnd += caseNode.charStart
      caseChildren[0].charStart += caseNode.charStart
      caseChildren[0].charEnd += caseNode.charStart
      caseChildren.push(def)
    } else if (c.plaintiff && c.proceduralPrefix) {
      caseChildren.push(
        node("prefix", "Prefix", c.proceduralPrefix, "marker", c.caseName),
        node("party", "Party", c.plaintiff, "identity", c.caseName, c.proceduralPrefix.length),
      )
      // Adjust to absolute positions
      for (const child of caseChildren) {
        child.charStart += caseNode.charStart
        child.charEnd += caseNode.charStart
      }
    }

    if (caseChildren.length > 0) {
      caseNode.children = caseChildren
    }
    children.push(caseNode)
    cursor = caseNode.charEnd
  }

  // Volume
  const volStr = String(c.volume)
  const vol = node("volume", "Vol.", volStr, "locator", text, cursor)
  children.push(vol)
  cursor = vol.charEnd

  // Reporter
  const rptr = node("reporter", "Rptr.", c.normalizedReporter ?? c.reporter, "locator", text, cursor)
  children.push(rptr)
  cursor = rptr.charEnd

  // Page
  if (c.page !== undefined) {
    const pg = node("page", "Page", String(c.page), "locator", text, cursor)
    children.push(pg)
    cursor = pg.charEnd

    // Pincite (refines page)
    if (c.pincite !== undefined) {
      const pin = node("pincite", "Pin.", String(c.pincite), "reference", text, cursor)
      pin.relation = { type: "refines", description: "refines" }
      children.push(pin)
      cursor = pin.charEnd
    }
  } else if (c.hasBlankPage) {
    children.push(node("page", "Page", "___", "locator", text, cursor))
  }

  // Metadata parenthetical: (Court Year)
  if (c.court || c.year !== undefined) {
    if (c.court) {
      children.push(node("court", "Ct.", c.normalizedCourt ?? c.court, "metadata", text, cursor))
    }
    if (c.year !== undefined) {
      children.push(node("year", "Year", String(c.year), "metadata", text, cursor))
    }
  }

  // Disposition
  if (c.disposition) {
    children.push(node("disposition", "Disp.", c.disposition, "metadata", text, cursor))
  }

  // Parentheticals
  if (c.parentheticals && c.parentheticals.length > 0) {
    for (const p of c.parentheticals) {
      const paren = node("parenthetical", `(${p.type})`, p.text, "context", text, cursor)
      children.push(paren)
    }
  }

  // Subsequent history
  if (c.subsequentHistoryEntries && c.subsequentHistoryEntries.length > 0) {
    for (const h of c.subsequentHistoryEntries) {
      children.push(node("history", "Hist.", h.rawSignal, "context", text, cursor))
    }
  }

  return rootNode("case", text, c.confidence, children)
}

function decomposeStatute(
  c: Extract<Citation, { type: "statute" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  if (c.title !== undefined) {
    const t = node("title", "Title", String(c.title), "locator", text, cursor)
    children.push(t)
    cursor = t.charEnd
  }

  const code = node("code", "Code", c.code, "locator", text, cursor)
  children.push(code)
  cursor = code.charEnd

  // Section symbol
  const secIdx = text.indexOf("\u00A7", cursor)
  if (secIdx >= 0) {
    children.push({
      label: "sectionSymbol",
      displayLabel: "\u00A7",
      value: "\u00A7",
      category: "marker",
      presence: "present",
      charStart: secIdx,
      charEnd: secIdx + 1,
    })
    cursor = secIdx + 1
  }

  const sec = node("section", "Sec.", c.section, "locator", text, cursor)
  children.push(sec)
  cursor = sec.charEnd

  if (c.subsection) {
    const sub = node("subsection", "Sub.", c.subsection, "reference", text, cursor)
    sub.relation = { type: "refines", description: "narrows" }
    children.push(sub)
    cursor = sub.charEnd
  }

  if (c.hasEtSeq) {
    children.push(node("etSeq", "et seq.", "et seq.", "marker", text, cursor))
  }

  return rootNode("statute", text, c.confidence, children)
}

function decomposeConstitutional(
  c: Extract<Citation, { type: "constitutional" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  if (c.jurisdiction) {
    const jur = node(
      "jurisdiction",
      "Jur.",
      c.jurisdiction === "US" ? "U.S." : c.jurisdiction,
      "metadata",
      text,
      cursor,
    )
    children.push(jur)
    cursor = jur.charEnd
  }

  // "Const."
  const constIdx = text.indexOf("Const.", cursor)
  if (constIdx >= 0) {
    children.push({
      label: "constitution",
      displayLabel: "Const.",
      value: "Const.",
      category: "marker",
      presence: "present",
      charStart: constIdx,
      charEnd: constIdx + 6,
    })
    cursor = constIdx + 6
  }

  if (c.article !== undefined) {
    children.push(node("article", "Art.", String(c.article), "locator", text, cursor))
  }

  if (c.amendment !== undefined) {
    children.push(node("amendment", "Amend.", String(c.amendment), "locator", text, cursor))
  }

  if (c.section !== undefined) {
    children.push(node("section", "Sec.", c.section, "reference", text, cursor))
  }

  if (c.clause !== undefined) {
    children.push(node("clause", "Cl.", String(c.clause), "reference", text, cursor))
  }

  return rootNode("constitutional", text, c.confidence, children)
}

function decomposeJournal(
  c: Extract<Citation, { type: "journal" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  if (c.volume !== undefined) {
    const vol = node("volume", "Vol.", String(c.volume), "locator", text, cursor)
    children.push(vol)
    cursor = vol.charEnd
  }

  const jrnl = node("journal", "Jrnl.", c.abbreviation, "locator", text, cursor)
  children.push(jrnl)
  cursor = jrnl.charEnd

  if (c.page !== undefined) {
    const pg = node("page", "Page", String(c.page), "locator", text, cursor)
    children.push(pg)
    cursor = pg.charEnd
  }

  if (c.pincite !== undefined) {
    const pin = node("pincite", "Pin.", String(c.pincite), "reference", text, cursor)
    pin.relation = { type: "refines", description: "refines" }
    children.push(pin)
    cursor = pin.charEnd
  }

  if (c.year !== undefined) {
    children.push(node("year", "Year", String(c.year), "metadata", text, cursor))
  }

  return rootNode("journal", text, c.confidence, children)
}

function decomposeNeutral(
  c: Extract<Citation, { type: "neutral" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  const yr = node("year", "Year", String(c.year), "metadata", text, cursor)
  children.push(yr)
  cursor = yr.charEnd

  const ct = node("court", "Ct.", c.court, "locator", text, cursor)
  children.push(ct)
  cursor = ct.charEnd

  const doc = node("documentNumber", "Doc #", c.documentNumber, "locator", text, cursor)
  children.push(doc)

  return rootNode("neutral", text, c.confidence, children)
}

function decomposePublicLaw(
  c: Extract<Citation, { type: "publicLaw" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  // "Pub. L. No." marker
  const pubIdx = text.indexOf("Pub.", cursor)
  if (pubIdx >= 0) {
    const noIdx = text.indexOf("No.", pubIdx)
    const markerEnd = noIdx >= 0 ? noIdx + 3 : pubIdx + 10
    children.push({
      label: "prefix",
      displayLabel: "Prefix",
      value: text.substring(pubIdx, markerEnd).trim(),
      category: "marker",
      presence: "present",
      charStart: pubIdx,
      charEnd: markerEnd,
    })
    cursor = markerEnd
  }

  const cong = node("congress", "Cong.", String(c.congress), "locator", text, cursor)
  children.push(cong)
  cursor = cong.charEnd

  const law = node("lawNumber", "Law #", String(c.lawNumber), "locator", text, cursor)
  children.push(law)

  return rootNode("publicLaw", text, c.confidence, children)
}

function decomposeFederalRegister(
  c: Extract<Citation, { type: "federalRegister" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  const vol = node("volume", "Vol.", String(c.volume), "locator", text, cursor)
  children.push(vol)
  cursor = vol.charEnd

  // "Fed. Reg." marker
  const frIdx = text.indexOf("Fed.", cursor)
  if (frIdx >= 0) {
    const regIdx = text.indexOf("Reg.", frIdx)
    const markerEnd = regIdx >= 0 ? regIdx + 4 : frIdx + 9
    children.push({
      label: "source",
      displayLabel: "Source",
      value: text.substring(frIdx, markerEnd).trim(),
      category: "marker",
      presence: "present",
      charStart: frIdx,
      charEnd: markerEnd,
    })
    cursor = markerEnd
  }

  const pg = node("page", "Page", String(c.page), "locator", text, cursor)
  children.push(pg)
  cursor = pg.charEnd

  if (c.year !== undefined) {
    children.push(node("year", "Year", String(c.year), "metadata", text, cursor))
  }

  return rootNode("federalRegister", text, c.confidence, children)
}

function decomposeStatutesAtLarge(
  c: Extract<Citation, { type: "statutesAtLarge" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  const vol = node("volume", "Vol.", String(c.volume), "locator", text, cursor)
  children.push(vol)
  cursor = vol.charEnd

  // "Stat." marker
  const statIdx = text.indexOf("Stat.", cursor)
  if (statIdx >= 0) {
    children.push({
      label: "source",
      displayLabel: "Source",
      value: "Stat.",
      category: "marker",
      presence: "present",
      charStart: statIdx,
      charEnd: statIdx + 5,
    })
    cursor = statIdx + 5
  }

  const pg = node("page", "Page", String(c.page), "locator", text, cursor)
  children.push(pg)
  cursor = pg.charEnd

  if (c.year !== undefined) {
    children.push(node("year", "Year", String(c.year), "metadata", text, cursor))
  }

  return rootNode("statutesAtLarge", text, c.confidence, children)
}

function decomposeId(
  c: Extract<Citation, { type: "id" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []

  // "Id." marker
  const idNode = node("id", "Id.", "Id.", "marker", text)
  idNode.relation = { type: "resolves", description: "id." }
  children.push(idNode)

  if (c.pincite !== undefined) {
    // "at"
    const atIdx = text.indexOf(" at ", idNode.charEnd)
    if (atIdx >= 0) {
      children.push({
        label: "at",
        displayLabel: "at",
        value: "at",
        category: "marker",
        presence: "present",
        charStart: atIdx + 1,
        charEnd: atIdx + 3,
      })
    }
    children.push(node("pincite", "Pin.", String(c.pincite), "reference", text, idNode.charEnd))
  }

  return rootNode("id", text, c.confidence, children)
}

function decomposeSupra(
  c: Extract<Citation, { type: "supra" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.partyName) {
    const party = node("partyName", "Party", c.partyName, "identity", text, cursor)
    party.relation = { type: "resolves", description: "supra" }
    children.push(party)
    cursor = party.charEnd
  }

  // "supra" marker
  const supraIdx = text.indexOf("supra", cursor)
  if (supraIdx >= 0) {
    children.push({
      label: "supra",
      displayLabel: "supra",
      value: "supra",
      category: "marker",
      presence: "present",
      charStart: supraIdx,
      charEnd: supraIdx + 5,
    })
    cursor = supraIdx + 5
  }

  if (c.pincite !== undefined) {
    const atIdx = text.indexOf(" at ", cursor)
    if (atIdx >= 0) {
      children.push({
        label: "at",
        displayLabel: "at",
        value: "at",
        category: "marker",
        presence: "present",
        charStart: atIdx + 1,
        charEnd: atIdx + 3,
      })
    }
    children.push(node("pincite", "Pin.", String(c.pincite), "reference", text, cursor))
  }

  return rootNode("supra", text, c.confidence, children)
}

function decomposeShortFormCase(
  c: Extract<Citation, { type: "shortFormCase" }>,
  text: string,
): DiagramNode {
  const children: DiagramNode[] = []
  let cursor = 0

  if (c.signal) {
    const sig = node("signal", "Sig.", c.signal, "signal", text, cursor)
    children.push(sig)
    cursor = sig.charEnd
  }

  const vol = node("volume", "Vol.", String(c.volume), "locator", text, cursor)
  vol.relation = { type: "resolves", description: "short form" }
  children.push(vol)
  cursor = vol.charEnd

  const rptr = node("reporter", "Rptr.", c.reporter, "locator", text, cursor)
  children.push(rptr)
  cursor = rptr.charEnd

  if (c.pincite !== undefined) {
    const atIdx = text.indexOf(" at ", cursor)
    if (atIdx >= 0) {
      children.push({
        label: "at",
        displayLabel: "at",
        value: "at",
        category: "marker",
        presence: "present",
        charStart: atIdx + 1,
        charEnd: atIdx + 3,
      })
    }
    children.push(node("pincite", "Pin.", String(c.pincite), "reference", text, cursor))
  } else if (c.page !== undefined) {
    children.push(node("page", "Page", String(c.page), "locator", text, cursor))
  }

  return rootNode("shortFormCase", text, c.confidence, children)
}
