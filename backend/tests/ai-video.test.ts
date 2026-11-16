import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { synthesizeImageToVideo } from '../src/services/ai-video.js'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'nuanscape-ai-video-'))
  vi.stubEnv('KIE_API_KEY', 'kie-test-key')
  vi.stubEnv('KIE_VIDEO_MODEL', 'grok-imagine-video-1-5-preview')
  vi.stubEnv('KIE_VIDEO_DURATION', '6')
  vi.stubEnv('KIE_VIDEO_RESOLUTION', '720p')
  vi.stubEnv('KIE_VIDEO_POLL_INTERVAL_MS', '1')
  vi.stubEnv('KIE_VIDEO_TIMEOUT_MS', '60000')
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

describe('Animasi AI image-to-video via KIE', () => {
  it('upload gambar, membuat task, polling, lalu mengunduh video', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)

      if (url.endsWith('/api/file-stream-upload')) {
        const headers = init?.headers as Record<string, string>
        expect(headers.Authorization).toBe('Bearer db-key')
        const form = init?.body as FormData
        expect(form.get('uploadPath')).toBe('nuanscape/video-inputs')
        expect(form.get('fileName')).toBe('poster.png')
        return json({
          code: 200,
          success: true,
          data: { downloadUrl: 'https://cdn.test/uploaded.png' },
        })
      }

      if (url.endsWith('/api/v1/jobs/createTask')) {
        const headers = init?.headers as Record<string, string>
        expect(headers.Authorization).toBe('Bearer db-key')
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        expect(body.model).toBe('grok-imagine-video-1-5-preview')
        expect(body.input).toMatchObject({
          image_urls: ['https://cdn.test/uploaded.png'],
          duration: 6,
          resolution: '720p',
          aspect_ratio: '16:9',
        })
        expect(String((body.input as Record<string, unknown>).prompt)).toContain('seamless')
        return json({ code: 200, msg: 'success', data: { taskId: 'video-task-1' } })
      }

      if (url.includes('/api/v1/jobs/recordInfo')) {
        return json({
          code: 200,
          data: {
            state: 'success',
            resultJson: JSON.stringify({
              resultUrls: ['https://cdn.test/loop-source.mp4'],
            }),
          },
        })
      }

      if (url === 'https://cdn.test/loop-source.mp4') {
        return new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const image = path.join(dir, 'poster.png')
    await writeFile(image, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const out = path.join(dir, 'source.mp4')
    const result = await synthesizeImageToVideo(
      image,
      out,
      'Subtle cinematic motion loop. Calm, atmospheric, seamless ambient motion.',
      'db-key',
      { duration: 6, aspectRatio: '16:9' },
    )

    expect(result).toMatchObject({
      taskId: 'video-task-1',
      model: 'grok-imagine-video-1-5-preview',
      videoUrl: 'https://cdn.test/loop-source.mp4',
      bytes: 8,
    })
    expect(await readFile(out)).toEqual(Buffer.from([0, 0, 0, 24, 102, 116, 121, 112]))
    expect(calls.filter((url) => url.includes('/recordInfo'))).toHaveLength(1)
  })

  it('menerjemahkan kredit kurang menjadi error yang jelas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.endsWith('/api/file-stream-upload')) {
          return json({ code: 200, data: { downloadUrl: 'https://cdn.test/uploaded.png' } })
        }
        return json({ code: 402, msg: 'Insufficient credits' })
      }),
    )
    const image = path.join(dir, 'poster.png')
    await writeFile(image, Buffer.from([137, 80, 78, 71]))

    await expect(
      synthesizeImageToVideo(image, path.join(dir, 'out.mp4'), 'Slow ambient motion'),
    ).rejects.toMatchObject({ code: 'VIDEO_PROVIDER_INSUFFICIENT_CREDITS' })
  })

  it('menolak render tanpa KIE_API_KEY', async () => {
    vi.stubEnv('KIE_API_KEY', '')
    const image = path.join(dir, 'poster.png')
    await writeFile(image, Buffer.from([137, 80, 78, 71]))

    await expect(
      synthesizeImageToVideo(image, path.join(dir, 'out.mp4'), 'Slow ambient motion'),
    ).rejects.toMatchObject({ code: 'VIDEO_PROVIDER_NOT_CONFIGURED' })
  })
})
