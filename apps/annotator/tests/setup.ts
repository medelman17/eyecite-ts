// tests/setup.ts — load apps/annotator/.env into process.env for integration tests (no-op if absent)
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const envPath = fileURLToPath(new URL("../.env", import.meta.url))
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}
