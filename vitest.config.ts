import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Generate the gitignored reporters.gen.ts before any test runs, so
    // `pnpm exec vitest run` (which skips the `pretest` lifecycle hook) works
    // on a fresh clone. See tests/setup/generateReporters.ts and #642.
    globalSetup: ["./tests/setup/generateReporters.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/types/**", "src/data/reporters.gen.ts"],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    testTimeout: 10000,
  },
})
