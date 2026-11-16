import { writeFile } from 'node:fs/promises'

const SAMPLE_RATE = 44100

interface Recipe {
  bpm: number
  chords: number[][]
  padGain: number
  bassGain: number
  arpGain: number
  drums: boolean
  noiseGain: number
  crackleGain: number
}

const RECIPES: Record<string, Recipe> = {
  lofi: {
    bpm: 76,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 65],
    ],
    padGain: 0.16,
    bassGain: 0.24,
    arpGain: 0.14,
    drums: true,
    noiseGain: 0.035,
    crackleGain: 0.05,
  },
  vinyl: {
    bpm: 76,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [48, 52, 55, 59],
      [55, 59, 62, 65],
    ],
    padGain: 0.16,
    bassGain: 0.24,
    arpGain: 0.14,
    drums: true,
    noiseGain: 0.045,
    crackleGain: 0.09,
  },
  jazzhop: {
    bpm: 84,
    chords: [
      [50, 53, 57, 60],
      [46, 50, 53, 57],
      [48, 52, 55, 59],
      [45, 49, 52, 55],
    ],
    padGain: 0.14,
    bassGain: 0.25,
    arpGain: 0.16,
    drums: true,
    noiseGain: 0.03,
    crackleGain: 0.06,
  },
  ambient: {
    bpm: 58,
    chords: [
      [57, 64, 69],
      [53, 60, 65],
      [48, 55, 60],
      [55, 62, 67],
    ],
    padGain: 0.24,
    bassGain: 0.16,
    arpGain: 0.06,
    drums: false,
    noiseGain: 0.07,
    crackleGain: 0.02,
  },
  piano: {
    bpm: 68,
    chords: [
      [48, 55, 60, 64],
      [53, 57, 60, 65],
      [55, 59, 62, 67],
      [48, 52, 55, 60],
    ],
    padGain: 0.08,
    bassGain: 0.2,
    arpGain: 0.22,
    drums: false,
    noiseGain: 0.015,
    crackleGain: 0.02,
  },
  strings: {
    bpm: 64,
    chords: [
      [50, 57, 62, 65],
      [46, 53, 58, 62],
      [48, 55, 60, 64],
      [45, 52, 57, 60],
    ],
    padGain: 0.26,
    bassGain: 0.18,
    arpGain: 0.07,
    drums: false,
    noiseGain: 0.025,
    crackleGain: 0.01,
  },
  acoustic: {
    bpm: 72,
    chords: [
      [55, 59, 62, 67],
      [50, 55, 59, 64],
      [48, 52, 55, 60],
      [53, 57, 60, 65],
    ],
    padGain: 0.1,
    bassGain: 0.22,
    arpGain: 0.2,
    drums: false,
    noiseGain: 0.02,
    crackleGain: 0.03,
  },
  'dark-ambient': {
    bpm: 52,
    chords: [
      [45, 52, 57],
      [43, 50, 55],
      [41, 48, 53],
      [43, 50, 57],
    ],
    padGain: 0.3,
    bassGain: 0.18,
    arpGain: 0.03,
    drums: false,
    noiseGain: 0.08,
    crackleGain: 0.03,
  },
  suspense: {
    bpm: 60,
    chords: [
      [43, 50, 55],
      [44, 51, 56],
      [43, 50, 55],
      [46, 53, 58],
    ],
    padGain: 0.24,
    bassGain: 0.2,
    arpGain: 0.04,
    drums: false,
    noiseGain: 0.05,
    crackleGain: 0.03,
  },
  mystery: {
    bpm: 62,
    chords: [
      [41, 48, 53],
      [46, 53, 58],
      [43, 50, 55],
      [48, 55, 60],
    ],
    padGain: 0.26,
    bassGain: 0.2,
    arpGain: 0.05,
    drums: false,
    noiseGain: 0.06,
    crackleGain: 0.03,
  },
  synthwave: {
    bpm: 92,
    chords: [
      [45, 52, 57, 60],
      [41, 48, 53, 57],
      [43, 50, 55, 59],
      [48, 55, 60, 64],
    ],
    padGain: 0.16,
    bassGain: 0.26,
    arpGain: 0.18,
    drums: true,
    noiseGain: 0.02,
    crackleGain: 0.015,
  },
}

function recipeFor(style: string): Recipe {
  const key = style.toLowerCase().trim()
  const direct = RECIPES[key]
  if (direct) return direct
  if (key.includes('synth')) return pickRecipe('synthwave')
  if (key.includes('jazz')) return pickRecipe('jazzhop')
  if (key.includes('ambient') && key.includes('dark')) return pickRecipe('dark-ambient')
  if (key.includes('ambient')) return pickRecipe('ambient')
  if (key.includes('piano')) return pickRecipe('piano')
  if (key.includes('string')) return pickRecipe('strings')
  if (key.includes('acoustic') || key.includes('guitar')) return pickRecipe('acoustic')
  if (key.includes('mystery')) return pickRecipe('mystery')
  if (key.includes('suspense')) return pickRecipe('suspense')
  if (key.includes('vinyl')) return pickRecipe('vinyl')
  return pickRecipe('lofi')
}

