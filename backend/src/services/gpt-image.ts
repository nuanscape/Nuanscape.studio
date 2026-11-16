import { AppError } from '../lib/errors.js'
import { downloadToFile } from '../lib/download.js'

const DEFAULT_TIMEOUT_MS = 240_000
const MIN_TIMEOUT_MS = 60_000
const DEFAULT_POLL_INTERVAL_MS = 3_000
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 60_000

export type ImageAspectRatio = '16:9' | '9:16' | '1:1'

export interface GptImageResult {
  taskId: string
  imageUrl: string
}

function kieRoot(): string {
  return (process.env.KIE_BASE_URL?.trim() || 'https://api.kie.ai')
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/v1$/, '')
}

function timeoutMs(): number {
  const raw = Number.parseInt(process.env.IMAGE_TIMEOUT_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS
  return Math.max(MIN_TIMEOUT_MS, raw)
}

function pollIntervalMs(): number {
  const raw = Number.parseInt(process.env.IMAGE_POLL_INTERVAL_MS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_POLL_INTERVAL_MS
  return Math.max(250, raw)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new AppError(502, 'IMAGE_PROVIDER_BAD_RESPONSE', 'KIE mengembalikan respons non-JSON.')
  }
}

function apiError(payload: Record<string, unknown>, fallback: string): AppError {
  const code = typeof payload.code === 'number' ? payload.code : undefined
  const message = typeof payload.msg === 'string' && payload.msg.trim() ? payload.msg : fallback
  if (code === 402) {
    return new AppError(
      402,
      'IMAGE_PROVIDER_INSUFFICIENT_CREDITS',
      'Kredit KIE tidak cukup untuk membuat gambar GPT Image 2.',
    )
  }
  if (code === 401) {
    return new AppError(503, 'IMAGE_PROVIDER_UNAUTHORIZED', 'KIE_API_KEY tidak valid untuk GPT Image 2.')
  }
  return new AppError(502, 'IMAGE_PROVIDER_FAILED', `GPT Image 2/KIE gagal: ${message}`)
}

function isImageUrl(value: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value)
}

function collectUrls(value: unknown, out: string[], depth = 0): void {
  if (depth > 5 || out.length > 20) return
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
  for (const key of ['resultUrls', 'resultUrl', 'imageUrl', 'imageUrls', 'url', 'output', 'data']) {
    if (key in record) collectUrls(record[key], out, depth + 1)
  }
}

function parseImageUrl(resultJson: unknown): string | null {
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
  return urls.find(isImageUrl) ?? urls[0] ?? null
}

export async function synthesizeGptImage(
  prompt: string,
  out: string,
  aspectRatio: ImageAspectRatio = '16:9',
  apiKey?: string,
): Promise<GptImageResult> {
  const key = apiKey?.trim() || process.env.KIE_API_KEY?.trim()
  if (!key) {
    throw new AppError(
      503,
      'IMAGE_PROVIDER_NOT_CONFIGURED',
      'KIE_API_KEY belum diisi; gambar GPT Image 2 tidak dapat dibuat.',
    )
  }

  const model = process.env.GPT_IMAGE_MODEL?.trim() || 'gpt-image-2-text-to-image'
  const cleanPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 20_000)
  if (!cleanPrompt) {
    throw new AppError(400, 'IMAGE_PROMPT_EMPTY', 'Prompt gambar tidak boleh kosong.')
  }

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
          aspect_ratio: aspectRatio,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AppError(
      504,
      'IMAGE_PROVIDER_TIMEOUT',
      `KIE tidak merespons: ${error instanceof Error ? error.message : 'timeout'}`,
    )
  }

  const createBody = await readJson(createResponse)
  if (createBody.code !== 200) throw apiError(createBody, `HTTP ${createResponse.status}`)
  const taskId = (createBody.data as Record<string, unknown> | undefined)?.taskId
  if (typeof taskId !== 'string' || !taskId) {
    throw new AppError(502, 'IMAGE_PROVIDER_BAD_RESPONSE', 'KIE tidak mengembalikan taskId gambar.')
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

    if ((lastState === 'success' || lastState === 'completed') && parseImageUrl(resultJson)) {
      break
    }
    if (['fail', 'failed', 'error', 'canceled', 'cancelled'].includes(lastState)) {
      const detail = typeof data.failMsg === 'string' ? data.failMsg : lastState
      throw new AppError(502, 'IMAGE_PROVIDER_FAILED', `GPT Image 2 gagal membuat gambar: ${detail}`)
    }
  }

  const imageUrl = parseImageUrl(resultJson)
  if (!imageUrl) {
    throw new AppError(
      504,
      'IMAGE_PROVIDER_TIMEOUT',
      `GPT Image 2 belum selesai setelah ${Math.round(timeoutMs() / 1000)} detik (status: ${lastState || 'unknown'}).`,
    )
  }

  await downloadToFile(imageUrl, out, DOWNLOAD_TIMEOUT_MS, 'Gambar GPT Image 2')
  return { taskId, imageUrl }
}
