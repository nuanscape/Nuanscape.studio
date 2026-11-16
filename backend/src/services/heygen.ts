import { AppError } from '../lib/errors.js'
import { downloadToFile } from '../lib/download.js'

const API_BASE = 'https://api.heygen.com'
const DEFAULT_MODEL = 'heygen-voice-1-turbo-free'
const DEFAULT_LANGUAGE = 'id'
const DEFAULT_TIMEOUT_MS = 180_000
const VOICE_LIST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3

interface HeyGenVoice {
  voice_id?: string
  name?: string
  language?: string | null
  gender?: string | null
  status?: string
}

export interface HeyGenResult {
  voiceId: string
  model: string
  duration: number
  audioUrl: string
}

let cachedVoiceId = ''

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY?.trim()
  if (!key) {
    throw new AppError(
      503,
      'TTS_PROVIDER_NOT_CONFIGURED',
      'HEYGEN_API_KEY belum diisi; narasi HeyGen tidak dapat dibuat.',
    )
  }
  return key
}

function timeoutMs(): number {
  const raw = Number.parseInt(process.env.HEYGEN_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS
  return Math.max(30_000, raw)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new AppError(502, 'TTS_PROVIDER_BAD_RESPONSE', 'HeyGen mengembalikan respons non-JSON.')
  }
}

function errorMessage(payload: Record<string, unknown>, fallback: string): string {
  const error = payload.error
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim()) return message
  }
  const message = payload.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

async function resolveVoiceId(key: string): Promise<string> {
  const configured = process.env.HEYGEN_VOICE_ID?.trim()
  if (configured) return configured
  if (cachedVoiceId) return cachedVoiceId

  const language = process.env.HEYGEN_LANGUAGE?.trim() || DEFAULT_LANGUAGE
  const params = new URLSearchParams({ type: 'public', language, limit: '50' })
  const gender = process.env.HEYGEN_GENDER?.trim()
  if (gender) params.set('gender', gender)

  let response: Response
  try {
    response = await fetch(`${API_BASE}/v3/models/audio/voices?${params.toString()}`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(VOICE_LIST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      504,
      'TTS_PROVIDER_TIMEOUT',
      `HeyGen voice list timeout: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }
  const payload = await readJson(response)
  if (!response.ok) {
    throw new AppError(
      502,
      'TTS_PROVIDER_FAILED',
      `HeyGen voice list gagal: ${errorMessage(payload, `HTTP ${response.status}`)}`,
    )
  }

  const voices = Array.isArray(payload.data) ? (payload.data as HeyGenVoice[]) : []
  const active = voices.find(
    (voice) => voice.status === 'ACTIVE' && typeof voice.voice_id === 'string',
  )
  if (!active || typeof active.voice_id !== 'string') {
    throw new AppError(
      503,
      'TTS_VOICE_NOT_FOUND',
      `Tidak ada voice HeyGen aktif untuk bahasa "${language}". Set HEYGEN_VOICE_ID manual.`,
    )
  }
  cachedVoiceId = active.voice_id
  return cachedVoiceId
}

export async function synthesizeHeyGen(text: string, out: string): Promise<HeyGenResult> {
  const key = apiKey()
  const voiceId = await resolveVoiceId(key)
  const model = process.env.HEYGEN_MODEL?.trim() || DEFAULT_MODEL
  const language = process.env.HEYGEN_LANGUAGE?.trim() || DEFAULT_LANGUAGE

  const spoken = text.trim().slice(0, 10_000)
  if (!spoken) {
    throw new AppError(400, 'TTS_TEXT_EMPTY', 'Teks narasi HeyGen kosong.')
  }

  const body: Record<string, unknown> = {
    model,
    voice_id: voiceId,
    text: spoken,
  }
  if (language) body.language = language

  let response: Response | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(`${API_BASE}/v3/models/audio/tts`, {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs()),
      })
    } catch (error) {
      throw new AppError(
        504,
        'TTS_PROVIDER_TIMEOUT',
        `HeyGen tidak merespons: ${error instanceof Error ? error.message : 'timeout'}`,
      )
    }

    if (response.status !== 429 || attempt === MAX_ATTEMPTS) break
    const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10)
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 5_000)
  }

  if (!response) {
    throw new AppError(502, 'TTS_PROVIDER_FAILED', 'HeyGen tidak mengembalikan respons.')
  }
  const payload = await readJson(response)
  if (!response.ok) {
    throw new AppError(
      502,
      'TTS_PROVIDER_FAILED',
      `HeyGen TTS gagal: ${errorMessage(payload, `HTTP ${response.status}`)}`,
    )
  }

  const data = (payload.data ?? {}) as Record<string, unknown>
  const audioUrl = data.audio_url
  if (typeof audioUrl !== 'string' || !audioUrl) {
    throw new AppError(502, 'TTS_PROVIDER_BAD_RESPONSE', 'HeyGen tidak mengembalikan audio_url.')
  }

  await downloadToFile(audioUrl, out, DOWNLOAD_TIMEOUT_MS, 'Audio HeyGen')
  return {
    voiceId,
    model,
    duration: typeof data.duration === 'number' ? data.duration : 0,
    audioUrl,
  }
}

export function resetHeyGenVoiceCache(): void {
  cachedVoiceId = ''
}
