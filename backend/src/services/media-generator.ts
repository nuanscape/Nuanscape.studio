import type { Platform } from '@prisma/client'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'
import { resolveKieApiKey } from './ai-providers.js'
import { aiVideoProvider } from './ai-video.js'
import { getDesignTheme } from './design-themes.js'
import { assertAccountPlatform, consumeEnergy, mapItem } from './content.js'
import { formatBytes, MEDIA_STORAGE_DIR, renderContentVideo } from './media-renderer.js'
import {
  generateContentImage,
  imageProvider,
  type ImageProvider,
} from './image.js'

export type ContentType = 'music' | 'storytelling' | 'konspirasi'
export type ClaimType = 'Fakta' | 'Dugaan' | 'Spekulasi'

export interface SceneInput {
  id?: string
  title: string
  narration: string
  visual: string
  animation: string
  duration: number
  claimType?: ClaimType
  source?: string
}

export interface GenerateProductionInput {
  contentType: ContentType
  title: string
  platform: Platform
  accountId?: string
  niche?: string
  format?: 'long' | 'short'
  brief?: string
  script?: string
  audioLength?: string
  audioEnergy?: string
  musicTrackCount?: number
  disclaimer?: string
  thumbnailStyle: string
  animationStyle: string
  musicStyle: string
  designTheme?: string
  scenes?: SceneInput[]
  ideaId?: string
}

const STYLE_ACCENTS: Record<string, string> = {
  vinyl: '#F5D64B',
  analog: '#E8A87C',
  neon: '#5EEAD4',
  cinematic: '#F0B27A',
  diary: '#E8D5B7',
  'warm-film': '#D98880',
  dossier: '#E6B8A2',
  evidence: '#E74C3C',
  archive: '#C9A66B',
}

const STYLE_MOODS: Record<string, string> = {
  vinyl: 'warm analog listening room, amber tungsten light, soft film grain',
  analog: 'vintage analog studio, warm practical lights, gentle grain',
  neon: 'neon-lit night city, teal and magenta reflections, cinematic',
  cinematic: 'cinematic film still, dramatic rim light, shallow depth of field',
  diary: 'intimate personal documentary, natural window light, muted warm tones',
  'warm-film': 'warm 35mm film photograph, golden hour, soft contrast',
  dossier: 'dark investigative archive, paper files, chiaroscuro lighting',
  evidence: 'forensic evidence desk, red accents, moody low-key light',
  archive: 'archival library, dusty shelves, sepia and brass tones',
}

export interface PreviewOptions {
  backgroundImage?: string
  format?: 'long' | 'short'
}

function splitTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = next
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export function buildImagePrompt(input: {
  contentType: ContentType
  title: string
  thumbnailStyle: string
  musicStyle: string
  designTheme?: string
  brief?: string
  format: 'long' | 'short'
  scenes?: Array<{ visual?: string }>
}): string {
  const subject =
    input.scenes?.find((scene) => scene.visual?.trim())?.visual?.trim() ||
    input.brief?.trim() ||
    (input.contentType === 'music'
      ? `abstract visual atmosphere for ${input.musicStyle} music`
      : 'a single cinematic hero image that captures the story')
  const mood = STYLE_MOODS[input.thumbnailStyle] ?? 'cinematic, premium, atmospheric'
  const theme = getDesignTheme(input.designTheme)
  const orientation =
    input.format === 'short'
      ? 'vertical 9:16 composition with the subject centered and dark negative space in the upper and lower thirds'
      : 'wide 16:9 composition with the subject slightly right of center and dark negative space on the left'
  const composition =
    input.contentType === 'music'
      ? `${orientation}, full-frame purely visual composition with no typography or graphic overlay`
      : `${orientation}, leaving room for a typography overlay`
  return [
    input.contentType === 'music'
      ? `Pure thumbnail image for a ${input.contentType} video, with no decoration added on top.`
      : `Editorial background image for a ${input.contentType} video.`,
    `Subject: ${subject}.`,
    `Mood and art direction: ${mood}.`,
    `Visual style: ${theme.imagePrompt}.`,
    `Composition: ${composition}.`,
    'No text, no letters, no words, no numbers, no captions, no logos, no watermarks, no UI elements, no borders, no frames.',
  ].join(' ')
}

