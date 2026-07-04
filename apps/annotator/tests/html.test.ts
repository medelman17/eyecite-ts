// apps/annotator/tests/html.test.ts
import { expect, it } from "vitest"
import { stripHtml } from "../src/html.js"

it("strips tags, decodes entities, preserves paragraph breaks", () => {
  expect(stripHtml("<p>Smith v. Jones, 1 U.S. 1.</p><p>Id. at 5.</p>")).toBe(
    "Smith v. Jones, 1 U.S. 1.\n\nId. at 5.",
  )
  expect(stripHtml('See <a href="x">Smith &amp; Co.</a>')).toBe("See Smith & Co.")
})
