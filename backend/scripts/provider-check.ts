import 'dotenv/config'

const KIE_MODEL = process.env.PICOCLAW_KIE_MODEL ?? 'kimi-k3-1-pro'
const KIE_BASE = (process.env.KIE_BASE_URL ?? 'https://api.kie.ai')
  .replace(/\/+$/, '')
  .replace(/\/v1$/, '')
const NVIDIA_BASE = (process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1').replace(
  /\/+$/,
  '',
)
const NVIDIA_MODEL = process.env.NVIDIA_CONTENT_MODEL ?? 'nvidia/nemotron-3.5-lightning-30b-a3b'

type Json = Record<string, unknown>

async function readJson(response: Response): Promise<Json | null> {
  const text = await response.text()
  try {
    return JSON.parse(text) as Json
  } catch {
    return null
  }
}

async function checkKie(): Promise<string> {
  const key = process.env.KIE_API_KEY
  if (!key) return 'KIE: KIE_API_KEY belum diisi'
  const response = await fetch(`${KIE_BASE}/${KIE_MODEL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: KIE_MODEL,
      messages: [{ role: 'user', content: 'Balas: ok' }],
      max_tokens: 8,
      temperature: 0,
    }),
  })
  const body = await readJson(response)
  const code = typeof body?.code === 'number' ? body.code : undefined
  if (code === 402) return 'KIE: 402 saldo/kredit tidak cukup'
  if (!response.ok) return `KIE: HTTP ${response.status}`
  const choices = Array.isArray(body?.choices) ? body.choices : []
  return choices.length > 0 ? 'KIE: OK' : `KIE: HTTP ${response.status} tanpa choices`
}

async function checkNvidia(): Promise<string> {
  const key = process.env.NVIDIA_API_KEY
  if (!key) return 'NVIDIA: NVIDIA_API_KEY belum diisi'
  const response = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [{ role: 'user', content: 'Balas: ok' }],
      max_tokens: 8,
      temperature: 0,
    }),
  })
  if (!response.ok) return `NVIDIA: HTTP ${response.status}`
  const body = await readJson(response)
  const choices = Array.isArray(body?.choices) ? body.choices : []
  return choices.length > 0 ? 'NVIDIA: OK' : `NVIDIA: HTTP ${response.status} tanpa choices`
}

const results = await Promise.all([checkKie(), checkNvidia()])
for (const result of results) console.log(result)
if (results.some((result) => !result.endsWith(': OK'))) process.exitCode = 1
