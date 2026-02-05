import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

interface BundleCheck {
  file: string
  maxSizeKb: number
}

const checks: BundleCheck[] = [
  { file: 'dist/index.mjs', maxSizeKb: 50 },         // Core bundle <50KB
  { file: 'dist/data/index.mjs', maxSizeKb: 100 },   // Data chunk can be larger
  { file: 'dist/annotate/index.mjs', maxSizeKb: 20 }, // Annotation layer small
]

let failed = false

for (const { file, maxSizeKb } of checks) {
  try {
    const content = readFileSync(file, 'utf-8')
    const gzipped = gzipSync(content)
    const sizeKb = gzipped.length / 1024

    const status = sizeKb <= maxSizeKb ? '✓' : '✗'
    console.log(`${status} ${file}: ${sizeKb.toFixed(1)} KB (max: ${maxSizeKb} KB)`)

    if (sizeKb > maxSizeKb) {
      failed = true
    }
  } catch {
    console.error(`✗ ${file}: File not found`)
    failed = true
  }
}

if (failed) {
  console.error('\nBundle size check FAILED')
  process.exit(1)
} else {
  console.log('\nBundle size check PASSED')
}
