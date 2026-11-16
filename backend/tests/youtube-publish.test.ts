import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'
import { YOUTUBE_UPLOAD_SCOPE } from '../src/lib/youtube-scopes.js'
import { MEDIA_STORAGE_DIR } from '../src/services/media-renderer.js'

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `youtube-publish-${suffix}@nuanscape.test`
const accountId = `test-upload-${suffix}`
const videoName = `youtube-publish-${suffix}.mp4`
const videoPath = path.join(MEDIA_STORAGE_DIR, videoName)

let ownerId = ''
let itemId = ''

function headers() {
  return { 'x-owner-id': ownerId }
}

async function createItem(status = 'Ready to Publish') {
  return prisma.contentItem.create({
    data: {
      ownerId,
      accountId,
      title: 'Uji upload YouTube dengan judul yang cukup panjang',
      platform: 'YouTube',
      niche: 'Musik Phonk',
      format: 'Long-form mix · 1 jam',
      status,
      scheduledAt: new Date(Date.now() + 86_400_000),
      caption: 'Deskripsi singkat untuk pengujian upload.',
      hashtags: ['#phonk', '#desibass'],
      script: 'Naskah pengujian upload YouTube.',
      videoUrl: `/api/v1/media/${videoName}`,
      generated: true,
    },
  })
}

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8790/api/v1/content/youtube/oauth/callback'
  await mkdir(MEDIA_STORAGE_DIR, { recursive: true })
  await writeFile(videoPath, Buffer.from('fake-mp4-content'))

  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'YouTube Publish Test',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id

  await prisma.platformAccount.create({
    data: {
      id: accountId,
      ownerId,
      platform: 'YouTube',
      format: 'long',
      name: 'Test Upload YouTube',
      handle: `@upload-${suffix}`,
      niche: 'Musik Phonk',
      followers: 1000,
      posts30d: 1,
      views30d: 1000,
      engagement: 5,
      avgWatchMinutes: 2,
      completionRate: 30,
      status: 'Active',
      lastSync: new Date(),
      oauthRefreshToken: 'test-refresh-token',
      oauthScopes: `https://www.googleapis.com/auth/youtube.readonly ${YOUTUBE_UPLOAD_SCOPE}`,
    },
  })

  const item = await createItem()
  itemId = item.id
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await rm(videoPath, { force: true })
  await prisma.$disconnect()
  await app.close()
})

describe('youtube upload', () => {
  it('menolak upload tanpa persetujuan eksplisit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/items/${itemId}/youtube-upload`,
      headers: headers(),
      payload: { privacyStatus: 'private' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('YOUTUBE_APPROVAL_REQUIRED')
  })

  it('mengunggah video setelah persetujuan dan menyimpan ID YouTube', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init })
        if (String(url).includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        if (String(url).includes('uploadType=resumable')) {
          return new Response('{}', {
            status: 200,
            headers: { location: 'https://upload.example/session-1' },
          })
        }
        return new Response(JSON.stringify({ id: 'abc123XYZ_-' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/items/${itemId}/youtube-upload`,
      headers: headers(),
      payload: { privacyStatus: 'unlisted', confirm: true },
    })

    expect(response.statusCode).toBe(200)
    const data = response.json()
    expect(data.upload.videoId).toBe('abc123XYZ_-')
    expect(data.upload.privacyStatus).toBe('unlisted')
    expect(data.upload.url).toBe('https://www.youtube.com/watch?v=abc123XYZ_-')
    expect(data.item.youtubeVideoId).toBe('abc123XYZ_-')
    expect(data.item.publishStatus).toBe('uploaded')

    const stored = await prisma.contentItem.findUniqueOrThrow({ where: { id: itemId } })
    expect(stored.youtubeVideoId).toBe('abc123XYZ_-')
    expect(stored.youtubePrivacy).toBe('unlisted')
    expect(stored.publishError).toBeNull()
    expect(stored.status).toBe('Ready to Publish')

    const notification = await prisma.appNotification.findFirst({
      where: { ownerId, href: data.upload.url },
    })
    expect(notification?.title).toBe('Video terunggah ke YouTube')

    expect(calls).toHaveLength(3)
    expect(calls[1]?.init?.headers).toMatchObject({
      'x-upload-content-type': 'video/mp4',
    })
    const payload = JSON.parse(String(calls[1]?.init?.body)) as {
      snippet: { title: string; description: string; tags: string[] }
      status: { privacyStatus: string; selfDeclaredMadeForKids: boolean }
    }
    expect(payload.snippet.tags).toEqual(['phonk', 'desibass'])
    expect(payload.snippet.description).toContain('Deskripsi singkat')
    expect(payload.status.privacyStatus).toBe('unlisted')
    expect(payload.status.selfDeclaredMadeForKids).toBe(false)
  })

  it('memberi error yang jelas saat akun belum memberi izin upload', async () => {
    await prisma.platformAccount.update({
      where: { id: accountId },
      data: { oauthScopes: 'https://www.googleapis.com/auth/youtube.readonly' },
    })
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/items/${itemId}/youtube-upload`,
      headers: headers(),
      payload: { privacyStatus: 'private', confirm: true },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('YOUTUBE_UPLOAD_SCOPE_MISSING')
    await prisma.platformAccount.update({
      where: { id: accountId },
      data: { oauthScopes: `https://www.googleapis.com/auth/youtube.readonly ${YOUTUBE_UPLOAD_SCOPE}` },
    })
  })

  it('menandai konten gagal saat YouTube menolak upload', async () => {
    const failingItem = await createItem()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'test-access-token' }), { status: 200 })
        }
        return new Response(
          JSON.stringify({
            error: {
              message: 'The user does not have permission to upload.',
              errors: [{ reason: 'forbidden' }],
            },
          }),
          { status: 403, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/items/${failingItem.id}/youtube-upload`,
      headers: headers(),
      payload: { privacyStatus: 'private', confirm: true },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('YOUTUBE_UPLOAD_FORBIDDEN')

    const stored = await prisma.contentItem.findUniqueOrThrow({ where: { id: failingItem.id } })
    expect(stored.publishStatus).toBe('failed')
    expect(stored.publishError).toContain('permission')
  })
})