function pickRecipe(name: string): Recipe {
  return RECIPES[name] ?? (RECIPES.lofi as Recipe)
}

function noteFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class StereoBuffer {
  readonly left: Float32Array
  readonly right: Float32Array
  readonly length: number

  constructor(seconds: number) {
    this.length = Math.ceil(seconds * SAMPLE_RATE)
    this.left = new Float32Array(this.length)
    this.right = new Float32Array(this.length)
  }

  addTone(
    start: number,
    duration: number,
    frequency: number,
    gain: number,
    pan: number,
    attack: number,
    release: number,
    pluck: boolean,
    detune = 0,
  ): void {
    const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE))
    const endSample = Math.min(this.length, Math.ceil((start + duration) * SAMPLE_RATE))
    if (endSample <= startSample) return
    const attackSamples = Math.max(1, attack * SAMPLE_RATE)
    const releaseSamples = Math.max(1, release * SAMPLE_RATE)
    const total = endSample - startSample
    const leftGain = Math.cos(((pan + 1) * Math.PI) / 4) * gain
    const rightGain = Math.sin(((pan + 1) * Math.PI) / 4) * gain
    const angular = (2 * Math.PI * frequency) / SAMPLE_RATE
    const detuneAngular = (2 * Math.PI * frequency * (1 + detune)) / SAMPLE_RATE

    for (let i = 0; i < total; i += 1) {
      const attackEnvelope = Math.min(1, i / attackSamples)
      const releaseEnvelope = Math.min(1, (total - i) / releaseSamples)
      const envelope = pluck
        ? Math.min(attackEnvelope, 1) * Math.exp((-3.4 * i) / total) * releaseEnvelope
        : attackEnvelope * releaseEnvelope
      const phase = angular * i
      const sample =
        Math.sin(phase) * 0.78 +
        Math.sin(phase * 2) * 0.14 +
        Math.sin(detuneAngular * i) * 0.08
      const value = sample * envelope
      const index = startSample + i
      this.left[index] = (this.left[index] ?? 0) + value * leftGain
      this.right[index] = (this.right[index] ?? 0) + value * rightGain
      if (pluck) {
        const second = Math.sin(phase * 1.5) * Math.exp((-5.2 * i) / total) * 0.12
        this.left[index] = (this.left[index] ?? 0) + second * leftGain
        this.right[index] = (this.right[index] ?? 0) + second * rightGain
      }
    }
  }

  addKick(start: number, gain: number): void {
    const duration = 0.28
    const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE))
    const endSample = Math.min(this.length, Math.ceil((start + duration) * SAMPLE_RATE))
    for (let index = startSample; index < endSample; index += 1) {
      const t = (index - startSample) / SAMPLE_RATE
      const envelope = Math.exp(-22 * t)
      const frequency = 46 + 54 * Math.exp(-32 * t)
      const value = Math.sin(2 * Math.PI * frequency * t) * envelope * gain
      this.left[index] = (this.left[index] ?? 0) + value
      this.right[index] = (this.right[index] ?? 0) + value
    }
  }

  addSnare(start: number, gain: number, random: () => number): void {
    const duration = 0.18
    const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE))
    const endSample = Math.min(this.length, Math.ceil((start + duration) * SAMPLE_RATE))
    for (let index = startSample; index < endSample; index += 1) {
      const t = (index - startSample) / SAMPLE_RATE
      const envelope = Math.exp(-24 * t)
      const noise = random() * 2 - 1
      const tone = Math.sin(2 * Math.PI * 184 * t) * 0.35
      const value = (noise * 0.65 + tone) * envelope * gain
      this.left[index] = (this.left[index] ?? 0) + value * 0.82
      this.right[index] = (this.right[index] ?? 0) + value * 0.82
    }
  }

  addHat(start: number, gain: number, random: () => number): void {
    const duration = 0.07
    const startSample = Math.max(0, Math.floor(start * SAMPLE_RATE))
    const endSample = Math.min(this.length, Math.ceil((start + duration) * SAMPLE_RATE))
    for (let index = startSample; index < endSample; index += 1) {
      const t = (index - startSample) / SAMPLE_RATE
      const envelope = Math.exp(-48 * t)
      const value = (random() * 2 - 1) * envelope * gain
      this.left[index] = (this.left[index] ?? 0) + value * 0.62
      this.right[index] = (this.right[index] ?? 0) + value * 0.62
    }
  }

  addCrackle(gain: number, random: () => number): void {
    let impulse = 0
    for (let index = 0; index < this.length; index += 1) {
      if (random() < 0.00055) impulse = (random() * 2 - 1) * gain
      impulse *= 0.72
      this.left[index] = (this.left[index] ?? 0) + impulse
      this.right[index] = (this.right[index] ?? 0) + impulse * 0.86
    }
  }

  addNoise(gain: number, random: () => number): void {
    let low = 0
    let high = 0
    for (let index = 0; index < this.length; index += 1) {
      const white = random() * 2 - 1
      low = low * 0.993 + white * 0.007
      high = high * 0.84 + low * 0.16
      const value = high * gain
      this.left[index] = (this.left[index] ?? 0) + value
      this.right[index] = (this.right[index] ?? 0) + value * 0.92
    }
  }

  finish(duration: number): Buffer {
    let peak = 0
    for (let index = 0; index < this.length; index += 1) {
      peak = Math.max(peak, Math.abs(this.left[index] ?? 0), Math.abs(this.right[index] ?? 0))
    }
    const scale = peak > 0 ? 0.86 / peak : 1
    const fadeIn = Math.floor(0.6 * SAMPLE_RATE)
    const fadeOut = Math.floor(1.2 * SAMPLE_RATE)
    const total = Math.min(this.length, Math.ceil(duration * SAMPLE_RATE))
    const buffer = Buffer.alloc(44 + total * 4)
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(36 + total * 4, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(2, 22)
    buffer.writeUInt32LE(SAMPLE_RATE, 24)
    buffer.writeUInt32LE(SAMPLE_RATE * 4, 28)
    buffer.writeUInt16LE(4, 32)
    buffer.writeUInt16LE(16, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(total * 4, 40)
    for (let index = 0; index < total; index += 1) {
      const fade = Math.min(1, index / fadeIn, (total - index) / fadeOut)
      const left = Math.tanh((this.left[index] ?? 0) * scale * fade)
      const right = Math.tanh((this.right[index] ?? 0) * scale * fade)
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left * 32767))), 44 + index * 4)
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right * 32767))), 46 + index * 4)
    }
    return buffer
  }
}

