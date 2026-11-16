import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { hasYouTubeUploadScope } from '../lib/youtube-scopes.js'
import { mapItem } from './content.js'
import { MEDIA_STORAGE_DIR, MEDIA_URL_PREFIX } from './media-renderer.js'
import { refreshGoogleAccessToken } from './youtube.js'

const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'
const UPLOAD_INIT_TIMEOUT_MS = 60_000
const UPLOAD_TIMEOUT_MS = 900_000

export const YOUTUBE_PRIVACY_VALUES = ['private', 'unlisted', 'public'] as const
export type YouTubePrivacy = (typeof YOUTUBE_PRIVACY_VALUES)[number]

export interface PublishYouTubeInput {
  privacyStatus: YouTubePrivacy
}

export interface PublishYouTubeResult {
  item: ReturnType<typeof mapItem>
  upload: {
    videoId: string
    url: string
    privacyStatus: YouTubePrivacy
    uploadedAt: string
  }
}

function cleanTitle(value: string): string {
  return value
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

function cleanDescription(value: string): string {
  return value
    .replace(/[<>]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 5000)
}

function buildTags(item: { hashtags: string[] }): string[] {
  const tags: string[] = []
  let length = 0
  for (const raw of item.hashtags) {
    const tag = raw.replace(/^#+/, '').trim().slice(0, 30)
    if (!tag || tags.includes(tag)) continue
    if (tags.length >= 15 || length + tag.length + 1 > 480) break
    tags.push(tag)
    length += tag.length + 1
  }
  return tags
}

function buildDescription(item: {
  caption: string | null
  script: string | null
  hashtags: string[]
}): string {
  const parts: string[] = []
  if (item.caption?.trim()) parts.push(item.caption)
  if (item.script?.trim()) parts.push(item.script)
  if (item.hashtags.length > 0) parts.push(item.hashtags.join(' '))
  return cleanDescription(parts.join('\n\n'))
}

function youtubeCategoryId(item: { niche: string }): string {
  return /musik|music|phonk|bass|lagu/i.test(item.niche) ? '10' : '22'
}

function resolveVideoPath(videoUrl: string | null): string {
  if (!videoUrl) {
    throw badRequest('VIDEO_NOT_READY', 'Render video terlebih dahulu sebelum upload ke YouTube.')
  }
  let pathname = videoUrl
  if (/^https?:\/\//i.test(videoUrl)) {
    try {
      pathname = new URL(videoUrl).pathname
    } catch {
      throw badRequest('VIDEO_NOT_READY', 'URL video tidak valid.')
    }
  }
  const prefix = `${MEDIA_URL_PREFIX}/`
  if (!pathname.startsWith(prefix)) {
    throw badRequest('VIDEO_NOT_READY', 'Video harus berasal dari penyimpanan media Nuanscape.')
  }
  const filename = pathname.slice(prefix.length)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$/i.test(filename)) {
    throw badRequest('VIDEO_NOT_READY', 'Nama file video tidak valid.')
  }
  const root = path.resolve(MEDIA_STORAGE_DIR)
  const resolved = path.resolve(root, filename)
  if (path.dirname(resolved) !== root) {
    throw badRequest('VIDEO_NOT_READY', 'Path video tidak valid.')
  }
  return resolved
}

async function readGoogleError(response: Response, fallback: string): Promise<AppError> {
  const text = await response.text().catch(() => '')
  let message = ''
  let reason = ''
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> }
    }
    message = data.error?.message ?? ''
    reason = data.error?.errors?.[0]?.reason ?? ''
  } catch {
    message = text.slice(0, 300)
  }
  const detail = message || fallback
  if (response.status === 401) {
    return new AppError(
      401,
      'YOUTUBE_REAUTH_REQUIRED',
      'Izin YouTube sudah tidak berlaku. Hubungkan ulang akun YouTube.',
    )
  }
  if (response.status === 403 && /quota/i.test(`${reason} ${message}`)) {
    return new AppError(
      429,
      'YOUTUBE_QUOTA_EXCEEDED',
      'Kuota YouTube API habis. Coba upload lagi setelah kuota direset.',
    )
  }
  if (response.status === 403) {
    return new AppError(403, 'YOUTUBE_UPLOAD_FORBIDDEN', detail)
  }
  if (response.status === 429) {
    return new AppError(429, 'YOUTUBE_RATE_LIMITED', detail)
  }
  return new AppError(502, 'YOUTUBE_UPLOAD_FAILED', detail)
}

async function markFailed(contentItemId: string, message: string): Promise<void> {
  await prisma.contentItem
    .update({
      where: { id: contentItemId },
      data: { publishStatus: 'failed', publishError: message.slice(0, 2000) },
    })
    .catch(() => undefined)
}

