import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { AppError } from '../lib/errors.js'
import { buildMusicBed, musicFileExtension, normalizeMusicTrackCount, type MusicProvider } from './music.js'
import { synthesizeSpeech, ttsProvider, type TtsProvider } from './tts.js'
import {
  aiVideoDuration,
  aiVideoProvider,
  synthesizeImageToVideo,
  type AiVideoProvider,
} from './ai-video.js'
import { getDesignTheme } from './design-themes.js'
import type { ImageProvider } from './image.js'

export const MEDIA_URL_PREFIX = '/api/v1/media'
export const MEDIA_STORAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../storage/media',
)

const FPS = 24
const DEFAULT_MAX_SECONDS = 60
const DEFAULT_MUSIC_MAX_SECONDS = 7200
const LONG_RENDER_TIMEOUT_MS = 900_000

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

export interface RenderScene {
  title: string
  narration: string
  visual: string
  animation: string
  duration: number
  claimType?: string
  source?: string
  backgroundImage?: string
}

export interface RenderInput {
  title: string
  contentType: 'music' | 'storytelling' | 'konspirasi'
  platform: 'YouTube' | 'TikTok' | 'Instagram'
  format: 'long' | 'short'
  posterSvg: string
  thumbnailStyle: string
  musicStyle: string
  designTheme?: string
  audioPrompt?: string
  animationLabel?: string
  audioLength?: string
  musicTrackCount?: number
  kieApiKey?: string
  scenes?: RenderScene[]
  imageProvider?: ImageProvider
  imageCount?: number
  aiVideoPath?: string
}

export interface RenderResult {
  videoUrl: string
  previewUrl: string
  posterBytes: number
  videoBytes: number
  duration: number
  width: number
  height: number
  narration: 'tts' | 'bed'
  musicProvider: MusicProvider
  musicTrackCount: number
  ttsProvider: TtsProvider | null
  imageProvider: ImageProvider
  imageCount: number
  videoProvider: AiVideoProvider
  videoModel: string | null
}

interface Dimensions {
  width: number
  height: number
}

function outputDimensions(format: 'long' | 'short'): Dimensions {
  return format === 'short' ? { width: 720, height: 1280 } : { width: 1280, height: 720 }
}

