import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { synthesizeGptImage } from '../src/services/gpt-image.js'
import { buildImagePrompt, buildPreviewSvg, buildPurePreviewSvg } from '../src/services/media-generator.js'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'nuanscape-image-'))
  vi.stubEnv('KIE_API_KEY', 'kie-test-key')
  vi.stubEnv('GPT_IMAGE_MODEL', 'gpt-image-2-text-to-image')
  vi.stubEnv('IMAGE_POLL_INTERVAL_MS', '250')
  vi.stubEnv('IMAGE_TIMEOUT_MS', '60000')
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

describe('GPT Image 2 via KIE', () => {
  it('membuat task, polling recordInfo, lalu mengunduh resultUrls', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)

      if (url.endsWith('/api/v1/jobs/createTask')) {
        const headers = init?.headers as Record<string, string>
        expect(headers.Authorization).toBe('Bearer db-key')
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        expect(body.model).toBe('gpt-image-2-text-to-image')
        expect(body.input).toMatchObject({
          aspect_ratio: '9:16',
          prompt: 'A cinematic vinyl room',
        })
        return json({ code: 200, msg: 'success', data: { taskId: 'image-task-1' } })
      }

      if (url.includes('/api/v1/jobs/recordInfo')) {
        return json({
          code: 200,
          data: {
            state: 'success',
            resultJson: JSON.stringify({
              resultUrls: ['https://cdn.test/background.png'],
            }),
          },
        })
      }

      if (url === 'https://cdn.test/background.png') {
        return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = path.join(dir, 'background.png')
    const result = await synthesizeGptImage('A cinematic vinyl room', out, '9:16', 'db-key')

    expect(result).toMatchObject({
      taskId: 'image-task-1',
      imageUrl: 'https://cdn.test/background.png',
    })
    expect(await readFile(out)).toEqual(Buffer.from([137, 80, 78, 71]))
    expect(calls.filter((url) => url.includes('/recordInfo'))).toHaveLength(1)
  })

  it('menerjemahkan kredit KIE habis menjadi AppError 402', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ code: 402, msg: 'Credits insufficient' }, 402)),
    )

    await expect(
      synthesizeGptImage('A cinematic vinyl room', path.join(dir, 'background.png')),
    ).rejects.toMatchObject({
      statusCode: 402,
      code: 'IMAGE_PROVIDER_INSUFFICIENT_CREDITS',
    })
  })

  it('menolak request tanpa KIE_API_KEY', async () => {
    vi.stubEnv('KIE_API_KEY', '')

    await expect(
      synthesizeGptImage('A cinematic vinyl room', path.join(dir, 'background.png')),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'IMAGE_PROVIDER_NOT_CONFIGURED',
    })
  })
})

describe('Prompt dan poster GPT Image 2', () => {
  it('menyusun prompt vertikal tanpa teks di gambar', () => {
    const prompt = buildImagePrompt({
      contentType: 'konspirasi',
      title: 'Misteri Vinyl',
      thumbnailStyle: 'dossier',
      musicStyle: 'Dark ambient',
      format: 'short',
      scenes: [{ visual: 'arsip vinyl tua di ruang gelap' }],
    })

    expect(prompt).toContain('arsip vinyl tua di ruang gelap')
    expect(prompt).toContain('vertical 9:16')
    expect(prompt).toContain('No text')
    expect(prompt).toContain('no logos')
  })

  it('menempelkan gambar latar ke poster vertikal 720x1280', () => {
    const svg = buildPreviewSvg(
      'Misteri Vinyl yang Hilang',
      'konspirasi',
      'dossier',
      'slow-zoom',
      'Dark ambient',
      { backgroundImage: 'data:image/png;base64,AAAA', format: 'short' },
    )

    expect(svg).toContain('width="720"')
    expect(svg).toContain('height="1280"')
    expect(svg).toContain('href="data:image/png;base64,AAAA"')
    expect(svg).toContain('url(#scrim)')
  })

  it('menyusun prompt thumbnail musik murni tanpa ruang tipografi', () => {
    const prompt = buildImagePrompt({
      contentType: 'music',
      title: 'Lofi Senja',
      thumbnailStyle: 'vinyl',
      musicStyle: 'Lofi',
      brief: 'Ruang dengar vinyl hangat saat senja',
      format: 'long',
    })

    expect(prompt).toContain('Pure thumbnail image')
    expect(prompt).toContain('Ruang dengar vinyl hangat saat senja')
    expect(prompt).toContain('full-frame purely visual composition')
    expect(prompt).not.toContain('leaving room for a typography overlay')
  })

  it('membuat poster musik murni tanpa teks, scrim, atau overlay', () => {
    const svg = buildPurePreviewSvg('data:image/png;base64,AAAA', 'long')

    expect(svg).toContain('width="1280"')
    expect(svg).toContain('height="720"')
    expect(svg).toContain('href="data:image/png;base64,AAAA"')
    expect(svg).not.toContain('<text')
    expect(svg).not.toContain('scrim')
    expect(svg).not.toContain('opacity')
  })
})
