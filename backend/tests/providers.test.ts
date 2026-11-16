import { randomUUID, createHash } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { decryptSecret, encryptSecret, maskSecret } from '../src/lib/encryption.js'
import { prisma } from '../src/lib/prisma.js'
import { resolveProviderChain } from '../src/services/ai-providers.js'

process.env.AGENT_RUNTIME = 'deterministic'
process.env.PROVIDER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

const config = { ...loadConfig(), swaggerEnabled: false }
const app = await buildApp({ config, logger: false })

const suffix = randomUUID().slice(0, 8)
const ownerEmail = `provider-test-${suffix}@nuanscape.test`
const plaintextKey = 'nvapi-test-secret-1234567890'
let ownerId = ''

function headers() {
  return { 'x-owner-id': ownerId }
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: 'Provider Owner',
      passwordHash: 'TEST_NO_LOGIN',
    },
  })
  ownerId = owner.id
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: ownerId } })
  await app.close()
})

describe('Encryption layer', () => {
  it('round-trip AES-256-GCM dengan AAD', () => {
    const secret = encryptSecret(plaintextKey, 'aad-test')
    expect(secret.ciphertext).not.toContain(plaintextKey)
    expect(secret.iv).toBeTruthy()
    expect(secret.tag).toBeTruthy()
    expect(decryptSecret(secret, 'aad-test')).toBe(plaintextKey)
  })

  it('menolak ciphertext dengan AAD berbeda', () => {
    const secret = encryptSecret(plaintextKey, 'aad-benar')
    expect(() => decryptSecret(secret, 'aad-salah')).toThrow(/tidak dapat didekripsi/i)
  })

  it('mask key tidak membocorkan isi penuh', () => {
    const masked = maskSecret(plaintextKey)
    expect(masked).not.toBe(plaintextKey)
    expect(masked).toContain('••')
    expect(masked.endsWith('7890')).toBe(true)
  })
})

describe('Provider API', () => {
  it('POST /providers menyimpan ciphertext, GET hanya mengembalikan key tersamar', async () => {
    const save = await app.inject({
      method: 'POST',
      url: '/api/v1/providers',
      headers: headers(),
      payload: {
        provider: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
        apiKey: plaintextKey,
      },
    })
    expect(save.statusCode).toBe(200)
    const saved = save.json().provider
    expect(saved.provider).toBe('nvidia')
    expect(saved.hasKey).toBe(true)
    expect(saved.keySource).toBe('database')
    expect(saved.encryption).toBe('AES-256-GCM')
    expect(saved.maskedKey).toContain('••')
    expect(JSON.stringify(saved)).not.toContain(plaintextKey)

    const row = await prisma.aiProviderConfig.findUnique({
      where: { ownerId_provider: { ownerId, provider: 'nvidia' } },
    })
    expect(row).toBeTruthy()
    expect(row?.encryptedKey).not.toContain(plaintextKey)
    expect(row?.fingerprint).toBe(createHash('sha256').update(plaintextKey).digest('hex'))
    expect(
      decryptSecret(
        {
          ciphertext: row!.encryptedKey,
          iv: row!.keyIv,
          tag: row!.keyTag,
          version: row!.keyVersion,
        },
        `ai-provider:${ownerId}:nvidia:${row!.keyVersion}`,
      ),
    ).toBe(plaintextKey)

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/providers',
      headers: headers(),
    })
    expect(list.statusCode).toBe(200)
    const providers = list.json().providers
    expect(providers).toHaveLength(2)
    const nvidia = providers.find((item: { provider: string }) => item.provider === 'nvidia')
    expect(nvidia.hasKey).toBe(true)
    expect(nvidia.maskedKey).not.toBe(plaintextKey)
    expect(JSON.stringify(providers)).not.toContain(plaintextKey)
    expect(nvidia.models.some((model: { id: string }) => model.id === 'meta/llama-3.1-8b-instruct')).toBe(true)
    expect(
      nvidia.models.find((model: { active: boolean }) => model.active)?.id,
    ).toBe('nvidia/nemotron-3.5-lightning-30b-a3b')
    const kie = providers.find((item: { provider: string }) => item.provider === 'kie.ai')
    expect(kie.models.map((model: { id: string }) => model.id)).toEqual(
      expect.arrayContaining(['gemini-3.1-pro', 'gpt-5-2', 'kimi-k3-1-pro']),
    )
    expect(kie.models.find((model: { active: boolean }) => model.active)?.id).toBe('gpt-5-2')
  })

  it('POST /providers tanpa key mempertahankan key dan hanya mengubah model', async () => {
    const before = await prisma.aiProviderConfig.findUnique({
      where: { ownerId_provider: { ownerId, provider: 'nvidia' } },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/providers',
      headers: headers(),
      payload: {
        provider: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        model: 'meta/llama-3.1-8b-instruct',
      },
    })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().provider.model).toBe('meta/llama-3.1-8b-instruct')
    expect(
      res.json().provider.models.find((model: { active: boolean }) => model.active)?.id,
    ).toBe('meta/llama-3.1-8b-instruct')

    const after = await prisma.aiProviderConfig.findUnique({
      where: { ownerId_provider: { ownerId, provider: 'nvidia' } },
    })
    expect(after?.fingerprint).toBe(before?.fingerprint)
    expect(after?.encryptedKey).toBe(before?.encryptedKey)
  })

  it('resolveProviderChain mendekripsi key dari database', async () => {
    const chain = await resolveProviderChain(ownerId)
    const nvidia = chain.find((item) => item.provider === 'nvidia')
    expect(nvidia?.source).toBe('database')
    expect(nvidia?.apiKey).toBe(plaintextKey)
  })

  it('POST /providers/:provider/test memakai key tersimpan dan mencatat hasilnya', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/providers/nvidia/test',
      headers: headers(),
      payload: {},
    })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().status).toBe('connected')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect((call[1].headers as Record<string, string>).authorization).toBe(`Bearer ${plaintextKey}`)

    const row = await prisma.aiProviderConfig.findUnique({
      where: { ownerId_provider: { ownerId, provider: 'nvidia' } },
    })
    expect(row?.lastTestStatus).toBe('connected')
    expect(row?.lastTestedAt).toBeTruthy()
  })

  it('DELETE /providers/:provider menghapus konfigurasi dan key', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/providers/nvidia',
      headers: headers(),
    })
    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().deleted).toBe(true)

    const row = await prisma.aiProviderConfig.findUnique({
      where: { ownerId_provider: { ownerId, provider: 'nvidia' } },
    })
    expect(row).toBeNull()
  })
})
