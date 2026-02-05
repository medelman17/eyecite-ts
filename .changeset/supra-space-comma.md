---
"eyecite-ts": patch
---

Fix supra pattern failing when a space precedes the comma (e.g., "Twombly , supra"), which occurs when HTML tags are cleaned from text like `<em>Twombly</em>, supra`.
