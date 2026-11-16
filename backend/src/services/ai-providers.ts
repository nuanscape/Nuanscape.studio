import type { AiProviderConfig } from '@prisma/client'
import { badRequest, notFound } from '../lib/errors.js'
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  secretFingerprint,
} from '../lib/encryption.js'
import { prisma } from '../lib/prisma.js'
import { testProviderConnection } from './monitor.js'

export const AI_PROVIDERS = ['kie.ai', 'nvidia'] as const
export type AiProviderId = (typeof AI_PROVIDERS)[number]

interface ProviderModelDefinition {
  id: string
  label: string
  recommended?: boolean
}

interface ProviderDefinition {
  label: string
  defaultModel: string
  envKey: string
  envBaseUrl: string
  envContentModel: string
  models: ProviderModelDefinition[]
}

const PROVIDERS: Record<AiProviderId, ProviderDefinition> = {
  'kie.ai': {
    label: 'KIE.ai',
    defaultModel: 'gpt-5-2',
    envKey: 'KIE_API_KEY',
    envBaseUrl: 'KIE_BASE_URL',
    envContentModel: 'KIE_CONTENT_MODEL',
    models: [
      { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', recommended: true },
      { id: 'gpt-5-2', label: 'GPT-5.2' },
      { id: 'kimi-k3-1-pro', label: 'Kimi K3.1 Pro' },
    ],
  },
  nvidia: {
    label: 'NVIDIA NIM',
    defaultModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    envKey: 'NVIDIA_API_KEY',
    envBaseUrl: 'NVIDIA_BASE_URL',
    envContentModel: 'NVIDIA_CONTENT_MODEL',
    models: [
      {
        id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
        label: 'Nemotron 3.5 Lightning 30B A3B',
        recommended: true,
      },
      { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct' },
    ],
  },
}

const DEFAULT_BASE_URL: Record<AiProviderId, string> = {
  'kie.ai': 'https://api.kie.ai',
  nvidia: 'https://integrate.api.nvidia.com/v1',
}

export interface ProviderModelView {
  id: string
  label: string
  active: boolean
  default: boolean
  recommended: boolean
}

export interface ProviderConfigView {
  provider: AiProviderId
  label: string
  baseUrl: string
  model: string
  models: ProviderModelView[]
  hasKey: boolean
  keySource: 'database' | 'environment' | 'none'
  maskedKey: string | null
  encryption: 'AES-256-GCM' | null
  lastTestedAt: string | null
  lastTestStatus: 'connected' | 'error' | null
  lastTestMessage: string | null
  updatedAt: string | null
}

export interface UpsertProviderInput {
  provider: AiProviderId
  baseUrl?: string
  model?: string
  apiKey?: string
}

export interface TestProviderInput {
  baseUrl?: string
  model?: string
  apiKey?: string
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function envKey(provider: AiProviderId): string | undefined {
  const value = process.env[PROVIDERS[provider].envKey]?.trim()
  return value ? value : undefined
}

function defaultBaseUrl(provider: AiProviderId, model: string): string {
  if (provider === 'kie.ai') {
    const base = trimSlash(process.env.KIE_BASE_URL?.trim() || DEFAULT_BASE_URL[provider])
    return `${base}/${model}/v1`
  }
  return trimSlash(process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_BASE_URL[provider])
}

function aad(ownerId: string, provider: AiProviderId, version: number): string {
  return `ai-provider:${ownerId}:${provider}:${version}`
}

function decryptRow(row: AiProviderConfig): string {
  return decryptSecret(
    {
      ciphertext: row.encryptedKey,
      iv: row.keyIv,
      tag: row.keyTag,
      version: row.keyVersion,
    },
    aad(row.ownerId, row.provider as AiProviderId, row.keyVersion),
  )
}

function toView(row: AiProviderConfig | undefined, provider: AiProviderId): ProviderConfigView {
  const definition = PROVIDERS[provider]
  const environmentKey = envKey(provider)
  const model = row?.model ?? definition.defaultModel
  const baseUrl = row?.baseUrl ?? defaultBaseUrl(provider, model)
  const catalog: ProviderModelDefinition[] = definition.models.some((item) => item.id === model)
    ? definition.models
    : [{ id: model, label: model }, ...definition.models]
  const models: ProviderModelView[] = catalog.map((item) => ({
    ...item,
    active: item.id === model,
    default: item.id === definition.defaultModel,
    recommended: Boolean(item.recommended),
  }))

  return {
    provider,
    label: definition.label,
    baseUrl,
    model,
    models,
    hasKey: Boolean(row || environmentKey),
    keySource: row ? 'database' : environmentKey ? 'environment' : 'none',
    maskedKey: row?.keyHint ?? (environmentKey ? maskSecret(environmentKey) : null),
    encryption: row ? 'AES-256-GCM' : null,
    lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
    lastTestStatus:
      row?.lastTestStatus === 'connected' || row?.lastTestStatus === 'error'
        ? row.lastTestStatus
        : null,
    lastTestMessage: row?.lastTestMessage ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  }
}

export async function listProviderConfigs(ownerId: string): Promise<ProviderConfigView[]> {
  const rows = await prisma.aiProviderConfig.findMany({ where: { ownerId } })
  const byProvider = new Map(rows.map((row) => [row.provider, row]))
  return AI_PROVIDERS.map((provider) => toView(byProvider.get(provider), provider))
}

export async function upsertProviderConfig(
  ownerId: string,
  input: UpsertProviderInput,
): Promise<ProviderConfigView> {
  const existing = await prisma.aiProviderConfig.findUnique({
    where: { ownerId_provider: { ownerId, provider: input.provider } },
  })

  const plaintext = input.apiKey?.trim()
  const fallbackKey = !existing ? envKey(input.provider) : undefined
  const keyToStore = plaintext || fallbackKey
  if (!existing && !keyToStore) {
    throw badRequest(
      'API_KEY_REQUIRED',
      `API key ${PROVIDERS[input.provider].label} wajib diisi untuk konfigurasi baru.`,
    )
  }

  const model = input.model?.trim() || existing?.model || PROVIDERS[input.provider].defaultModel
  const baseUrl =
    input.baseUrl?.trim() || existing?.baseUrl || defaultBaseUrl(input.provider, model)

  const encrypted = keyToStore
    ? encryptSecret(keyToStore, aad(ownerId, input.provider, 1))
    : undefined

  const row = await prisma.aiProviderConfig.upsert({
    where: { ownerId_provider: { ownerId, provider: input.provider } },
    update: {
      baseUrl,
      model,
      ...(encrypted
        ? {
            encryptedKey: encrypted.ciphertext,
            keyIv: encrypted.iv,
            keyTag: encrypted.tag,
            keyVersion: encrypted.version,
            keyHint: maskSecret(keyToStore as string),
            fingerprint: secretFingerprint(keyToStore as string),
          }
        : {}),
      ...(keyToStore
        ? { lastTestedAt: null, lastTestStatus: null, lastTestMessage: null }
        : {}),
    },
    create: {
      ownerId,
      provider: input.provider,
      baseUrl,
      model,
      encryptedKey: encrypted?.ciphertext ?? existing?.encryptedKey ?? '',
      keyIv: encrypted?.iv ?? existing?.keyIv ?? '',
      keyTag: encrypted?.tag ?? existing?.keyTag ?? '',
      keyVersion: encrypted?.version ?? existing?.keyVersion ?? 1,
      keyHint: keyToStore ? maskSecret(keyToStore) : (existing?.keyHint ?? ''),
      fingerprint: keyToStore ? secretFingerprint(keyToStore) : (existing?.fingerprint ?? ''),
    },
  })

  return toView(row, input.provider)
}

export async function deleteProviderConfig(ownerId: string, provider: AiProviderId): Promise<void> {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { ownerId_provider: { ownerId, provider } },
    select: { id: true },
  })
  if (!row) throw notFound(`Konfigurasi ${PROVIDERS[provider].label} belum ada.`)
  await prisma.aiProviderConfig.delete({ where: { id: row.id } })
}

export async function providerSecret(
  ownerId: string,
  provider: AiProviderId,
): Promise<{ apiKey: string; baseUrl: string; model: string; source: 'database' | 'environment' } | null> {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { ownerId_provider: { ownerId, provider } },
  })
  if (row) {
    return {
      apiKey: decryptRow(row),
      baseUrl: row.baseUrl,
      model: row.model,
      source: 'database',
    }
  }

  const environmentKey = envKey(provider)
  if (!environmentKey) return null
  const model =
    process.env[PROVIDERS[provider].envContentModel]?.trim() || PROVIDERS[provider].defaultModel
  return {
    apiKey: environmentKey,
    baseUrl: defaultBaseUrl(provider, model),
    model,
    source: 'environment',
  }
}

