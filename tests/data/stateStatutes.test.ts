import { describe, expect, it } from "vitest"
import { escapeForRegex } from "@/data/stateStatutes"

describe("escapeForRegex", () => {
  it("should handle dotted abbreviations like T.C.A.", () => {
    const result = escapeForRegex("T.C.A.")
    expect("T.C.A.").toMatch(new RegExp(result))
    expect("TCA").toMatch(new RegExp(result))
    expect("T C A").toMatch(new RegExp(result))
  })

  it("should handle word.space patterns like Conn. Gen. Stat.", () => {
    const result = escapeForRegex("Conn. Gen. Stat.")
    expect("Conn. Gen. Stat.").toMatch(new RegExp(result))
    expect("Conn Gen Stat").toMatch(new RegExp(result))
    expect("Conn.  Gen.  Stat.").toMatch(new RegExp(result))
  })

  it("should handle plain words like Alaska Stat.", () => {
    const result = escapeForRegex("Alaska Stat.")
    expect("Alaska Stat.").toMatch(new RegExp(result))
    expect("Alaska Stat").toMatch(new RegExp(result))
    expect("Alaska  Stat.").toMatch(new RegExp(result))
  })

  it("should handle abbreviations without periods like MCL", () => {
    const result = escapeForRegex("MCL")
    expect("MCL").toMatch(new RegExp(result))
  })

  it("should handle mixed patterns like N.H. Rev. Stat. Ann.", () => {
    const result = escapeForRegex("N.H. Rev. Stat. Ann.")
    expect("N.H. Rev. Stat. Ann.").toMatch(new RegExp(result))
    expect("NH Rev Stat Ann").toMatch(new RegExp(result))
  })
})