export async function publishContentToYouTube(
  ownerId: string,
  contentItemId: string,
  input: PublishYouTubeInput,
): Promise<PublishYouTubeResult> {
  const item = await prisma.contentItem.findFirst({
    where: { id: contentItemId, ownerId },
    include: { account: true },
  })
  if (!item) throw notFound('Konten tidak ditemukan.')
  if (item.platform !== 'YouTube') {
    throw badRequest('YOUTUBE_ONLY', 'Upload otomatis hanya tersedia untuk konten YouTube.')
  }
  if (!item.account) {
    throw badRequest('YOUTUBE_ACCOUNT_REQUIRED', 'Pilih akun YouTube untuk konten ini.')
  }
  if (item.account.platform !== 'YouTube' || item.account.ownerId !== ownerId) {
    throw badRequest('YOUTUBE_ACCOUNT_REQUIRED', 'Akun YouTube pada konten tidak valid.')
  }
  if (!item.account.oauthRefreshToken) {
    throw new AppError(
      409,
      'YOUTUBE_REAUTH_REQUIRED',
      'Hubungkan ulang akun YouTube untuk memberikan izin upload.',
    )
  }
  if (!hasYouTubeUploadScope(item.account.oauthScopes)) {
    throw new AppError(
      409,
      'YOUTUBE_UPLOAD_SCOPE_MISSING',
      'Akun YouTube belum memberi izin upload. Hubungkan ulang akun YouTube lalu setujui izin upload video.',
    )
  }
  if (item.youtubeVideoId) {
    throw conflict(
      'YOUTUBE_ALREADY_UPLOADED',
      'Video ini sudah diunggah ke YouTube. Gunakan video hasil render baru untuk upload ulang.',
    )
  }
  if (item.publishStatus === 'uploading' && Date.now() - item.updatedAt.getTime() < 30 * 60_000) {
    throw new AppError(409, 'YOUTUBE_UPLOAD_IN_PROGRESS', 'Upload video sedang berjalan.')
  }

  const filePath = resolveVideoPath(item.videoUrl)
  let fileSize = 0
  try {
    const info = await stat(filePath)
    if (!info.isFile() || info.size <= 0) throw new Error('empty')
    fileSize = info.size
  } catch {
    throw badRequest('VIDEO_NOT_READY', 'File video belum tersedia di penyimpanan media.')
  }

  const title = cleanTitle(item.title) || 'Nuanscape Studio'
  const description = buildDescription(item)
  const tags = buildTags(item)
  const privacyStatus = input.privacyStatus

  await prisma.contentItem.update({
    where: { id: item.id },
    data: { publishStatus: 'uploading', publishError: null },
  })

  let accessToken: string
  try {
    accessToken = await refreshGoogleAccessToken(item.account.oauthRefreshToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui izin YouTube.'
    await markFailed(item.id, message)
    throw new AppError(
      401,
      'YOUTUBE_REAUTH_REQUIRED',
      'Izin YouTube sudah tidak berlaku. Hubungkan ulang akun YouTube.',
    )
  }

  let videoId = ''
  try {
    const initResponse = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags,
          categoryId: youtubeCategoryId(item),
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
          embeddable: true,
        },
      }),
      signal: AbortSignal.timeout(UPLOAD_INIT_TIMEOUT_MS),
    })
    if (!initResponse.ok) throw await readGoogleError(initResponse, 'Gagal memulai upload YouTube.')
    const location = initResponse.headers.get('location')
    if (!location) {
      throw new AppError(
        502,
        'YOUTUBE_UPLOAD_FAILED',
        'YouTube tidak mengembalikan alamat upload.',
      )
    }

    const stream = createReadStream(filePath)
    try {
      const uploadResponse = await fetch(location, {
        method: 'PUT',
        headers: {
          'content-type': 'video/mp4',
          'content-length': String(fileSize),
        },
        body: Readable.toWeb(stream) as unknown as RequestInit['body'],
        duplex: 'half',
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      } as RequestInit & { duplex: 'half' })
      if (!uploadResponse.ok) throw await readGoogleError(uploadResponse, 'Upload video ke YouTube gagal.')
      const data = (await uploadResponse.json().catch(() => ({}))) as { id?: string }
      if (!data.id || !/^[A-Za-z0-9_-]{5,20}$/.test(data.id)) {
        throw new AppError(
          502,
          'YOUTUBE_UPLOAD_FAILED',
          'YouTube tidak mengembalikan ID video hasil upload.',
        )
      }
      videoId = data.id
    } finally {
      stream.destroy()
    }
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error && error.name === 'TimeoutError' ? 504 : 502,
            error instanceof Error && error.name === 'TimeoutError'
              ? 'YOUTUBE_UPLOAD_TIMEOUT'
              : 'YOUTUBE_UPLOAD_FAILED',
            error instanceof Error ? error.message : 'Upload video ke YouTube gagal.',
          )
    await markFailed(item.id, appError.message)
    throw appError
  }

  const uploadedAt = new Date()
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const data: {
    youtubeVideoId: string
    youtubeUrl: string
    youtubePrivacy: string
    youtubeUploadedAt: Date
    publishStatus: string
    publishError: null
    status?: string
  } = {
    youtubeVideoId: videoId,
    youtubeUrl: url,
    youtubePrivacy: privacyStatus,
    youtubeUploadedAt: uploadedAt,
    publishStatus: 'uploaded',
    publishError: null,
  }
  if (privacyStatus === 'public') data.status = 'Published'

  const updated = await prisma.contentItem.update({
    where: { id: item.id },
    data,
  })

  await prisma.appNotification
    .create({
      data: {
        ownerId,
        title: 'Video terunggah ke YouTube',
        message: `${updated.title} sudah diunggah sebagai ${privacyStatus}.`,
        type: 'content',
        href: url,
      },
    })
    .catch(() => undefined)

  return {
    item: mapItem(updated),
    upload: {
      videoId,
      url,
      privacyStatus,
      uploadedAt: uploadedAt.toISOString(),
    },
  }
}