export async function resolveKieApiKey(ownerId?: string): Promise<string | undefined> {
  if (ownerId) {
    const stored = await providerSecret(ownerId, 'kie.ai')
    if (stored?.apiKey) return stored.apiKey
  }
  return process.env.KIE_API_KEY?.trim() || undefined
}

export async function resolveProviderChain(ownerId?: string): Promise<
  Array<{
    provider: AiProviderId
    apiKey: string
    baseUrl: string
    model: string
    source: 'database' | 'environment'
  }>
> {
  const chain: Array<{
    provider: AiProviderId
    apiKey: string
    baseUrl: string
    model: string
    source: 'database' | 'environment'
  }> = []

  for (const provider of AI_PROVIDERS) {
    if (!ownerId) {
      const environmentKey = envKey(provider)
      if (environmentKey) {
        const model =
          process.env[PROVIDERS[provider].envContentModel]?.trim() ||
          PROVIDERS[provider].defaultModel
        chain.push({
          provider,
          apiKey: environmentKey,
          baseUrl: defaultBaseUrl(provider, model),
          model,
          source: 'environment',
        })
      }
      continue
    }

    const resolved = await providerSecret(ownerId, provider)
    if (resolved) chain.push({ provider, ...resolved })
  }

  return chain
}

export async function testProviderConfig(
  ownerId: string,
  provider: AiProviderId,
  input: TestProviderInput = {},
) {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { ownerId_provider: { ownerId, provider } },
  })
  const stored = await providerSecret(ownerId, provider)
  const apiKey = input.apiKey?.trim() || stored?.apiKey
  if (!apiKey) {
    throw badRequest(
      'API_KEY_REQUIRED',
      `API key ${PROVIDERS[provider].label} belum tersimpan. Simpan key terlebih dahulu.`,
    )
  }

  const model = input.model?.trim() || row?.model || stored?.model || PROVIDERS[provider].defaultModel
  const baseUrl =
    input.baseUrl?.trim() || row?.baseUrl || stored?.baseUrl || defaultBaseUrl(provider, model)

  try {
    const result = await testProviderConnection(ownerId, {
      provider,
      baseUrl,
      apiKey,
      model,
    })
    if (row) {
      await prisma.aiProviderConfig.update({
        where: { id: row.id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'connected',
          lastTestMessage: result.message.slice(0, 500),
        },
      })
    }
    return { ...result, keySource: stored?.source ?? 'request' }
  } catch (error) {
    if (row) {
      await prisma.aiProviderConfig.update({
        where: { id: row.id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'error',
          lastTestMessage: (error instanceof Error ? error.message : 'Tes koneksi gagal').slice(
            0,
            500,
          ),
        },
      })
    }
    throw error
  }
}
