import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { resolveProviderChain } from './ai-providers.js'
import { createIdea, mapIdea } from './content.js'
import type { YouTubeResearchResult } from './youtube-research.js'

const CONTENT_TYPES = ['music', 'storytelling', 'konspirasi'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

const clippedText = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().slice(0, max) : value),
    z.string().min(min).max(max),
  )

const ideaSchema = z.object({
  title: clippedText(4, 160),
  hook: clippedText(4, 400),
  angle: clippedText(4, 400),
  thumbnail: clippedText(4, 320).optional(),
  reference: clippedText(4, 800).optional(),
  score: z.coerce.number().int().min(1).max(100).default(75),
})

export const researchSchema = z.object({
  ideas: z.array(ideaSchema).min(1).max(5),
})

const claimTypeSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.enum(['Fakta', 'Dugaan', 'Spekulasi']).optional(),
)

const sceneSchema = z.object({
  title: z.string().trim().min(1).max(120),
  narration: z.string().trim().min(1).max(1200),
  visual: z.string().trim().min(1).max(600),
  animation: z.string().trim().min(1).max(80).default('slow-zoom'),
  duration: z.coerce.number().int().min(2).max(20).catch(8),
  claimType: claimTypeSchema,
  source: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(400).optional(),
  ),
})

const scriptSchema = z.object({
  script: z.string().trim().min(40).max(12_000),
  disclaimer: z.string().trim().max(1200).optional().default(''),
  scenes: z.array(sceneSchema).min(1).max(8),
})

interface ProviderResult {
  provider: string
  model: string
  content: string
}

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

function stripWrapper(raw: string): string {
  return raw
    .replace(/<escape>/gi, '')
    .replace(/<\/escape>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
}

function extractJson(raw: string): unknown {
  const text = stripWrapper(raw)
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'Provider AI tidak mengembalikan JSON yang valid.')
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'Provider AI tidak mengembalikan JSON yang valid.')
  }
}

