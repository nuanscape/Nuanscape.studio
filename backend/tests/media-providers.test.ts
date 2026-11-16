import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetHeyGenVoiceCache, synthesizeHeyGen } from '../src/services/heygen.js'
import { buildMusicBed, musicVariationPrompt, normalizeMusicTrackCount } from '../src/services/music.js'
import { synthesizeSunoMusic } from '../src/services/suno.js'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'nuanscape-media-'))
  vi.stubEnv('KIE_API_KEY', 'kie-test-key')
  vi.stubEnv('SUNO_MODEL', 'V6_MINI')
  vi.stubEnv('SUNO_POLL_INTERVAL_MS', '250')
  vi.stubEnv('HEYGEN_API_KEY', 'heygen-test-key')
  vi.stubEnv('HEYGEN_VOICE_ID', 'voice-1')
  vi.stubEnv('HEYGEN_LANGUAGE', 'id')
  resetHeyGenVoiceCache()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetHeyGenVoiceCache()
  await rm(dir, { recursive: true, force: true })
})

describe('Suno via KIE', () => {
  it('membuat task, polling recordInfo, lalu mengunduh audio_url', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)

      if (url.endsWith('/api/v1/jobs/createTask')) {
        const headers = init?.headers as Record<string, string>
        expect(headers.Authorization).toBe('Bearer db-key')
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        expect(body.model).toBe('ai-music-api/generate')
        expect(body.input).toMatchObject({
          model: 'V6_MINI',
          instrumental: true,
          custom_mode: true,
          duration: 12,
        })
        return json({ code: 200, msg: 'success', data: { taskId: 'task-1' } })
      }

      if (url.includes('/api/v1/jobs/recordInfo')) {
        return json({
          code: 200,
          data: {
            state: 'success',
            resultJson: JSON.stringify({
              code: 200,
              data: [
                {
                  id: 'track-1',
                  audio_url: 'https://cdn.test/music.mp3',
                  duration: 12,
                },
              ],
            }),
          },
        })
      }

      if (url === 'https://cdn.test/music.mp3') {
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = path.join(dir, 'music.mp3')
    const result = await synthesizeSunoMusic(
      'lofi instrumental, no vocals',
      12,
      out,
      'Test Bed',
      'db-key',
    )

    expect(result).toMatchObject({ taskId: 'task-1', trackId: 'track-1', duration: 12 })
    expect(await readFile(out)).toEqual(Buffer.from([1, 2, 3, 4]))
    expect(calls.filter((url) => url.includes('/recordInfo'))).toHaveLength(1)
  })

  it('menerjemahkan kredit KIE habis menjadi AppError 402', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ code: 402, msg: 'not enough credits' }, 402)),
    )

    await expect(
      synthesizeSunoMusic('lofi instrumental', 12, path.join(dir, 'music.mp3')),
    ).rejects.toMatchObject({
      statusCode: 402,
      code: 'MUSIC_PROVIDER_INSUFFICIENT_CREDITS',
    })
  })

  it('menolak request tanpa KIE_API_KEY', async () => {
    vi.stubEnv('KIE_API_KEY', '')

    await expect(
      synthesizeSunoMusic('lofi instrumental', 12, path.join(dir, 'music.mp3')),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'MUSIC_PROVIDER_NOT_CONFIGURED',
    })
  })

  it('membuat lima track Suno dengan genre sama dan prompt variasi berbeda', async () => {
    vi.stubEnv('MUSIC_PROVIDER', 'suno')
    let created = 0
    const prompts: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)

      if (url.endsWith('/api/v1/jobs/createTask')) {
        created += 1
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          input?: { style?: string }
        }
        prompts.push(body.input?.style ?? '')
        return json({ code: 200, data: { taskId: `task-${created}` } })
      }

      if (url.includes('/api/v1/jobs/recordInfo')) {
        const taskId = new URL(url).searchParams.get('taskId') ?? ''
        return json({
          code: 200,
          data: {
            state: 'success',
            resultJson: JSON.stringify({
              data: [
                {
                  id: `track-${taskId}`,
                  audio_url: `https://cdn.test/${taskId}.mp3`,
                  duration: 30,
                },
              ],
            }),
          },
        })
      }

      if (url.startsWith('https://cdn.test/')) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildMusicBed(
      'lofi instrumental',
      30,
      path.join(dir, 'music.mp3'),
      'Lofi beats untuk belajar',
      'Test Bed',
      'db-key',
      5,
    )

    expect(result.provider).toBe('suno')
    expect(result.files).toHaveLength(5)
    expect(result.files.map((file) => path.basename(file))).toEqual([
      'music-1.mp3',
      'music-2.mp3',
      'music-3.mp3',
      'music-4.mp3',
      'music-5.mp3',
    ])
    expect(created).toBe(5)
    expect(prompts).toHaveLength(5)
    expect(new Set(prompts).size).toBe(5)
    expect(prompts[0]).toBe('Lofi beats untuk belajar')
    expect(prompts[1]).toContain('Variation 2/5')
    expect(prompts.slice(1).every((prompt) => prompt.includes('same genre, type, mood'))).toBe(true)
    expect(normalizeMusicTrackCount(undefined)).toBe(5)
    expect(normalizeMusicTrackCount(9)).toBe(5)
    expect(normalizeMusicTrackCount(0)).toBe(1)
    expect(musicVariationPrompt('lofi', 0, 5)).toBe('lofi')
  })
})