export async function synthesizeMusicBed(style: string, seconds: number, out: string): Promise<void> {
  const recipe = recipeFor(style)
  const duration = Math.max(4, seconds)
  const buffer = new StereoBuffer(duration)
  const random = mulberry32(0x9e3779b9)
  const beat = 60 / recipe.bpm
  const bar = beat * 4
  const chordLength = bar

  for (let start = 0; start < duration; start += chordLength) {
    const chord = recipe.chords[Math.floor(start / chordLength) % recipe.chords.length] ?? recipe.chords[0]
    if (!chord) break
    const chordDuration = Math.min(chordLength + 0.8, duration - start)
    if (chordDuration <= 0) break
    for (const [voice, note] of chord.entries()) {
      if (note === undefined) continue
      const pan = (voice - (chord.length - 1) / 2) * 0.18
      buffer.addTone(
        start,
        chordDuration,
        noteFrequency(note),
        recipe.padGain,
        pan,
        0.7,
        1.1,
        false,
        0.0018,
      )
      buffer.addTone(
        start,
        chordDuration,
        noteFrequency(note) * 2,
        recipe.padGain * 0.18,
        -pan,
        1.2,
        1.4,
        false,
        0.0012,
      )
    }

    const root = chord[0]
    if (root === undefined) continue
    buffer.addTone(start, Math.min(beat * 2.2, duration - start), noteFrequency(root - 12), recipe.bassGain, 0, 0.02, 0.35, true)
    buffer.addTone(
      start + beat * 2,
      Math.min(beat * 1.8, duration - start - beat * 2),
      noteFrequency(root - 12),
      recipe.bassGain * 0.8,
      0,
      0.02,
      0.3,
      true,
    )

    const arpNotes = [...chord.slice(1), root + 12]
    for (let step = 0; step * (beat / 2) + start < Math.min(duration, start + chordLength); step += 1) {
      const note = arpNotes[step % arpNotes.length]
      if (note === undefined) break
      const offset = start + step * (beat / 2)
      const remaining = duration - offset
      if (remaining <= 0.08) break
      buffer.addTone(
        offset,
        Math.min(beat * 0.42, remaining),
        noteFrequency(note + 12),
        recipe.arpGain,
        step % 2 === 0 ? -0.32 : 0.32,
        0.005,
        0.16,
        true,
      )
    }

    if (recipe.drums) {
      for (let b = 0; b < 4; b += 1) {
        const offset = start + b * beat
        if (offset >= duration) break
        if (b === 0 || b === 2) buffer.addKick(offset, 0.34)
        if (b === 1 || b === 3) buffer.addSnare(offset, 0.16, random)
        buffer.addHat(offset + beat / 2, 0.06, random)
      }
    }
  }

  if (recipe.crackleGain > 0) buffer.addCrackle(recipe.crackleGain, random)
  if (recipe.noiseGain > 0) buffer.addNoise(recipe.noiseGain, random)
  await writeFile(out, buffer.finish(duration))
}