async function callProvider(
  provider: 'kie.ai' | 'nvidia',
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<ProviderResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 16000,
      }),
      signal: controller.signal,
    })

    const body = await response.text()
    if (!response.ok) {
      throw new AppError(
        502,
        'AI_PROVIDER_REJECTED',
        `Provider ${provider} menolak permintaan (HTTP ${response.status}).`,
      )
    }

    const parsed = JSON.parse(body) as {
      code?: number
      msg?: string
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>
      data?: { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> }
    }
    if (typeof parsed.code === 'number' && parsed.code !== 200) {
      throw new AppError(
        502,
        'AI_PROVIDER_REJECTED',
        `Provider ${provider} gagal (${parsed.code}): ${parsed.msg ?? 'tanpa keterangan'}.`,
      )
    }
    const choices = parsed.choices ?? parsed.data?.choices
    const choice = choices?.[0]
    const content = choice?.message?.content
    if (!content) {
      throw new AppError(
        502,
        'AI_EMPTY_RESPONSE',
        `Provider ${provider} mengembalikan respons kosong${choice?.finish_reason ? ` (${choice.finish_reason})` : ''}.`,
      )
    }
    return { provider, model, content }
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'AI_TIMEOUT', `Provider ${provider} melebihi batas waktu.`)
    }
    throw new AppError(
      502,
      'AI_UNREACHABLE',
      `Tidak dapat menghubungi ${provider}: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function chat(messages: ChatMessage[], ownerId?: string): Promise<ProviderResult> {
  const providers = await resolveProviderChain(ownerId)
  if (providers.length === 0) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'Belum ada provider AI yang dikonfigurasi. Simpan API key KIE.ai atau NVIDIA NIM.',
    )
  }

  const errors: string[] = []
  for (const provider of providers) {
    try {
      return await callProvider(
        provider.provider,
        provider.baseUrl,
        provider.apiKey,
        provider.model,
        messages,
      )
    } catch (error) {
      errors.push(
        `${provider.provider}: ${error instanceof Error ? error.message : 'provider gagal'}`,
      )
    }
  }

  throw new AppError(502, 'AI_PROVIDER_ERROR', errors.join(' ') || 'Semua provider AI gagal.')
}

function compactCount(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function youtubeResearchPrompt(research: YouTubeResearchResult | null | undefined): string[] {
  if (!research) {
    return [
      'Riset YouTube live tidak tersedia untuk sesi ini. Jangan mengarang tren, angka, atau nama video.',
    ]
  }

  if (!research.configured || research.videos.length === 0) {
    return [
      `Riset YouTube live tidak tersedia (${research.reason ?? 'tidak ada video yang cocok'}).`,
      'Jangan mengarang tren, angka, atau nama video. Isi reference dengan "Riset live tidak tersedia".',
    ]
  }

  const videos = research.videos.slice(0, 8).map((video, index) =>
    [
      `${index + 1}. "${video.title}"`,
      `channel ${video.channelTitle}`,
      `${compactCount(video.views)} views`,
      `${compactCount(video.viewsPerDay)} views/hari`,
      `${video.outlierRatio}x ${video.outlierBasis === 'channel' ? 'vs median channel' : 'vs median sampel'}`,
      video.channelMedianViews ? `median ${compactCount(video.channelMedianViews)}` : null,
      `${compactCount(video.subscriberCount)} subscriber`,
      `durasi ${Math.round(video.durationSeconds)} detik`,
      video.breakout ? 'BREAKOUT' : null,
    ]
      .filter(Boolean)
      .join('; '),
  )
  const keywords = research.patterns.topKeywords
    .slice(0, 8)
    .map((entry) => entry.term)
    .join(', ')
  const tags = research.patterns.topTags
    .slice(0, 8)
    .map((entry) => entry.tag)
    .join(', ')

  return [
    `Data riset YouTube live untuk query ${research.queries.map((query) => `"${query}"`).join(', ')} (${research.windowDays} hari, ${research.patterns.sampleSize} video sampel, ${research.patterns.queryCount} query):`,
    ...videos,
    `Kata kunci dominan: ${keywords || '-'}. Tag dominan: ${tags || '-'}.`,
    `Median views ${compactCount(research.patterns.medianViews)}, median views/hari ${compactCount(research.patterns.medianViewsPerDay)}, Shorts share ${research.patterns.shortsShare}%, breakout ${research.patterns.breakoutCount} video dari ${research.patterns.channelBaselineCount} channel ber-baseline.`,
    'Prioritaskan breakout yang dihitung terhadap median 10 video terakhir channel, lalu kecepatan views/hari; rasio sampel hanya sinyal awal dan tidak boleh disebut breakout.',
    'Batasi maksimal dua video per channel agar riset tidak didominasi satu kanal.',
  ]
}

export interface ResearchIdeasInput {
  contentType: ContentType
  platform: 'YouTube' | 'TikTok' | 'Instagram'
  accountId?: string
  niche: string
  topic?: string
  format: 'long' | 'short'
  research?: YouTubeResearchResult | null
}

export async function researchContentIdeas(ownerId: string, input: ResearchIdeasInput) {
  const prompt = [
    `Kamu adalah content strategist Nuanscape Studio.`,
    `Buat 3 ide konten ${input.contentType} untuk ${input.platform} (${input.format === 'long' ? 'video panjang' : 'video pendek'}).`,
    `Niche: ${input.niche}.`,
    ...(input.topic && input.topic !== input.niche
      ? [`Topik riset pilihan user: ${input.topic}. Arahkan rekomendasi ke topik ini.`]
      : []),
    input.contentType === 'music'
      ? 'Fokus pada konsep audio, suasana, dan angle playlist.'
      : input.contentType === 'storytelling'
        ? 'Fokus pada cerita personal yang punya hook emosional dan konflik jelas.'
        : 'Fokus pada investigasi yang membedakan fakta, dugaan, dan spekulasi secara eksplisit.',
    ...youtubeResearchPrompt(input.research),
    'Gunakan data riset live di atas sebagai acuan utama. Setiap reference wajib menyebut video, channel, atau pola nyata dari data tersebut. Jangan mengarang angka.',
    'Untuk setiap ide, tulis thumbnail sebagai konsep visual konkret: subjek utama, komposisi, dan teks overlay maksimal 6 kata.',
    'Gunakan Bahasa Indonesia. Judul harus spesifik, bukan generik.',
    'Balas HANYA dengan JSON valid tanpa penjelasan:',
    '{"ideas":[{"title":"...","hook":"...","angle":"...","thumbnail":"...","reference":"...","score":85}]}',
    'score adalah perkiraan peluang performa 1-100.',
  ].join('\n')

  const result = await chat(
    [
      { role: 'system', content: 'Balas selalu dengan JSON valid sesuai skema yang diminta.' },
      { role: 'user', content: prompt },
    ],
    ownerId,
  )

  const parsed = researchSchema.safeParse(extractJson(result.content))
  if (!parsed.success) {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'Struktur ide dari provider AI tidak sesuai.')
  }

  const created = []
  for (const idea of parsed.data.ideas) {
    const row = await createIdea(ownerId, {
      title: idea.title,
      hook: idea.hook,
      angle: idea.angle,
      platform: input.platform,
      ...(input.accountId ? { accountId: input.accountId } : {}),
      niche: input.niche,
      format: input.format,
      score: idea.score,
      ...(idea.thumbnail ? { thumbnail: idea.thumbnail } : {}),
      ...(idea.reference ? { reference: idea.reference } : {}),
      status: 'draft',
    })
    created.push(row.idea)
  }

  return {
    ideas: created,
    provider: result.provider,
    model: result.model,
  }
}

export interface ScriptFromIdeaInput {
  contentType: ContentType
  platform: 'YouTube' | 'TikTok' | 'Instagram'
  animationStyles: string[]
}

export async function generateScriptFromIdea(
  ownerId: string,
  ideaId: string,
  input: ScriptFromIdeaInput,
) {
  const idea = await prisma.contentIdea.findFirst({ where: { id: ideaId, ownerId } })
  if (!idea) {
    throw new AppError(404, 'NOT_FOUND', 'Ide konten tidak ditemukan.')
  }

  const animations = input.animationStyles.length > 0 ? input.animationStyles.join(', ') : 'slow-zoom'
  const prompt = [
    `Kamu penulis naskah untuk Nuanscape Studio.`,
    `Kembangkan ide berikut menjadi naskah ${input.contentType} untuk ${input.platform}.`,
    `Judul: ${idea.title}`,
    `Hook: ${idea.hook}`,
    `Angle: ${idea.angle}`,
    'Buat naskah Bahasa Indonesia yang siap dibacakan, 3-5 paragraf, tanpa markdown.',
    input.contentType === 'konspirasi'
      ? 'Setiap klaim wajib diberi label Fakta, Dugaan, atau Spekulasi dan sertakan disclaimer.'
      : 'Untuk storytelling, bangun hook, konflik, dan resolusi yang jelas.',
    `Pecah naskah menjadi 3-5 scene dengan total durasi maksimal 60 detik. animation harus salah satu dari: ${animations}.`,
    'duration dalam detik (4-15).',
    'Balas HANYA JSON valid:',
    '{"script":"...","disclaimer":"...","scenes":[{"title":"...","narration":"...","visual":"...","animation":"slow-zoom","duration":6,"claimType":"Fakta","source":"..."}]}',
    'claimType dan source hanya untuk konten konspirasi.',
  ].join('\n')

  const result = await chat(
    [
      { role: 'system', content: 'Balas selalu dengan JSON valid sesuai skema yang diminta.' },
      { role: 'user', content: prompt },
    ],
    ownerId,
  )

  const parsed = scriptSchema.safeParse(extractJson(result.content))
  if (!parsed.success) {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'Struktur naskah dari provider AI tidak sesuai.')
  }

  return {
    ideaId: idea.id,
    script: parsed.data.script,
    disclaimer: parsed.data.disclaimer,
    scenes: parsed.data.scenes,
    provider: result.provider,
    model: result.model,
    idea: mapIdea(idea),
  }
}