export function buildPreviewSvg(
  title: string,
  contentType: ContentType,
  thumbnailStyle: string,
  animationStyle: string,
  musicStyle: string,
  options: PreviewOptions = {},
): string {
  const safe = (val: string) => val.replace(/[<>&"]/g, '')
  const accent = STYLE_ACCENTS[thumbnailStyle] ?? '#F5D64B'
  const portrait = options.format === 'short'
  const width = portrait ? 720 : 1280
  const height = portrait ? 1280 : 720
  const background = options.backgroundImage
    ? `<image href="${options.backgroundImage}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="${width}" height="${height}" fill="#050505" opacity="0.18"/><rect width="${width}" height="${height}" fill="url(#scrim)"/>`
    : `<rect width="100%" height="100%" fill="url(#g)"/>`
  const panelFill = options.backgroundImage
    ? portrait
      ? 'fill="#101010" fill-opacity="0.24"'
      : 'fill="none"'
    : 'fill="#101010"'

  const bars = Array.from({ length: 28 }, (_, i) => {
    const barHeight = 24 + ((i * 37) % 96)
    return `<rect x="${320 + i * 23}" y="${528 - barHeight / 2}" width="10" height="${barHeight}" rx="5" fill="${accent}" opacity="${0.25 + (i % 5) * 0.12}"/>`
  }).join('')

  if (portrait) {
    const pauseBars = Array.from({ length: 22 }, (_, i) => {
      const barHeight = 20 + ((i * 29) % 78)
      return `<rect x="${100 + i * 24}" y="${760 - barHeight / 2}" width="10" height="${barHeight}" rx="5" fill="${accent}" opacity="${0.25 + (i % 5) * 0.12}"/>`
    }).join('')
    const decoration =
      contentType === 'music'
        ? `<circle cx="532" cy="650" r="84" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/><circle cx="532" cy="650" r="34" fill="${accent}" fill-opacity="0.18"/><circle cx="532" cy="650" r="7" fill="${accent}"/>${pauseBars}`
        : contentType === 'storytelling'
          ? `<rect x="398" y="558" width="232" height="164" rx="18" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-opacity="0.4"/><rect x="430" y="590" width="168" height="95" rx="10" fill="${accent}" fill-opacity="0.1"/><path d="M430 668 L472 632 L507 656 L548 615 L598 668 Z" fill="${accent}" fill-opacity="0.45"/><circle cx="554" cy="610" r="11" fill="${accent}" fill-opacity="0.7"/>`
          : `<rect x="398" y="552" width="232" height="178" rx="10" fill="#141414" stroke="${accent}" stroke-opacity="0.45"/><line x1="428" y1="592" x2="600" y2="592" stroke="#ffffff" stroke-opacity="0.18"/><line x1="428" y1="624" x2="600" y2="624" stroke="#ffffff" stroke-opacity="0.18"/><line x1="428" y1="656" x2="600" y2="656" stroke="#ffffff" stroke-opacity="0.18"/><rect x="428" y="610" width="110" height="16" fill="${accent}" fill-opacity="0.65"/><rect x="470" y="642" width="82" height="16" fill="#0b0b0b"/><circle cx="586" cy="568" r="20" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.6"/>`
    const titleLines = splitTitle(title, 19, 3)
    const titleBlock = titleLines
      .map(
        (line, index) =>
          `<text x="72" y="${270 + index * 64}" fill="#ffffff" font-size="54" font-family="Arial" font-weight="700">${safe(line)}</text>`,
      )
      .join('')
    const subtitleY = 270 + titleLines.length * 64 + 14
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b0b0b"/><stop offset="100%" stop-color="#171717"/></linearGradient><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#050505" stop-opacity="0.9"/><stop offset="30%" stop-color="#050505" stop-opacity="0.65"/><stop offset="55%" stop-color="#050505" stop-opacity="0.1"/><stop offset="72%" stop-color="#050505" stop-opacity="0.78"/><stop offset="100%" stop-color="#050505" stop-opacity="0.92"/></linearGradient></defs>
  ${background}
  <rect x="36" y="56" width="648" height="1168" rx="32" ${panelFill} stroke="${accent}" stroke-opacity="0.32"/>
  <text x="72" y="172" fill="${accent}" font-size="22" font-family="Arial" font-weight="700" letter-spacing="4">${safe(contentType).toUpperCase()}</text>
  ${titleBlock}
  <text x="72" y="${subtitleY}" fill="#c0c0c0" font-size="21" font-family="Arial">${safe(thumbnailStyle)} - ${safe(animationStyle)}</text>
  ${decoration}
  <rect x="72" y="900" width="330" height="46" rx="23" fill="${accent}" fill-opacity="0.12"/>
  <text x="96" y="930" fill="${accent}" font-size="18" font-family="Arial">${safe(musicStyle)}</text>
  <text x="72" y="1150" fill="#b8b8b8" font-size="19" font-family="Arial">Kombinasi produksi Nuanscape - Siap dipublikasikan</text>
  <circle cx="360" cy="1030" r="30" fill="${accent}"/><polygon points="351,1014 351,1046 378,1030" fill="#0b0b0b"/>
  </svg>`
  }

  const decoration =
    contentType === 'music'
      ? `<circle cx="1080" cy="190" r="118" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/><circle cx="1080" cy="190" r="46" fill="${accent}" fill-opacity="0.18"/><circle cx="1080" cy="190" r="8" fill="${accent}"/>${bars}`
      : contentType === 'storytelling'
        ? `<rect x="850" y="120" width="270" height="170" rx="18" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-opacity="0.4"/><rect x="890" y="155" width="190" height="100" rx="10" fill="${accent}" fill-opacity="0.1"/><path d="M890 235 L940 195 L980 225 L1030 180 L1080 235 Z" fill="${accent}" fill-opacity="0.45"/><circle cx="1030" cy="175" r="12" fill="${accent}" fill-opacity="0.7"/>`
        : `<rect x="850" y="110" width="260" height="180" rx="10" fill="#141414" stroke="${accent}" stroke-opacity="0.45"/><line x1="880" y1="150" x2="1080" y2="150" stroke="#ffffff" stroke-opacity="0.18"/><line x1="880" y1="180" x2="1080" y2="180" stroke="#ffffff" stroke-opacity="0.18"/><line x1="880" y1="210" x2="1080" y2="210" stroke="#ffffff" stroke-opacity="0.18"/><rect x="880" y="168" width="120" height="18" fill="${accent}" fill-opacity="0.65"/><rect x="930" y="198" width="90" height="18" fill="#0b0b0b"/><circle cx="1070" cy="125" r="22" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.6"/>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b0b0b"/><stop offset="100%" stop-color="#171717"/></linearGradient><linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#050505" stop-opacity="0.9"/><stop offset="45%" stop-color="#050505" stop-opacity="0.55"/><stop offset="70%" stop-color="#050505" stop-opacity="0.15"/><stop offset="100%" stop-color="#050505" stop-opacity="0.05"/></linearGradient></defs>
  ${background}
  <rect x="52" y="52" width="1176" height="616" rx="30" ${panelFill} stroke="${accent}" stroke-opacity="0.32"/>
  <text x="90" y="132" fill="${accent}" font-size="22" font-family="Arial" font-weight="700" letter-spacing="4">${safe(contentType).toUpperCase()}</text>
  <text x="90" y="218" fill="#ffffff" font-size="44" font-family="Arial" font-weight="700">${safe(title).slice(0, 38)}</text>
  <text x="90" y="266" fill="#c0c0c0" font-size="21" font-family="Arial">${safe(thumbnailStyle)} - ${safe(animationStyle)}</text>
  ${decoration}
  <rect x="90" y="408" width="410" height="42" rx="21" fill="${accent}" fill-opacity="0.12"/>
  <text x="112" y="436" fill="${accent}" font-size="18" font-family="Arial">${safe(musicStyle)}</text>
  <text x="90" y="588" fill="#b8b8b8" font-size="19" font-family="Arial">Kombinasi produksi Nuanscape - Siap dipublikasikan</text>
  <circle cx="640" cy="610" r="28" fill="${accent}"/><polygon points="632,596 632,624 656,610" fill="#0b0b0b"/>
  </svg>`

  return svg
}

export function buildPurePreviewSvg(
  backgroundImage: string | undefined,
  format: 'long' | 'short',
): string {
  const width = format === 'short' ? 720 : 1280
  const height = format === 'short' ? 1280 : 720
  const background = backgroundImage
    ? `<image href="${backgroundImage}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="100%" height="100%" fill="url(#g)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b0b0b"/><stop offset="100%" stop-color="#171717"/></linearGradient></defs>
  ${background}
  </svg>`
}

export function generateAudioPrompt(
  contentType: ContentType,
  musicStyle: string,
  audioEnergy = 'Fokus',
): string {
  switch (musicStyle) {
    case 'lofi':
      return `Lofi hip hop beats, dusty vinyl crackle, warm rhodes chords, relaxed tempo 78 BPM, ${audioEnergy.toLowerCase()} vibe, study and chill instrumental, no vocals`
    case 'ambient':
      return `Deep ambient soundscape, lush analog synthesizer pads, gentle reverb, zero distraction, 60 BPM, spacious and calming meditation instrumental`
    case 'jazzhop':
      return `Smooth jazzhop groove, upright bass, subtle brushed drums, gentle jazz guitar licks, 84 BPM, coffee shop atmosphere`
    case 'piano':
      return `Cinematic solo piano, emotional melancholic chords, dynamic touch, gentle reverb, narrative storytelling accompaniment`
    case 'strings':
      return `Cinematic orchestral strings ensemble, gradual build up, emotional climax, film score soundtrack`
    case 'acoustic':
      return `Warm acoustic guitar fingerpicking, personal and intimate feeling, organic wooden resonance`
    case 'dark-ambient':
      return `Dark ambient drone, low frequency sub pulses, eerie tension, investigative atmosphere, mystery documentary score`
    case 'suspense':
      return `Rhythmic suspense pulse, subtle ticking clock, rising tension synth, thriller background audio`
    case 'mystery':
      return `Mysterious atmospheric drone, echoing bells, subtle industrial hum, investigative evidence soundtrack`
    default:
      return `${contentType} instrumental soundtrack, style ${musicStyle}, energy ${audioEnergy}, professional mix, studio mastering`
  }
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
  if (buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return 'image/png'
  }
  return 'image/png'
}

export async function generateContentProduction(
  ownerId: string,
  input: GenerateProductionInput,
) {
  if (input.accountId) {
    await assertAccountPlatform(ownerId, input.accountId, input.platform)
  }

  if (input.contentType === 'music') {
    if (aiVideoProvider() !== 'kie') {
      throw new AppError(
        503,
        'AI_VIDEO_NOT_CONFIGURED',
        'Animasi AI wajib aktif. Set AI_VIDEO_PROVIDER=kie untuk konten musik.',
      )
    }
    if (imageProvider() !== 'gpt-image-2') {
      throw new AppError(
        503,
        'AI_VIDEO_IMAGE_REQUIRED',
        'Animasi AI butuh gambar GPT Image 2. Set IMAGE_PROVIDER=gpt-image-2.',
      )
    }
  }

  const format = input.format ?? (input.platform === 'YouTube' ? 'long' : 'short')
  const imagePrompt = buildImagePrompt({
    contentType: input.contentType,
    title: input.title,
    thumbnailStyle: input.thumbnailStyle,
    musicStyle: input.musicStyle,
    designTheme: input.designTheme,
    brief: input.brief,
    format,
    scenes: input.scenes,
  })

  let backgroundImage: string | undefined
  let imageUsed: ImageProvider = 'none'
  let imageError: string | null = null
  const kieApiKey = await resolveKieApiKey(ownerId)
  if (imageProvider() !== 'none') {
    await mkdir(MEDIA_STORAGE_DIR, { recursive: true })
    const imageDir = await mkdtemp(path.join(MEDIA_STORAGE_DIR, '.image-'))
    const imagePath = path.join(imageDir, 'background')
    try {
      imageUsed = await generateContentImage(
        imagePrompt,
        imagePath,
        format === 'short' ? '9:16' : '16:9',
        kieApiKey,
      )
      if (imageUsed !== 'none') {
        const buffer = await readFile(imagePath)
        backgroundImage = `data:${imageMime(buffer)};base64,${buffer.toString('base64')}`
      }
    } catch (error) {
      imageError = error instanceof Error ? error.message : 'generasi gambar gagal'
      console.warn(`[media] GPT Image 2 gagal: ${imageError}`)
    } finally {
      await rm(imageDir, { recursive: true, force: true })
    }
  }

  if (input.contentType === 'music' && imageUsed !== 'gpt-image-2') {
    throw new AppError(
      502,
      'AI_IMAGE_FAILED',
      `Gambar AI wajib berhasil untuk animasi. ${imageError ?? 'Periksa KIE_API_KEY dan kuota GPT Image 2.'}`,
    )
  }

  const posterSvg =
    input.contentType === 'music'
      ? buildPurePreviewSvg(backgroundImage, format)
      : buildPreviewSvg(
          input.title,
          input.contentType,
          input.thumbnailStyle,
          input.animationStyle,
          input.musicStyle,
          { backgroundImage, format },
        )
  const audioPrompt = generateAudioPrompt(
    input.contentType,
    input.musicStyle,
    input.audioEnergy,
  )
  const renderScenes = backgroundImage
    ? input.scenes?.map((scene) => ({ ...scene, backgroundImage }))
    : input.scenes
  const render = await renderContentVideo({
    title: input.title,
    contentType: input.contentType,
    platform: input.platform,
    format,
    posterSvg,
    thumbnailStyle: input.thumbnailStyle,
    musicStyle: input.musicStyle,
    designTheme: input.designTheme,
    audioPrompt,
    animationLabel: input.animationStyle,
    audioLength: input.audioLength,
    musicTrackCount: input.musicTrackCount,
    scenes: renderScenes,
    imageProvider: imageUsed,
    imageCount: imageUsed === 'gpt-image-2' ? 1 : 0,
    kieApiKey,
  })

  const energyStatus = await consumeEnergy(ownerId, 10)

  if (input.ideaId) {
    await prisma.contentIdea.updateMany({
      where: { id: input.ideaId, ownerId },
      data: { status: 'completed' },
    })
  }

  const imagePhase =
    render.imageProvider === 'gpt-image-2'
      ? 'Generate gambar GPT Image 2'
      : imageError
        ? 'Fallback poster SVG'
        : null
  const animationPhase =
    render.videoProvider === 'kie' ? 'Generate animasi AI KIE' : null
  const phases =
    input.contentType === 'music'
      ? [
          'Menyusun prompt musik',
          ...(imagePhase ? [imagePhase] : []),
          render.musicProvider === 'suno'
            ? render.musicTrackCount > 1
              ? `Generate ${render.musicTrackCount} musik Suno`
              : 'Generate musik Suno'
            : 'Sintesis musik lokal',
          ...(animationPhase ? [animationPhase] : []),
          `Loop audio + video ${render.duration}s`,
        ]
      : [
          input.contentType === 'storytelling' ? 'Menyusun storyboard' : 'Menyusun klaim',
          ...(imagePhase ? [imagePhase] : []),
          render.ttsProvider === 'heygen'
            ? 'Generate narasi HeyGen'
            : render.ttsProvider === 'edge'
              ? 'Generate narasi edge-tts'
              : 'Menyiapkan audio tanpa narasi',
          input.contentType === 'storytelling' ? 'Sinkronisasi scene' : 'Membangun visual evidence',
          'Render video',
        ]

  // 6. Build production package text
  const safeTitle = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const scenes = input.scenes ?? []
  const productionLines = [
    `=== PAKET PRODUKSI NUANSCAPE ===`,
    `Judul: ${input.title}`,
    `Tipe Konten: ${input.contentType.toUpperCase()}`,
    `Platform: ${input.platform}`,
    `Niche: ${input.niche ?? 'Creative'}`,
    `Gaya Thumbnail: ${input.thumbnailStyle}`,
    `Tema Desain: ${getDesignTheme(input.designTheme).label}`,
    `Gaya Animasi: ${input.animationStyle}`,
    `Gaya Musik: ${input.musicStyle}`,
    `Jumlah Lagu: ${render.musicTrackCount}`,
    `Prompt Musik (Suno): ${audioPrompt}`,
    `Prompt Gambar (GPT Image 2): ${imagePrompt}`,
    `Gambar: ${
      render.imageProvider === 'gpt-image-2'
        ? `GPT Image 2 (${render.imageCount} gambar)`
        : imageError
          ? `poster SVG (GPT Image 2 gagal: ${imageError})`
          : 'poster SVG'
    }`,
    `Render: ${render.width}x${render.height} - ${render.duration}s - ${formatBytes(render.videoBytes)} - musik ${render.musicProvider === 'suno' ? 'Suno' : 'prosedural'} - animasi ${render.videoProvider === 'kie' ? `AI ${render.videoModel ?? 'KIE'}` : 'tanpa animasi AI'} - narasi ${render.ttsProvider ? `TTS ${render.ttsProvider}` : 'tanpa TTS'} - gambar ${render.imageProvider === 'gpt-image-2' ? 'GPT Image 2' : 'SVG'}`,
    '',
    input.contentType === 'music'
      ? `Brief Audio: ${input.brief ?? 'Audio rileks dan santai'}\nDurasi: ${input.audioLength ?? '60 detik'}\nEnergi: ${input.audioEnergy ?? 'Chill'}`
      : `Script:\n${input.script ?? '-'}\nDisclaimer: ${input.disclaimer ?? '-'}\n\nScene (${scenes.length}):\n${scenes
          .map(
            (s, idx) =>
              `${idx + 1}. [${s.title}] (${s.duration}s - ${s.animation})\n   Narasi: ${s.narration}\n   Visual: ${s.visual}${s.claimType ? `\n   Klaim: ${s.claimType} | Sumber: ${s.source ?? '-'}` : ''}`,
          )
          .join('\n\n')}`,
    '',
    `Fase Selesai: ${phases.join(' -> ')}`,
    `Status Produksi: Siap Review & Publikasi`,
  ].join('\n')

  // 7. Create ContentItem in database
  const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const scriptText = input.script ?? (input.brief ? `[Brief Audio]\n${input.brief}` : null)
  const captionText = `${input.title} — Konten ${input.contentType} terbaru produksi Nuanscape Studio.`
  const hashtags = [
    '#Nuanscape',
    `#${input.contentType}`,
    `#${input.musicStyle.replace(/[^a-zA-Z0-9]/g, '')}`,
    '#ContentProduction',
  ]

  const item = await prisma.contentItem.create({
    data: {
      ownerId,
      title: input.title,
      platform: input.platform,
      accountId: input.accountId ?? null,
      niche: input.niche ?? (input.contentType === 'music' ? 'Music' : 'Creative'),
      format,
      status: 'Draft',
      scheduledAt,
      script: scriptText,
      caption: captionText,
      hashtags,
      thumbnail: render.previewUrl,
      previewUrl: render.previewUrl,
      videoUrl: render.videoUrl,
      thumbnailStyle: input.thumbnailStyle,
      animationStyle: input.animationStyle,
      musicStyle: input.musicStyle,
      generated: true,
      sourceIdeaId: input.ideaId ?? null,
    },
  })

  // 8. Create Library Assets
  const assets = await Promise.all([
    prisma.libraryAsset.create({
      data: {
        ownerId,
        contentId: item.id,
        accountId: input.accountId ?? null,
        platform: input.platform,
        name: `[Thumbnail] ${input.title}`,
        type: 'Thumbnail',
        size: formatBytes(render.posterBytes),
      },
    }),
    prisma.libraryAsset.create({
      data: {
        ownerId,
        contentId: item.id,
        accountId: input.accountId ?? null,
        platform: input.platform,
        name: `[Video Draft] ${input.title}`,
        type: 'Video',
        size: formatBytes(render.videoBytes),
      },
    }),
    ...(scriptText
      ? [
          prisma.libraryAsset.create({
            data: {
              ownerId,
              contentId: item.id,
              accountId: input.accountId ?? null,
              platform: input.platform,
              name: `[Script] ${input.title}`,
              type: 'Script',
              size: formatBytes(Buffer.byteLength(scriptText, 'utf8')),
            },
          }),
        ]
      : []),
  ])

  return {
    item: mapItem(item),
    media: {
      previewUrl: render.previewUrl,
      videoUrl: render.videoUrl,
      audioPrompt,
      scenes,
      productionPackText: productionLines,
      downloadFilename: `${safeTitle}-paket-produksi.txt`,
      phasesCompleted: phases,
      render: {
        duration: render.duration,
        width: render.width,
        height: render.height,
        narration: render.narration,
        musicProvider: render.musicProvider,
        ttsProvider: render.ttsProvider,
        videoProvider: render.videoProvider,
        videoModel: render.videoModel,
        videoBytes: render.videoBytes,
        posterBytes: render.posterBytes,
      },
    },
    energy: energyStatus,
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      size: a.size,
    })),
  }
}
