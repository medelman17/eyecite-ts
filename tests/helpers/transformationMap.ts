import type { TransformationMap } from "@/types/span"

/** Create a TransformationMap where clean positions equal original positions. */
export function createIdentityMap(): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i < 1000; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}

/** Create a TransformationMap where original = clean + offset. */
export function createOffsetMap(offset: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i < 1000; i++) {
    cleanToOriginal.set(i, i + offset)
    originalToClean.set(i + offset, i)
  }
  return { cleanToOriginal, originalToClean }
}
