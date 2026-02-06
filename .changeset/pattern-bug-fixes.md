---
"eyecite-ts": patch
---

Fix four tokenization pattern bugs discovered during corpus testing:

- **Bug #44**: Added F. App'x (Federal Appendix) support - added apostrophe variant to federal-reporter pattern and updated extraction regex
- **Bug #46**: Added USC without periods support - pattern now matches both "U.S.C." and "USC"
- **Bug #47**: Added C.F.R. (Code of Federal Regulations) pattern - new statute pattern for CFR citations
- **Bug #48**: Made "No." optional in Public Law citations - pattern now matches both "Pub. L. No." and "Pub. L."

These fixes promote 4 test cases from known limitations to passing tests, improving extraction coverage for federal citations with variant formats.
