---
"eyecite-ts": patch
---

fix(extract): preserve trailing `(year)` paren after a bare `at`-pincite
(#552)

`Smith v. Jones, 491 S.W.2d 636 at 638 (1973)` returned `pincite=638`,
`year=undefined`, `court=undefined`. The LOOKAHEAD_PINCITE_REGEX captured
the at-pincite correctly, but LOOKAHEAD_PAREN_REGEX only accepted the
comma form (`,\s*[at\s+]?\d+`) as a pincite-skip prefix. With ` at 638`
(no leading comma), the regex failed to advance past the pincite and
never reached the trailing `(1973)` paren. The comma-bearing forms
(`, 638 (1973)`, `, at 638 (1973)`) already worked.

Extends LOOKAHEAD_PAREN_REGEX to accept ` at [pp.|pages] *N[-N]` as an
alternative pincite-skip prefix, mirroring the leading branch of
LOOKAHEAD_PINCITE_REGEX:

    /^(?:(?:,\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?
          |\s+at\s+(?:(?:pp?\.|pages?)\s*)?)
        \*?\d+(?:-\d+)?)*
     (?:\s+(?:n|note)\s*\.?\s*\d+)?\s*\(([^)]+)\)/

Covers star-pagination (`at *3`), spelled-out page prefix (`at p. 638`,
`at pp. 638-640`, `at page 638`), and ranges (`at 638-640`). Existing
comma-bearing forms continue to work; the at-form is repeatable for
parity with the comma form.
