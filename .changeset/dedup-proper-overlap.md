---
"eyecite-ts": patch
---

fix(extract): drop tokens properly overlapped by higher-priority tokens during dedup (#558)

Block-element fusion in HTML input — e.g. `<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>` — cleaned to `500 F.2d 123 Then citing 600 F.2d 234`. The broad journal regex then matched `123 Then citing 600` as a phantom journal cite that overlapped the trailing page of the first real cite AND the leading volume of the second. The previous dedup pass only handled strict containment, so the phantom slipped through alongside the two real federal-reporter citations.

A second dedup pass now walks the surviving tokens in priority order and drops any token properly overlapped by a higher-priority kept token. Strict containment is still handled by the first pass; equal-priority overlaps are still preserved. The two real `500 F.2d 123` and `600 F.2d 234` cites survive, the phantom journal does not. Cleaned text and span positions are unchanged.

Closes #558. Sprint A's #583 word-neighbor space insertion already prevented the worst form of fusion (digits → letters with no separator); this commit removes the secondary symptom.
