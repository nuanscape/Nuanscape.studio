import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { resolveOwnerId } from '../lib/owner.js'
import {
  AI_PROVIDERS,
  deleteProviderConfig,
  listProviderConfigs,
  testProviderConfig,
  upsertProviderConfig,
  type AiProviderId,
} from '../services/ai-providers.js'

const providerSchema = z.enum(AI_PROVIDERS)

const providerParams = z.object({ provider: providerSchema })

const upsertProviderBody = z.object({
  provider: providerSchema,
  baseUrl: z.string().trim().url().optional(),
  model: z.string().trim().min(1).max(160).optional(),
  apiKey: z.string().trim().min(8).max(512).optional(),
})

const testProviderBody = z
  .object({
    baseUrl: z.string().trim().url().optional(),
    model: z.string().trim().min(1).max(160).optional(),
    apiKey: z.string().trim().min(8).max(512).optional(),
  })
  .optional()

export const providerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/providers',
    {
      schema: {
        tags: ['providers'],
        summary: 'Daftar konfigurasi provider LLM (key selalu tersamar)',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return { providers: await listProviderConfigs(ownerId) }
    },
  )

  app.post(
    '/providers',
    {
      schema: {
        tags: ['providers'],
        summary: 'Simpan/rotasi API key provider LLM (dienkripsi AES-256-GCM)',
        body: upsertProviderBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      const body = request.body
      const provider = await upsertProviderConfig(ownerId, {
        provider: body.provider,
        ...(body.baseUrl ? { baseUrl: body.baseUrl } : {}),
        ...(body.model ? { model: body.model } : {}),
        ...(body.apiKey ? { apiKey: body.apiKey } : {}),
      })
      return { provider }
    },
  )

  app.post(
    '/providers/:provider/test',
    {
      schema: {
        tags: ['providers'],
        summary: 'Uji koneksi provider memakai key terenkripsi yang tersimpan',
        params: providerParams,
        body: testProviderBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      const provider = request.params.provider as AiProviderId
      return testProviderConfig(ownerId, provider, request.body ?? {})
    },
  )

  app.delete(
    '/providers/:provider',
    {
      schema: {
        tags: ['providers'],
        summary: 'Hapus konfigurasi dan API key provider',
        params: providerParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      const provider = request.params.provider as AiProviderId
      await deleteProviderConfig(ownerId, provider)
      return { deleted: true, provider }
    },
  )
}
