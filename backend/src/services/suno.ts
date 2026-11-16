import { AppError } from '../lib/errors.js'
import { downloadToFile } from '../lib/download.js'

const DEFAULT_TIMEOUT_MS = 300_000
const MIN_TIMEOUT_MS = 60_000
const DEFAULT_POLL_INTERVAL_MS = 3_000
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 60_000

export interface SunoResult {
  taskId: string
  trackId: string
  audioUrl: string
  duration: number
}

interface SunoTrack {
  id?: string
  audio_url?: string
  duration?: number
}

function kieRoot(): string {
  return (process.env.KIE_BASE_URL?.trim() || 'https://api.kie.ai')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/v1$/, '')
}

function timeoutMs(): number {
  const raw = Number.parseInt(process.env.SUNO_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS
  return Math.max(MIN_TIMEOUT_MS, raw)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pollIntervalMs(): number {
  const raw = Number.parseInt(process.env.SUNO_POLL_INTERVAL_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_POLL_INTERVAL_MS
  return Math.max(250, raw)
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new AppError(502, 'MUSIC_PROVIDER_BAD_RESPONSE', 'KIE mengembalikan respons non-JSON.')
  }
}

function apiError(payload: Record<string, unknown>, fallback: string): AppError {
  const code = typeof payload.code === 'number' ? payload.code : undefined
  const message = typeof payload.msg === 'string' && payload.msg.trim() ? payload.msg : fallback
  if (code === 402) {
    return new AppError(402, 'MUSIC_PROVIDER_INSUFFICIENT_CREDITS', 'Kredit KIE tidak cukup untuk membuat musik Suno.')
  }
  if (code === 401) {
    return new AppError(503, 'MUSIC_PROVIDER_UNAUTHORIZED', 'KIE_API_KEY tidak valid untuk Suno.')
  }
  return new AppError(502, 'MUSIC_PROVIDER_FAILED', `Suno/KIE gagal: ${message}`)
}

function parseTracks(resultJson: unknown): SunoTrack[] {
  let parsed = resultJson
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return []
    }
  }
  if (!parsed || typeof parsed !== 'object') return []
  const record = parsed as Record<string, unknown>
  const data = record.data ?? record.sunoData
  if (Array.isArray(data)) {
    return data.filter((item): item is SunoTrack => Boolean(item) && typeof item === 'object')
  }
  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>).sunoData ?? (data as Record<string, unknown>).data
    if (Array.isArray(nested)) {
      return nested.filter((item): item is SunoTrack => Boolean(item) && typeof item === 'object')
    }
  }
  return []
}

export async function synthesizeSunoMusic(
  prompt: string,
  seconds: number,
  out: string,
  title = 'Nuanscape Bed',
  apiKey?: string,
): Promise<SunoResult> {
  const key = apiKey?.trim() || process.env.KIE_API_KEY?.trim()
  if (!key) {
    throw new AppError(
      503,
      'MUSIC_PROVIDER_NOT_CONFIGURED',
      'KIE_API_KEY belum diisi; musik Suno tidak dapat dibuat.',
    )
  }

  const model = process.env.SUNO_MODEL?.trim() || 'V6_MINI'
  const duration = Math.max(10, Math.min(360, Math.round(seconds)))
  const style = (prompt.trim() || 'instrumental background music').slice(0, 1000)
  const safeTitle = title.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Nuanscape Bed'
  const negativeTags =
    process.env.SUNO_NEGATIVE_TAGS?.trim() ||
    'vocals, vocal, singing, speech, narration, choir, humming, acapella, words'

  const payload = {
    model: 'ai-music-api/generate',
    input: {
      custom_mode: true,
      instrumental: true,
      model,
      title: safeTitle,
      style,
      negative_tags: negativeTags,
      duration,
    },
  }

  let createResponse: Response
  try {
    createResponse = await fetch(`${kieRoot()}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      504,
      'MUSIC_PROVIDER_TIMEOUT',
      `KIE tidak merespons: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }

  const createBody = await readJson(createResponse)
  if (createBody.code !== 200) throw apiError(createBody, `HTTP ${createResponse.status}`)
  const taskId = (createBody.data as Record<string, unknown> | undefined)?.taskId
  if (typeof taskId !== 'string' || !taskId) {
    throw new AppError(502, 'MUSIC_PROVIDER_BAD_RESPONSE', 'KIE tidak mengembalikan taskId Suno.')
  }

  const deadline = Date.now() + timeoutMs()
  let resultJson: unknown = ''
  let lastState = ''

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs())
    let pollResponse: Response
    try {
      pollResponse = await fetch(
        `${kieRoot()}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      )
    } catch {
      continue
    }
    const pollBody = await readJson(pollResponse)
    if (pollBody.code !== 200) throw apiError(pollBody, `HTTP ${pollResponse.status}`)
    const data = (pollBody.data ?? {}) as Record<string, unknown>
    lastState = String(data.state ?? data.status ?? '').toLowerCase()
    resultJson = data.resultJson ?? ''

    if (lastState === 'success' || lastState === 'completed') {
      if (parseTracks(resultJson).length > 0) break
    }
    if (['fail', 'failed', 'error', 'canceled', 'cancelled'].includes(lastState)) {
      const detail = typeof data.failMsg === 'string' ? data.failMsg : lastState
      throw new AppError(502, 'MUSIC_PROVIDER_FAILED', `Suno gagal membuat musik: ${detail}`)
    }
  }

  const tracks = parseTracks(resultJson)
  const track = tracks.find((item) => typeof item.audio_url === 'string' && item.audio_url)
  if (!track || typeof track.audio_url !== 'string') {
    throw new AppError(
      504,
      'MUSIC_PROVIDER_TIMEOUT',
      `Suno belum selesai setelah ${Math.round(timeoutMs() / 1000)} detik (status: ${lastState || 'unknown'}).`,
    )
  }

  await downloadToFile(track.audio_url, out, DOWNLOAD_TIMEOUT_MS, 'Audio Suno')
  return {
    taskId,
    trackId: typeof track.id === 'string' ? track.id : '',
    audioUrl: track.audio_url,
    duration: typeof track.duration === 'number' ? track.duration : duration,
  }
}
