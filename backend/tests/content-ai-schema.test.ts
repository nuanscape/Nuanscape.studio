import { describe, expect, it } from 'vitest'
import { researchSchema } from '../src/services/content-ai.js'

const baseIdea = {
  title: 'Lofi Chill Sunset Drive',
  hook: 'Hook yang cukup panjang untuk ide konten.',
  angle: 'Angle yang cukup panjang untuk ide konten.',
  thumbnail: 'Konsep visual dengan teks overlay singkat.',
  score: 88,
}

describe('researchSchema', () => {
  it('menerima reference lebih dari 400 karakter seperti output provider', () => {
    const reference = 'a'.repeat(443)
    const parsed = researchSchema.parse({ ideas: [{ ...baseIdea, reference }] })
    expect(parsed.ideas[0]?.reference).toBe(reference)
  })

  it('memotong reference yang melebihi batas 800 karakter', () => {
    const parsed = researchSchema.parse({
      ideas: [{ ...baseIdea, reference: 'b'.repeat(900) }],
    })
    expect(parsed.ideas[0]?.reference).toHaveLength(800)
  })
})
