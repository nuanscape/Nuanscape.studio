import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { AppError } from '../lib/errors.js'
import { downloadToFile } from '../lib/download.js'

const DEFAULT_TIMEOUT_MS = 900_000
const MIN_TIMEOUT_MS = 120_000
const DEFAULT_POLL_INTERVAL_MS = 5_000
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 120_000

export type AiVideoProvider = 'kie' | 'none'

export interface AiVideoResult {
  taskId: string
  model: string
  videoUrl: string
  bytes: number
}

export function aiVideoProvider(): AiVideoProvider {
  const raw = process.env.AI_VIDEO_PROVIDER?.trim().toLowerCase()
  return raw === 'kie' || raw === 'grok' || raw === 'minimax' ? 'kie' : 'none'
}

export function aiVideoModel(): string {
  return process.env.KIE_VIDEO_MODEL?.trim() || 'grok-imagine-video-1-5-preview'
}

export function aiVideoDuration(): number {
  const raw = Number.parseInt(process.env.KIE_VIDEO_DURATION ?? '', 10)
  if (!Number.isFinite(raw)) return 6
  return Math.min(15, Math.max(1, raw))
}

function aiVideoResolution(): string {
  return process.env.KIE_VIDEO_RESOLUTION?.trim() || '720p'
}

function kieRoot(): string {
  return (process.env.KIE_BASE_URL?.trim() || 'https://api.kie.ai')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/v1$/, '')
}

function uploadRoot(): string {
  return (process.env.KIE_UPLOAD_BASE_URL?.trim() || 'https://kieai.redpandaai.co').replace(
    /\/+$/,
    '',
  )
}

function timeoutMs(): number {
  const raw = Number.parseInt(process.env.KIE_VIDEO_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS
  return Math.max(MIN_TIMEOUT_MS, raw)
}

function pollIntervalMs(): number {
  const raw = Number.parseInt(process.env.KIE_VIDEO_POLL_INTERVAL_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_POLL_INTERVAL_MS
  return Math.max(500, raw)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson(response: Response, code: string): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new AppError(502, code, 'KIE mengembalikan respons non-JSON untuk animasi AI.')
  }
}

function apiError(payload: Record<string, unknown>, fallback: string): AppError {
  const code = typeof payload.code === 'number' ? payload.code : undefined
  const message = typeof payload.msg === 'string' && payload.msg.trim() ? payload.msg : fallback
  if (code === 402) {
    return new AppError(
      402,
      'VIDEO_PROVIDER_INSUFFICIENT_CREDITS',
      'Kredit KIE tidak cukup untuk membuat animasi AI.',
    )
  }
  if (code === 401) {
    return new AppError(
      503,
      'VIDEO_PROVIDER_UNAUTHORIZED',
      'KIE_API_KEY tidak valid untuk animasi AI.',
    )
  }
  return new AppError(502, 'VIDEO_PROVIDER_FAILED', `Animasi AI/KIE gagal: ${message}`)
}

function imageMime(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    return 'image/webp'
  }
  return 'image/png'
}

async function uploadImage(imagePath: string, key: string): Promise<string> {
  const buffer = await readFile(imagePath)
  const fileName = path.basename(imagePath)
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: imageMime(buffer) }), fileName)
  form.append('uploadPath', 'nuanscape/video-inputs')
  form.append('fileName', fileName)

  let response: Response
  try {
    response = await fetch(`${uploadRoot()}/api/file-stream-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      504,
      'VIDEO_PROVIDER_TIMEOUT',
      `Upload gambar ke KIE gagal: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }

  const body = await readJson(response, 'VIDEO_PROVIDER_BAD_RESPONSE')
  if (body.code !== 200 || body.success === false) {
    throw apiError(body, `HTTP ${response.status}`)
  }
  const data = (body.data ?? {}) as Record<string, unknown>
  const downloadUrl = typeof data.downloadUrl === 'string' ? data.downloadUrl : ''
  if (!downloadUrl) {
    throw new AppError(
      502,
      'VIDEO_PROVIDER_BAD_RESPONSE',
      'KIE tidak mengembalikan URL gambar setelah upload.',
    )
  }
  return downloadUrl
}

