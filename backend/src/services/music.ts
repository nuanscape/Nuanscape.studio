import path from 'node:path'
import { synthesizeMusicBed } from './music-bed.js'
import { synthesizeSunoMusic } from './suno.js'

export type MusicProvider = 'suno' | 'procedural'

export const DEFAULT_MUSIC_TRACK_COUNT = 5
export const MAX_MUSIC_TRACK_COUNT = 5

export interface MusicBed {
  provider: MusicProvider
  files: string[]
}

export function normalizeMusicTrackCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_MUSIC_TRACK_COUNT
  return Math.min(MAX_MUSIC_TRACK_COUNT, Math.max(1, Math.round(value as number)))
}

const VARIATION_DIRECTIONS = [
  'alternate chord progression and melody',
  'different drum groove and percussion texture',
  'different bassline and low-end movement',
  'different intro and outro arrangement',
  'different layering of the same instruments',
]

export function musicVariationPrompt(base: string, index: number, total: number): string {
  const clean = base.trim() || 'instrumental background music'
  if (index === 0) return clean
  const direction = VARIATION_DIRECTIONS[index % VARIATION_DIRECTIONS.length]
  return `${clean}. Variation ${index + 1}/${total}: keep exactly the same genre, type, mood, and tempo range, but use a different ${direction}; instrumental, no vocals.`
}

function musicTrackPath(out: string, index: number, total: number): string {
  if (total <= 1) return out
  const extension = path.extname(out) || '.mp3'
  return `${out.slice(0, out.length - extension.length)}-${index + 1}${extension}`
}

export function musicProvider(): MusicProvider {
  return process.env.MUSIC_PROVIDER?.trim() === 'procedural' ? 'procedural' : 'suno'
}

export function musicFileExtension(): '.mp3' | '.wav' {
  return musicProvider() === 'suno' ? '.mp3' : '.wav'
}

export async function buildMusicBed(
  style: string,
  seconds: number,
  out: string,
  prompt?: string,
  title?: string,
  apiKey?: string,
  trackCount = 1,
): Promise<MusicBed> {
  if (musicProvider() === 'suno') {
    const count = normalizeMusicTrackCount(trackCount)
    const files = Array.from({ length: count }, (_, index) => musicTrackPath(out, index, count))
    const basePrompt = prompt?.trim() || style
    await Promise.all(
      files.map((file, index) =>
        synthesizeSunoMusic(
          musicVariationPrompt(basePrompt, index, count),
          seconds,
          file,
          title ? `${title} - Track ${index + 1}` : 'Nuanscape Bed',
          apiKey,
        ),
      ),
    )
    return { provider: 'suno', files }
  }
  await synthesizeMusicBed(style, seconds, out)
  return { provider: 'procedural', files: [out] }
}
