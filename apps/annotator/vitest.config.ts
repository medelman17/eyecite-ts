import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one Postgres instance; run test files serially so they
    // never race on the shared DB (parallel workers caused occasional flakes).
    fileParallelism: false,
  },
})
