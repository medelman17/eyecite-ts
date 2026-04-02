import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "data/index": "src/data/index.ts",
    "annotate/index": "src/annotate/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  minify: true,
  sourcemap: true,
  outDir: "dist",
  declaration: {
    resolve: true,
  },
})