describe('HeyGen TTS', () => {
  it('memanggil /v3/models/audio/tts dengan voice pilihan dan mengunduh audio', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)

      if (url === 'https://api.heygen.com/v3/models/audio/tts') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        expect(body).toMatchObject({
          model: 'heygen-voice-1-turbo-free',
          voice_id: 'voice-1',
          text: 'Halo dari Nuanscape.',
          language: 'id',
        })
        return json({
          data: {
            audio_url: 'https://cdn.test/voice.wav',
            duration: 1.4,
          },
        })
      }

      if (url === 'https://cdn.test/voice.wav') {
        return new Response(new Uint8Array([9, 8, 7]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = path.join(dir, 'voice.wav')
    const result = await synthesizeHeyGen('Halo dari Nuanscape.', out)

    expect(result).toMatchObject({ voiceId: 'voice-1', model: 'heygen-voice-1-turbo-free', duration: 1.4 })
    expect(await readFile(out)).toEqual(Buffer.from([9, 8, 7]))
    expect(calls).toHaveLength(2)
  })

  it('memilih voice publik aktif saat HEYGEN_VOICE_ID kosong', async () => {
    vi.stubEnv('HEYGEN_VOICE_ID', '')
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      calls.push(url)

      if (url.startsWith('https://api.heygen.com/v3/models/audio/voices')) {
        expect(url).toContain('language=id')
        return json({
          data: [
            { voice_id: 'voice-id-id', name: 'Suara Indonesia', language: 'id', status: 'ACTIVE' },
          ],
        })
      }

      if (url === 'https://api.heygen.com/v3/models/audio/tts') {
        return json({ data: { audio_url: 'https://cdn.test/voice.wav', duration: 1 } })
      }

      if (url === 'https://cdn.test/voice.wav') {
        return new Response(new Uint8Array([1]), { status: 200 })
      }

      throw new Error(`unexpected ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await synthesizeHeyGen('Halo.', path.join(dir, 'voice.wav'))

    expect(result.voiceId).toBe('voice-id-id')
    expect(calls[0]).toContain('/v3/models/audio/voices')
  })

  it('menolak request tanpa HEYGEN_API_KEY', async () => {
    vi.stubEnv('HEYGEN_API_KEY', '')

    await expect(synthesizeHeyGen('Halo.', path.join(dir, 'voice.wav'))).rejects.toMatchObject({
      statusCode: 503,
      code: 'TTS_PROVIDER_NOT_CONFIGURED',
    })
  })
})
