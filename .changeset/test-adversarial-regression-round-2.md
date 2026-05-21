---
"eyecite-ts": patch
---

test(extract): adversarial-input regression suite round 2 — 16 passing + 4 documented gaps

Continued probing the extractor with adversarial inputs. Added 20 more
regression tests in `tests/extract/issueAdversarialInputs2.test.ts`:

**Verified safe today (16 passing):**
- Form feed character (`\f`) and line breaks inside citations normalize correctly
- String citation grouping with `;` separator and `and` connector
- String cites with mixed leading signals (`See`, `see also`, `cf.`)
- `Id.` resolves to immediately preceding case (with `resolve: true`)
- `Id.` chain anchors to MOST RECENT case across multiple
- `Id.` skips over intervening statute and resolves to the case
- `Id.` without antecedent doesn't crash (resolvedTo = undefined)
- `supra` after parallel cite resolves to the parallel group
- Non-English party names (accented characters)
- Annotation roundtrip with template wrapping
- Annotation handles overlapping cites
- Annotation no-op when neither template nor callback provided
- Bare-section pincite (`100 F.2d 100` with no pincite) extracts

**Documented gaps (4 `it.todo`):**
- Soft hyphen `­` (U+00AD) inside reporter breaks extraction (PDF artifact)
- Page-number artifact `Smith, 100\n— 14 —\nF.2d 123` breaks extraction
- Paragraph pincite `¶ 12` not captured by pincite parser
- URL with citation-shaped path doesn't currently false-positive (documented invariant)

No production code changes — pure verification + documentation of current
behavior. The annotate-roundtrip tests are particularly valuable since
the annotation API hasn't had broad smoke coverage in the regression
suite before.
