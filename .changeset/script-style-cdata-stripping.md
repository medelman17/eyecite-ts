---
"eyecite-ts": patch
---

fix(clean): strip `<script>` / `<style>` bodies and unwrap `<![CDATA[…]]>` markers in `stripHtmlTags` (#559, #561)

`stripHtmlTags` previously ran a single tag-shape regex over the whole document, with two side effects:

- `<script>` / `<style>` bodies were preserved (only the opening and closing tags were stripped), so JS string literals like `"999 F.2d 999"` and CSS `content:` values leaked into the cleaned text and the tokenizer happily emitted phantom citations from them (#559).
- `<![CDATA[…]]>` sections matched the tag regex as one greedy "tag" (the leading `!` was in the allowed set and the section contains no `>` until the very end), so the entire body — including any embedded citation — was deleted (#561).

`stripHtmlTags` now runs three pre-passes before the generic tag-stripper: delete `<script>…</script>` bodies in full, delete `<style>…</style>` bodies in full, and unwrap `<![CDATA[…]]>` markers (keep the body, drop the markup). Script/style body matching is non-greedy so an unclosed opener does not eat the rest of the document.