function isVideoUrl(value: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(value)
}

function collectUrls(value: unknown, out: string[], depth = 0): void {
  if (depth > 6 || out.length > 30) return
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value.trim())) out.push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out, depth + 1)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  for (const key of [
    'resultUrls',
    'resultUrl',
    'videoUrl',
    'videoUrls',
    'output',
    'url',
    'data',
    'videos',
  ]) {
    if (key in record) collectUrls(record[key], out, depth + 1)
  }
}

function parseVideoUrl(resultJson: unknown): string | null {
  let parsed = resultJson
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return null
    }
  }
  const urls: string[] = []
  collectUrls(parsed, urls)
  return urls.find(isVideoUrl) ?? null
}

export async function synthesizeImageToVideo(
  imagePath: string,
  out: string,
  prompt: string,
  apiKey?: string,
  options?: { duration?: number; aspectRatio?: '16:9' | '9:16' | '1:1' },
): Promise<AiVideoResult> {
  const key = apiKey?.trim() || process.env.KIE_API_KEY?.trim()
  if (!key) {
    throw new AppError(
      503,
      'VIDEO_PROVIDER_NOT_CONFIGURED',
      'KIE_API_KEY belum diisi; animasi AI tidak dapat dibuat.',
    )
  }

  const model = aiVideoModel()
  const duration = Math.min(15, Math.max(1, options?.duration ?? aiVideoDuration()))
  const resolution = aiVideoResolution()
  const cleanPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 4_000)
  if (!cleanPrompt) {
    throw new AppError(400, 'VIDEO_PROMPT_EMPTY', 'Prompt animasi AI tidak boleh kosong.')
  }

  const imageUrl = await uploadImage(imagePath, key)

  let createResponse: Response
  try {
    createResponse = await fetch(`${kieRoot()}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          prompt: cleanPrompt,
          image_urls: [imageUrl],
          ...(options?.aspectRatio ? { aspect_ratio: options.aspectRatio } : {}),
          duration,
          resolution,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      504,
      'VIDEO_PROVIDER_TIMEOUT',
      `KIE tidak merespons: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }

  const createBody = await readJson(createResponse, 'VIDEO_PROVIDER_BAD_RESPONSE')
  if (createBody.code !== 200) throw apiError(createBody, `HTTP ${createResponse.status}`)
  const taskId = (createBody.data as Record<string, unknown> | undefined)?.taskId
  if (typeof taskId !== 'string' || !taskId) {
    throw new AppError(
      502,
      'VIDEO_PROVIDER_BAD_RESPONSE',
      'KIE tidak mengembalikan taskId animasi AI.',
    )
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
    const pollBody = await readJson(pollResponse, 'VIDEO_PROVIDER_BAD_RESPONSE')
    if (pollBody.code !== 200) throw apiError(pollBody, `HTTP ${pollResponse.status}`)
    const data = (pollBody.data ?? {}) as Record<string, unknown>
    lastState = String(data.state ?? data.status ?? '').toLowerCase()
    resultJson = data.resultJson ?? ''

    if ((lastState === 'success' || lastState === 'completed') && parseVideoUrl(resultJson)) {
      break
    }
    if (['fail', 'failed', 'error', 'canceled', 'cancelled'].includes(lastState)) {
      const detail = typeof data.failMsg === 'string' ? data.failMsg : lastState
      throw new AppError(502, 'VIDEO_PROVIDER_FAILED', `Animasi AI gagal dibuat: ${detail}`)
    }
  }

  const videoUrl = parseVideoUrl(resultJson)
  if (!videoUrl) {
    throw new AppError(
      504,
      'VIDEO_PROVIDER_TIMEOUT',
      `Animasi AI belum selesai setelah ${Math.round(timeoutMs() / 1000)} detik (status: ${lastState || 'unknown'}).`,
    )
  }

  await downloadToFile(videoUrl, out, DOWNLOAD_TIMEOUT_MS, 'Video AI KIE')
  const info = await stat(out)
  return { taskId, model, videoUrl, bytes: info.size }
}