function maxRenderSeconds(): number {
  const raw = Number.parseInt(process.env.MEDIA_RENDER_MAX_SECONDS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_MAX_SECONDS
  return Math.min(60, Math.max(10, raw))
}

function musicMaxSeconds(): number {
  const raw = Number.parseInt(process.env.MEDIA_MUSIC_MAX_SECONDS ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_MUSIC_MAX_SECONDS
  return Math.min(DEFAULT_MUSIC_MAX_SECONDS, Math.max(12, raw))
}

export function buildAiVideoPrompt(input: RenderInput): string {
  const theme = getDesignTheme(input.designTheme)
  return [
    `${theme.id === 'cinematic' ? 'Cinematic static shot' : 'Near-static shot'} for a ${input.musicStyle} music video.`,
    'Locked-off camera: no camera movement, no zoom, no pan, no parallax, no orbit.',
    'Almost still frame with only extremely subtle ambient life: faint light shimmer, soft haze drift, tiny dust particles.',
    'Preserve the original artwork composition, framing, colors, and details exactly.',
    `Maintain the exact ${theme.label} look: ${theme.videoPrompt}.`,
    'No cuts, no scene changes, no text, no logos, no watermark, no morphing, no warping, no people, no sudden movement.',
    'Quiet, atmospheric, near-static living picture.',
  ].join(' ')
}

async function normalizeAiClip(
  sourcePath: string,
  clipPath: string,
  size: Dimensions,
  timeoutMs: number,
): Promise<void> {
  const ffmpeg = process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  const filter = `[0:v]scale=${size.width}:${size.height}:force_original_aspect_ratio=increase,crop=${size.width}:${size.height},fps=${FPS},format=yuv420p[v]`
  await run(
    ffmpeg,
    [
      '-y',
      '-i',
      sourcePath,
      '-filter_complex',
      filter,
      '-map',
      '[v]',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      clipPath,
    ],
    timeoutMs,
  )
}

async function renderMusicLoop(
  size: Dimensions,
  audioPath: string,
  videoPath: string,
  duration: number,
  tempDir: string,
  aiVideoPath: string,
): Promise<void> {
  const ffmpeg = process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  const clipPath = path.join(tempDir, 'ai-clip.mp4')
  await normalizeAiClip(aiVideoPath, clipPath, size, 300_000)

  const baseArgs = [
    '-y',
    '-stream_loop',
    '-1',
    '-i',
    clipPath,
    '-stream_loop',
    '-1',
    '-i',
    audioPath,
    '-t',
    duration.toFixed(2),
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
  ]

  try {
    await run(
      ffmpeg,
      [...baseArgs, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', videoPath],
      LONG_RENDER_TIMEOUT_MS,
    )
  } catch {
    await run(
      ffmpeg,
      [
        ...baseArgs,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '24',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        videoPath,
      ],
      LONG_RENDER_TIMEOUT_MS,
    )
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
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
  return lines
}

function textBlock(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  attrs: string,
): string {
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<text x="${x}" y="${y}" ${attrs}>${tspans}</text>`
}

function sceneSvg(
  scene: RenderScene,
  index: number,
  total: number,
  input: RenderInput,
  size: Dimensions,
): string {
  const accent = STYLE_ACCENTS[input.thumbnailStyle] ?? '#5EEAD4'
  const { width, height } = size
  const compact = size.height > size.width
  const padding = compact ? 56 : 84
  const titleSize = compact ? 42 : 46
  const bodySize = compact ? 25 : 27
  const bodyChars = compact ? 28 : 58
  const titleLines = wrapText(scene.title, compact ? 24 : 42, 2)
  const narrationLines = wrapText(scene.narration, bodyChars, compact ? 8 : 5)
  const visualLines = wrapText(scene.visual, bodyChars + 6, 2)
  const titleY = compact ? 250 : 190
  const narrationY = titleY + titleLines.length * (titleSize + 14) + (compact ? 90 : 70)
  const visualY = Math.min(height - (compact ? 260 : 150), narrationY + narrationLines.length * (bodySize + 14) + 50)
  const badge = scene.claimType ? `${scene.claimType}${scene.source ? ` - ${scene.source}` : ''}` : ''
  const background = scene.backgroundImage
    ? `<image href="${scene.backgroundImage}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="${width}" height="${height}" fill="#070707" opacity="0.52"/>`
    : `<rect width="100%" height="100%" fill="url(#bg)"/>`
  const panelFill = scene.backgroundImage
    ? 'fill="#101010" fill-opacity="0.58"'
    : 'fill="#101010"'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090909"/>
      <stop offset="100%" stop-color="#181818"/>
    </linearGradient>
  </defs>
  ${background}
  <rect x="${padding / 2}" y="${padding / 2}" width="${width - padding}" height="${height - padding}" rx="28" ${panelFill} stroke="${accent}" stroke-opacity="0.32" stroke-width="2"/>
  <text x="${padding}" y="${compact ? 120 : 104}" fill="${accent}" font-family="Arial" font-size="20" font-weight="700" letter-spacing="4">${escapeXml(input.contentType.toUpperCase())} - SCENE ${index + 1}/${total}</text>
  ${textBlock(titleLines, padding, titleY, titleSize + 14, `fill="#ffffff" font-family="Arial" font-size="${titleSize}" font-weight="700"`)}
  ${textBlock(narrationLines, padding, narrationY, bodySize + 14, `fill="#d6d6d6" font-family="Arial" font-size="${bodySize}"`)}
  ${textBlock(visualLines, padding, visualY, 26, `fill="${accent}" font-family="Arial" font-size="${compact ? 19 : 20}"`)}
  ${badge ? `<rect x="${padding}" y="${height - (compact ? 180 : 110)}" width="${Math.min(width - padding * 2, 620)}" height="46" rx="23" fill="${accent}" fill-opacity="0.14"/><text x="${padding + 20}" y="${height - (compact ? 150 : 80)}" fill="${accent}" font-family="Arial" font-size="18">${escapeXml(badge)}</text>` : ''}
  <text x="${padding}" y="${height - (compact ? 70 : 52)}" fill="#8a8a8a" font-family="Arial" font-size="18">Nuanscape Studio - ${escapeXml(scene.animation)}</text>
  <rect x="${width - padding - 10}" y="${height - (compact ? 56 : 48)}" width="10" height="10" rx="5" fill="${accent}"/>
  </svg>`
  return svg
}

function svgToPng(svg: string, width: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
}

function run(command: string, args: string[], timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new AppError(504, 'MEDIA_RENDER_TIMEOUT', `Perintah ${command} melebihi batas waktu.`))
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(
        new AppError(
          503,
          'MEDIA_RENDERER_UNAVAILABLE',
          `Tidak dapat menjalankan ${command}: ${error.message}`,
        ),
      )
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(
        new AppError(
          502,
          'MEDIA_RENDER_FAILED',
          `${command} gagal (exit ${code}): ${stderr.trim().slice(-400) || 'tanpa detail'}`,
        ),
      )
    })
  })
}

async function probeDuration(file: string): Promise<number> {
  const bin = process.env.FFPROBE_BIN?.trim() || 'ffprobe'
  const out = await run(bin, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    file,
  ])
  const value = Number.parseFloat(out.trim())
  return Number.isFinite(value) ? value : 0
}

function requestedMusicSeconds(value: string | undefined): number | null {
  const raw = value?.trim().toLowerCase()
  if (!raw) return null
  const amount = Number.parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(amount)) return null
  if (/(jam|hour|hr|h)\b/.test(raw)) return Math.round(amount * 3600)
  if (/(menit|minute|min)\b/.test(raw)) return Math.round(amount * 60)
  if (/(detik|second|sec|s)\b/.test(raw)) return Math.round(amount)
  return Math.round(amount)
}

async function concatAudio(inputs: string[], out: string): Promise<void> {
  const ffmpeg = process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  const args = ['-y']
  for (const input of inputs) args.push('-i', input)
  const normalized = inputs
    .map((_, index) => `[${index}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`)
    .join(';')
  const joined = inputs.map((_, index) => `[a${index}]`).join('')
  args.push(
    '-filter_complex',
    `${normalized};${joined}concat=n=${inputs.length}:v=0:a=1[out]`,
    '-map',
    '[out]',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    out,
  )
  await run(ffmpeg, args, 120_000)
}

async function mixVoiceAndBed(voice: string, bed: string, out: string): Promise<void> {
  const ffmpeg = process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  await run(
    ffmpeg,
    [
      '-y',
      '-i',
      bed,
      '-i',
      voice,
      '-filter_complex',
      '[0:a]volume=0.16[bed];[1:a]volume=1.15[voice];[bed][voice]amix=inputs=2:duration=longest:dropout_transition=2[out]',
      '-map',
      '[out]',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      out,
    ],
    120_000,
  )
}

function shortCode(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '')
}

export async function renderContentVideo(input: RenderInput): Promise<RenderResult> {
  const maxSeconds = maxRenderSeconds()
  const size = outputDimensions(input.format)
  const id = randomUUID()
  await mkdir(MEDIA_STORAGE_DIR, { recursive: true })
  const tempDir = await mkdtemp(path.join(MEDIA_STORAGE_DIR, '.render-'))
  const posterPath = path.join(MEDIA_STORAGE_DIR, `${id}-poster.png`)
  const videoPath = path.join(MEDIA_STORAGE_DIR, `${id}.mp4`)
  const ffmpeg = process.env.FFMPEG_BIN?.trim() || 'ffmpeg'

  try {
    if (input.contentType === 'music' && !input.aiVideoPath) {
      if (aiVideoProvider() !== 'kie') {
        throw new AppError(
          503,
          'AI_VIDEO_NOT_CONFIGURED',
          'Animasi AI wajib aktif. Set AI_VIDEO_PROVIDER=kie untuk konten musik.',
        )
      }
      if ((input.imageProvider ?? 'none') !== 'gpt-image-2') {
        throw new AppError(
          503,
          'AI_VIDEO_IMAGE_REQUIRED',
          'Animasi AI butuh gambar GPT Image 2 yang berhasil dibuat. Periksa IMAGE_PROVIDER dan KIE_API_KEY.',
        )
      }
    }

    const poster = svgToPng(input.posterSvg, size.width)
    await writeFile(posterPath, poster)

    let scenes = input.scenes ?? []
    let duration = Math.min(maxSeconds, 24)
    let audioPath = path.join(tempDir, 'audio.m4a')
    let narration: 'tts' | 'bed' = 'bed'
    let ttsUsed: TtsProvider | null = null
    let musicUsed: MusicProvider = 'procedural'
    let musicTracksUsed = 1
    let aiVideoPath = input.aiVideoPath
    let aiProvider: AiVideoProvider = aiVideoPath ? 'kie' : 'none'
    let aiModel: string | null = aiVideoPath ? 'preloaded' : null
    const musicExt = musicFileExtension()

    if (input.contentType === 'music') {
      const trackCount = normalizeMusicTrackCount(input.musicTrackCount)
      const requested = requestedMusicSeconds(input.audioLength) ?? 24
      duration = Math.min(musicMaxSeconds(), Math.max(12, requested))
      const perTrackSeconds = Math.min(180, Math.max(10, Math.ceil(duration / trackCount)))
      audioPath = path.join(tempDir, `music${musicExt}`)

      const aiTask = aiVideoPath
        ? Promise.resolve()
        : (async () => {
            const sourcePath = path.join(tempDir, 'ai-source.mp4')
            const result = await synthesizeImageToVideo(
              posterPath,
              sourcePath,
              buildAiVideoPrompt(input),
              input.kieApiKey,
              {
                duration: aiVideoDuration(),
                aspectRatio: input.format === 'short' ? '9:16' : '16:9',
              },
            )
            aiVideoPath = sourcePath
            aiProvider = 'kie'
            aiModel = result.model
          })()

      const music = await buildMusicBed(
        input.musicStyle,
        perTrackSeconds,
        audioPath,
        input.audioPrompt,
        input.title,
        input.kieApiKey,
        trackCount,
      )
      musicUsed = music.provider
      musicTracksUsed = music.files.length
      if (music.files.length > 1) {
        const playlistPath = path.join(tempDir, 'music-playlist.m4a')
        await concatAudio(music.files, playlistPath)
        audioPath = playlistPath
      } else if (music.files[0]) {
        audioPath = music.files[0]
      }
      await aiTask
      if (!aiVideoPath) {
        throw new AppError(502, 'AI_VIDEO_FAILED', 'Animasi AI tidak menghasilkan video.')
      }
    } else {
      if (scenes.length === 0) {
        scenes = [
          {
            title: input.title,
            narration: input.title,
            visual: 'Visual utama konten',
            animation: 'slow-zoom',
            duration: 12,
          },
        ]
      }

      const voiceFiles: string[] = []
      const fitted: RenderScene[] = []
      const voiceExt = ttsProvider() === 'heygen' ? '.wav' : '.mp3'
      let total = 0
      for (const [index, scene] of scenes.entries()) {
        const voicePath = path.join(tempDir, `voice-${index}${voiceExt}`)
        const voiceProvider = await synthesizeSpeech(scene.narration, voicePath)
        const voiceDuration = voiceProvider ? await probeDuration(voicePath) : 0
        const planned = Math.max(3, Math.min(15, Math.round((voiceDuration || scene.duration) + 0.4)))
        if (total + planned > maxSeconds && fitted.length > 0) break
        const clipped = Math.min(planned, Math.max(2, maxSeconds - total))
        fitted.push({ ...scene, duration: clipped })
        total += clipped
        if (voiceDuration > 0) {
          voiceFiles.push(voicePath)
          ttsUsed = voiceProvider
        }
      }

      scenes = fitted.length > 0 ? fitted : scenes.slice(0, 1)
      duration = Math.max(4, Math.min(maxSeconds, total || 12))

      const bedPath = path.join(tempDir, `bed${musicExt}`)
      const bed = await buildMusicBed(
        input.musicStyle,
        duration,
        bedPath,
        input.audioPrompt,
        input.title,
        input.kieApiKey,
      )
      musicUsed = bed.provider
      const musicBedPath = bed.files[0] ?? bedPath
      if (voiceFiles.length > 0) {
        const voicePath = path.join(tempDir, 'voice.m4a')
        await concatAudio(voiceFiles, voicePath)
        await mixVoiceAndBed(voicePath, musicBedPath, audioPath)
        narration = 'tts'
      } else {
        audioPath = musicBedPath
      }
    }

    if (input.contentType === 'music') {
      await renderMusicLoop(
        size,
        audioPath,
        videoPath,
        duration,
        tempDir,
        aiVideoPath as string,
      )
    } else if (scenes.length <= 1) {
      const accent = (STYLE_ACCENTS[input.thumbnailStyle] ?? '#F5D64B').replace('#', '0x')
      const vertical = input.format === 'short'
      const waveWidth = Math.round(size.width - 120)
      const waveHeight = Math.round(size.height * (vertical ? 0.11 : 0.22))
      const waveY = Math.round(size.height * (vertical ? 0.56 : 0.66))
      const fadeOut = Math.max(0, duration - 1)
      const filter = [
        `[0:v]scale=${size.width}:${size.height},format=rgba,zoompan=z='min(zoom+0.00045,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${size.width}x${size.height}:fps=${FPS}[bg]`,
        `[1:a]showwaves=s=${waveWidth}x${waveHeight}:mode=cline:colors=${accent}|0xFFFFFF:rate=${FPS},format=rgba,colorkey=black:0.01:0.08[wave]`,
        `[bg][wave]overlay=x=${Math.round((size.width - waveWidth) / 2)}:y=${waveY}:shortest=1,format=yuv420p,fade=t=out:st=${fadeOut.toFixed(2)}:d=1[v]`,
      ].join(';')
      await run(
        ffmpeg,
        [
          '-y',
          '-loop',
          '1',
          '-framerate',
          String(FPS),
          '-i',
          posterPath,
          '-i',
          audioPath,
          '-t',
          duration.toFixed(2),
          '-filter_complex',
          filter,
          '-map',
          '[v]',
          '-map',
          '1:a',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-shortest',
          '-movflags',
          '+faststart',
          videoPath,
        ],
        240_000,
      )
    } else {
      const clips: string[] = []
      for (const [index, scene] of scenes.entries()) {
        const svg = sceneSvg(scene, index, scenes.length, input, size)
        const imagePath = path.join(tempDir, `scene-${index}.png`)
        await writeFile(imagePath, svgToPng(svg, size.width))
        const clipPath = path.join(tempDir, `clip-${index}.mp4`)
        const fadeOut = Math.max(0, scene.duration - 0.35)
        await run(
          ffmpeg,
          [
            '-y',
            '-loop',
            '1',
            '-framerate',
            String(FPS),
            '-i',
            imagePath,
            '-t',
            scene.duration.toFixed(2),
            '-vf',
            `scale=${size.width}:${size.height},format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOut.toFixed(2)}:d=0.35`,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '23',
            '-pix_fmt',
            'yuv420p',
            '-an',
            clipPath,
          ],
          240_000,
        )
        clips.push(clipPath)
      }

      const listPath = path.join(tempDir, 'clips.txt')
      await writeFile(listPath, clips.map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`).join('\n'))
      const silentPath = path.join(tempDir, 'silent.mp4')
      await run(
        ffmpeg,
        ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', silentPath],
        240_000,
      )
      await run(
        ffmpeg,
        [
          '-y',
          '-i',
          silentPath,
          '-i',
          audioPath,
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-shortest',
          '-movflags',
          '+faststart',
          videoPath,
        ],
        240_000,
      )
    }

    const [posterInfo, videoInfo] = await Promise.all([stat(posterPath), stat(videoPath)])
    const probe = await probeDuration(videoPath)

    return {
      videoUrl: `${MEDIA_URL_PREFIX}/${path.basename(videoPath)}`,
      previewUrl: `${MEDIA_URL_PREFIX}/${path.basename(posterPath)}`,
      posterBytes: posterInfo.size,
      videoBytes: videoInfo.size,
      duration: probe > 0 ? Math.round(probe * 10) / 10 : duration,
      width: size.width,
      height: size.height,
      narration: narration === 'tts' ? 'tts' : 'bed',
      musicProvider: musicUsed,
      musicTrackCount: musicTracksUsed,
      ttsProvider: ttsUsed,
      imageProvider: input.imageProvider ?? 'none',
      imageCount: input.imageCount ?? 0,
      videoProvider: aiProvider,
      videoModel: aiModel,
    }
  } catch (error) {
    await rm(videoPath, { force: true })
    await rm(posterPath, { force: true })
    if (error instanceof AppError) throw error
    throw new AppError(
      502,
      'MEDIA_RENDER_FAILED',
      `Render media gagal: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function safeSlug(value: string): string {
  return shortCode(value).toLowerCase().slice(0, 48) || 'konten'
}
