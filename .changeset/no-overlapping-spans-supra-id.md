---
"eyecite-ts": patch
---

Fix `extractCitations` producing overlapping core spans on `Case, supra, vol Reporter page` and `vol Id. page` patterns (#549).

Two tokenizer collisions slipped through the existing containment-only dedup pass and produced overlapping `span.cleanStart`/`cleanEnd` pairs on roughly 4-5% of CAP-corpus opinions:

- **Mode A** — `Barrett, supra, 229 Conn. 274-76`. `SUPRA_PATTERN`'s Connecticut comma-pincite alternative (`, NNN`, #353) greedily consumed the `229` as supra's pincite, even though the digits are actually the volume of a following full citation. The result: a `supra` span ending at `229` overlapping a `case`/`journal` span starting at `229`. `ID_PATTERN` and `IBID_PATTERN` exhibited the identical bug on the same shape.
- **Mode B** — `Hawkins v. Giles, 45 Id. 318`. The broad `state-reporter` and `law-review` patterns treated `Id.` as a reporter abbreviation, matching `45 Id. 318` as a full case citation. The correct `id` pattern matched `Id.` at the same time, producing a contained-overlap pair that the priority dedup kept around (because the `id` token has higher priority and the existing rule only drops the contained side).

The overlapping spans were the root cause of #545 (annotate sentinel corruption, already defended downstream) and broke `fullSpan` splice logic in #543.

Fix is at the regex layer so the overlap is never produced — keeping both legitimate citations cleanly:

- `SUPRA_PATTERN` / `ID_PATTERN` / `IBID_PATTERN` comma-pincite branches gain `(?!\d+\s+[A-Z])` so the comma-pincite does not fire when the digits are followed by a reporter shape. The legitimate Connecticut comma-pincite (`Smith, supra, 522.`) keeps working because its digits are not followed by a capital-letter reporter.
- `state-reporter` (in `casePatterns`) and `law-review` (in `journalPatterns`) gain `(?!(?:Ibid|Id)\.?\s+\d)` after the volume so `Id.` / `Ibid.` cannot masquerade as reporter abbreviations. `Idaho` and other reporters starting with `Id` are unaffected — the lookahead only fires on the short-form shape (`Id.` / `Ibid.` immediately followed by a page digit).
- The mirrored regexes inside `extractShortForms.ts` (`idRegex`, `partySupraRegex`) gain the same lookahead so the tokenizer and the re-extractor stay in lock-step.
