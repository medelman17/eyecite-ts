---
---

CI/test only (no runtime or package changes): verify the published tarball loads on Node 18 by building + packing once (Node 20+) and consuming that artifact across a Node 18/20/22 matrix, and enforce the vitest coverage thresholds that were previously silently ignored (they sat at the wrong config level). Closes #776.
