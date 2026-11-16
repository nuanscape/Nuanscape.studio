import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { badRequest } from '../lib/errors.js'
import { resolveOwnerId } from '../lib/owner.js'
import {
  generateScriptFromIdea,
  researchContentIdeas,
} from '../services/content-ai.js'
import { loginWithGoogleCode } from '../services/google-auth.js'
import { DESIGN_THEME_IDS } from '../services/design-themes.js'
import { generateContentProduction } from '../services/media-generator.js'
import {
  ASSET_TYPES,
  CONTENT_STATUSES,
  PLATFORMS,
  createAsset,
  createIdea,
  createItem,
  deleteItem,
  generateDraft,
  getAccountDetail,
  getAnalytics,
  getCalendar,
  getContentAgentReport,
  getEnergy,
  getItem,
  getOverview,
  listAccounts,
  listAssets,
  listIdeas,
  listItems,
  promoteIdea,
  rechargeEnergy,
  rejectIdea,
  updateIdea,
  updateItem,
} from '../services/content.js'
import {
  buildGoogleAuthUrl,
  connectYouTubeWithCode,
  createYouTubeAccount,
  getFrontendUrl,
  syncAllYouTubeAccounts,
  syncYouTubeAccount,
  youtubeResearchAuthForOwner,
} from '../services/youtube.js'
import { emptyYouTubeResearch, researchYouTube, type YouTubeResearchResult } from '../services/youtube-research.js'
import { publishContentToYouTube, YOUTUBE_PRIVACY_VALUES } from '../services/youtube-publish.js'

const formatSchema = z.enum(['long', 'short'])
const platformSchema = z.enum(PLATFORMS)
const contentAiTypeSchema = z.enum(['music', 'storytelling', 'konspirasi'])
const statusSchema = z.enum(CONTENT_STATUSES)
const assetTypeSchema = z.enum(ASSET_TYPES)
const idParams = z.object({ id: z.string().min(1) })

const booleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'))

const itemQuery = z.object({
  format: formatSchema.optional(),
  accountId: z.string().min(1).optional(),
  status: statusSchema.optional(),
  platform: platformSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().min(1).optional(),
  hasScript: booleanQuery,
})

const ideaQuery = z.object({
  format: formatSchema.optional(),
  accountId: z.string().min(1).optional(),
  platform: platformSchema.optional(),
  approved: booleanQuery,
  q: z.string().trim().min(1).optional(),
})

const assetQuery = z.object({
  format: formatSchema.optional(),
  accountId: z.string().min(1).optional(),
  type: assetTypeSchema.optional(),
  contentId: z.string().min(1).optional(),
  q: z.string().trim().min(1).optional(),
})

const accountQuery = z.object({ format: formatSchema.optional() })

const youtubeResearchQuery = z.object({
  q: z.string().trim().min(2).max(120),
  days: z.coerce.number().int().min(1).max(365).optional(),
  maxResults: z.coerce.number().int().min(1).max(50).optional(),
  refresh: booleanQuery,
})

const createItemBody = z.object({
  title: z.string().trim().min(4),
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  niche: z.string().trim().min(1),
  format: z.string().trim().min(1),
  status: statusSchema.optional(),
  scheduledAt: z.coerce.date(),
  caption: z.string().trim().max(2000).optional(),
  hashtags: z.array(z.string().trim().min(1)).max(30).optional(),
  script: z.string().max(50_000).optional(),
  thumbnail: z.string().max(500).optional(),
  previewUrl: z.string().trim().max(1000).optional(),
  videoUrl: z.string().trim().max(1000).optional(),
  thumbnailStyle: z.string().trim().max(100).optional(),
  animationStyle: z.string().trim().max(100).optional(),
  musicStyle: z.string().trim().max(100).optional(),
  generated: z.boolean().optional(),
  sourceIdeaId: z.string().min(1).optional(),
})

const updateItemBody = z.object({
  title: z.string().trim().min(4).optional(),
  platform: platformSchema.optional(),
  accountId: z.string().min(1).nullable().optional(),
  niche: z.string().trim().min(1).optional(),
  format: z.string().trim().min(1).optional(),
  status: statusSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  caption: z.string().trim().max(2000).nullable().optional(),
  hashtags: z.array(z.string().trim().min(1)).max(30).optional(),
  script: z.string().max(50_000).nullable().optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  previewUrl: z.string().trim().max(1000).nullable().optional(),
  videoUrl: z.string().trim().max(1000).nullable().optional(),
  thumbnailStyle: z.string().trim().max(100).nullable().optional(),
  animationStyle: z.string().trim().max(100).nullable().optional(),
  musicStyle: z.string().trim().max(100).nullable().optional(),
  generated: z.boolean().optional(),
  sourceIdeaId: z.string().min(1).nullable().optional(),
})

const publishYouTubeBody = z.object({
  privacyStatus: z.enum(YOUTUBE_PRIVACY_VALUES).default('private'),
  confirm: z.boolean().optional(),
})

const createIdeaBody = z.object({
  title: z.string().trim().min(4),
  hook: z.string().trim().min(6),
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  niche: z.string().trim().min(2),
  angle: z.string().trim().min(3),
  format: z.string().trim().min(2),
  score: z.coerce.number().int().min(0).max(100),
  status: z.enum(['draft', 'in_progress', 'completed', 'rejected']).optional(),
})

const updateIdeaBody = z.object({
  approved: z.boolean().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'rejected']).optional(),
})

const researchIdeasBody = z.object({
  contentType: contentAiTypeSchema,
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  niche: z.string().trim().min(2).max(100),
  format: formatSchema.optional(),
  researchQuery: z.string().trim().min(2).max(120).optional(),
})

const scriptFromIdeaBody = z.object({
  contentType: contentAiTypeSchema,
  platform: platformSchema,
  animationStyles: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
})

const promoteIdeaBody = z
  .object({
    platform: platformSchema.optional(),
    accountId: z.string().min(1).optional(),
  })
  .optional()

const generateDraftBody = z.object({
  ideaId: z.string().min(1).optional(),
  title: z.string().trim().min(4).optional(),
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  niche: z.string().trim().min(1).optional(),
  format: formatSchema.optional(),
  thumbnailStyle: z.string().trim().min(1).max(100).optional(),
  animationStyle: z.string().trim().min(1).max(100).optional(),
  musicStyle: z.string().trim().min(1).max(100).optional(),
  scheduledAt: z.coerce.date().optional(),
})

const generateProductionBody = z.object({
  contentType: z.enum(['music', 'storytelling', 'konspirasi']),
  title: z.string().trim().min(3),
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  niche: z.string().trim().optional(),
  format: formatSchema.optional(),
  brief: z.string().trim().optional(),
  script: z.string().trim().optional(),
  audioLength: z.string().trim().optional(),
  audioEnergy: z.string().trim().optional(),
  musicTrackCount: z.number().int().min(1).max(5).optional(),
  disclaimer: z.string().trim().optional(),
  thumbnailStyle: z.string().trim().min(1),
  animationStyle: z.string().trim().min(1),
  musicStyle: z.string().trim().min(1),
  designTheme: z.enum(DESIGN_THEME_IDS).optional(),
  scenes: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1),
        narration: z.string().trim(),
        visual: z.string().trim(),
        animation: z.string().trim(),
        duration: z.number().int().min(1),
        claimType: z.enum(['Fakta', 'Dugaan', 'Spekulasi']).optional(),
        source: z.string().trim().optional(),
      }),
    )
    .optional(),
  ideaId: z.string().min(1).optional(),
})

const createAssetBody = z.object({
  name: z.string().trim().min(2),
  type: assetTypeSchema,
  platform: platformSchema,
  accountId: z.string().min(1).optional(),
  size: z.string().trim().min(1),
  createdAt: z.coerce.date().optional(),
  contentId: z.string().min(1).optional(),
})

const oauthUrlQuery = z.object({
  format: formatSchema.optional(),
  niche: z.string().trim().max(60).optional(),
})

const oauthCallbackQuery = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

const connectAccountBody = z.object({
  handle: z.string().trim().min(2).max(300),
  format: formatSchema.optional(),
  niche: z.string().trim().max(60).optional(),
})

const analyticsQuery = z.object({
  format: formatSchema,
  accountId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
})

const calendarQuery = z.object({
  format: formatSchema,
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  accountId: z.string().min(1).optional(),
})

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/content/accounts',
    { schema: { tags: ['content'], summary: 'Daftar akun konten', querystring: accountQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAccounts(ownerId, request.query.format)
    },
  )

  app.get(
    '/content/youtube/research',
    {
      schema: {
        tags: ['content'],
        summary: 'Riset tren dan kompetitor YouTube via Data API v3',
        querystring: youtubeResearchQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      const auth = await youtubeResearchAuthForOwner(ownerId)
      return researchYouTube({
        query: request.query.q,
        ...auth,
        days: request.query.days,
        maxResults: request.query.maxResults,
        refresh: request.query.refresh,
      })
    },
  )

  app.post(
    '/content/accounts',
    {
      schema: {
        tags: ['content'],
        summary: 'Hubungkan channel YouTube via Data API v3',
        body: connectAccountBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const created = await createYouTubeAccount(ownerId, request.body)
      return reply.status(201).send(created)
    },
  )

  app.get(
    '/content/youtube/oauth/url',
    {
      schema: {
        tags: ['content'],
        summary: 'URL consent Google untuk menghubungkan channel YouTube',
        querystring: oauthUrlQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      const state = app.jwt.sign(
        { sub: ownerId, fmt: request.query.format ?? 'long', niche: request.query.niche },
        { expiresIn: 900 },
      )
      return { url: buildGoogleAuthUrl(state) }
    },
  )

  app.get(
    '/content/youtube/oauth/callback',
    {
      schema: {
        tags: ['content'],
        summary: 'Callback OAuth Google untuk YouTube',
        querystring: oauthCallbackQuery,
      },
    },
    async (request, reply) => {
      const frontend = getFrontendUrl()
      const contentTarget = (params: Record<string, string>) =>
        `${frontend}/app/content/account?${new URLSearchParams(params).toString()}`
      const loginTarget = (params: Record<string, string>) =>
        `${frontend}/login?${new URLSearchParams(params).toString()}`

      let payload:
        | {
            sub?: string
            fmt?: 'long' | 'short'
            niche?: string
            typ?: string
            next?: string
          }
        | undefined
      if (request.query.state) {
        try {
          payload = app.jwt.verify(request.query.state)
        } catch {
          payload = undefined
        }
      }

      const isLogin = payload?.typ === 'google_login'
      const next =
        typeof payload?.next === 'string' &&
        payload.next.startsWith('/') &&
        !payload.next.startsWith('//')
          ? payload.next
          : '/app'

      if (request.query.error) {
        const reason = request.query.error_description ?? request.query.error
        return reply.redirect(
          isLogin
            ? loginTarget({ google: 'error', reason, next })
            : contentTarget({ youtube: 'error', reason }),
        )
      }

      if (!request.query.code || !request.query.state) {
        return reply.redirect(
          isLogin
            ? loginTarget({ google: 'error', reason: 'Parameter OAuth tidak lengkap.', next })
            : contentTarget({ youtube: 'error', reason: 'Parameter OAuth tidak lengkap.' }),
        )
      }

      if (!payload) {
        return reply.redirect(
          contentTarget({ youtube: 'error', reason: 'State OAuth tidak valid atau kedaluwarsa.' }),
        )
      }

      try {
        if (isLogin) {
          const user = await loginWithGoogleCode(request.query.code)
          const ticket = app.jwt.sign(
            { sub: user.id, type: 'google_ticket' },
            { expiresIn: 120 },
          )
          return reply.redirect(
            loginTarget({ google: 'success', ticket, next }),
          )
        }

        if (!payload.sub) {
          throw new Error('State OAuth tidak memuat pemilik akun.')
        }
        const result = await connectYouTubeWithCode(payload.sub, request.query.code, {
          format: payload.fmt,
          niche: payload.niche,
        })
        return reply.redirect(
          contentTarget({ youtube: 'connected', channel: result.channel.title }),
        )
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'OAuth gagal.'
        return reply.redirect(
          isLogin
            ? loginTarget({ google: 'error', reason, next })
            : contentTarget({ youtube: 'error', reason }),
        )
      }
    },
  )

  app.get(
    '/content/accounts/:id',
    { schema: { tags: ['content'], summary: 'Detail akun konten', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getAccountDetail(ownerId, request.params.id)
    },
  )

  app.post(
    '/content/accounts/sync',
    { schema: { tags: ['content'], summary: 'Sinkronkan semua akun YouTube' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return syncAllYouTubeAccounts(ownerId)
    },
  )

  app.post(
    '/content/accounts/:id/sync',
    {
      schema: {
        tags: ['content'],
        summary: 'Sinkronkan akun YouTube via Data API v3',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return syncYouTubeAccount(ownerId, request.params.id)
    },
  )

  app.get(
    '/content/items',
    { schema: { tags: ['content'], summary: 'Daftar konten', querystring: itemQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listItems(ownerId, request.query)
    },
  )

  app.post(
    '/content/items',
    { schema: { tags: ['content'], summary: 'Buat konten', body: createItemBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createItem(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.get(
    '/content/items/:id',
    { schema: { tags: ['content'], summary: 'Detail konten', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getItem(ownerId, request.params.id)
    },
  )

  app.patch(
    '/content/items/:id',
    {
      schema: {
        tags: ['content'],
        summary: 'Ubah konten (status, script, jadwal, dll.)',
        params: idParams,
        body: updateItemBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateItem(ownerId, request.params.id, request.body)
    },
  )

  app.delete(
    '/content/items/:id',
    { schema: { tags: ['content'], summary: 'Hapus konten', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return deleteItem(ownerId, request.params.id)
    },
  )

  app.post(
    '/content/items/:id/youtube-upload',
    {
      schema: {
        tags: ['content'],
        summary: 'Upload konten ke YouTube setelah persetujuan',
        params: idParams,
        body: publishYouTubeBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      if (request.body.confirm !== true) {
        throw badRequest(
          'YOUTUBE_APPROVAL_REQUIRED',
          'Upload YouTube memerlukan persetujuan eksplisit.',
        )
      }
      return publishContentToYouTube(ownerId, request.params.id, {
        privacyStatus: request.body.privacyStatus,
      })
    },
  )

  app.get(
    '/content/ideas',
    { schema: { tags: ['content'], summary: 'Daftar ide', querystring: ideaQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listIdeas(ownerId, request.query)
    },
  )

  app.post(
    '/content/ideas',
    { schema: { tags: ['content'], summary: 'Tambah ide', body: createIdeaBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createIdea(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.post(
    '/content/ideas/research',
    {
      schema: {
        tags: ['content'],
        summary: 'Riset ide konten dengan AI dan simpan ke database',
        body: researchIdeasBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const { researchQuery, ...body } = request.body
      const format = body.format ?? (body.platform === 'YouTube' ? 'long' : 'short')
      let youtubeResearch: YouTubeResearchResult | null = null

      if (body.platform === 'YouTube') {
        const query = researchQuery?.trim() || body.niche
        try {
          const auth = await youtubeResearchAuthForOwner(ownerId)
          youtubeResearch = await researchYouTube({
            query,
            ...auth,
            days: 90,
            maxResults: 10,
          })
        } catch (error) {
          youtubeResearch = emptyYouTubeResearch(
            query,
            'Riset YouTube gagal dijalankan.',
            error instanceof Error ? error.message : 'unknown error',
          )
        }
      }

      const result = await researchContentIdeas(ownerId, {
        ...body,
        format,
        ...(researchQuery ? { topic: researchQuery } : {}),
        research: youtubeResearch,
      })
      return reply.status(201).send({
        ...result,
        ...(youtubeResearch ? { youtubeResearch } : {}),
      })
    },
  )

  app.post(
    '/content/ideas/:id/script',
    {
      schema: {
        tags: ['content'],
        summary: 'Buat naskah dan scene dari ide dengan AI',
        params: idParams,
        body: scriptFromIdeaBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await generateScriptFromIdea(ownerId, request.params.id, {
        contentType: request.body.contentType,
        platform: request.body.platform,
        animationStyles: request.body.animationStyles ?? [],
      })
      return reply.status(201).send(result)
    },
  )

  app.patch(
    '/content/ideas/:id',
    {
      schema: {
        tags: ['content'],
        summary: 'Ubah ide (approve/unapprove)',
        params: idParams,
        body: updateIdeaBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateIdea(ownerId, request.params.id, request.body)
    },
  )

  app.post(
    '/content/ideas/:id/approve',
    { schema: { tags: ['content'], summary: 'Setujui ide', params: idParams } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateIdea(ownerId, request.params.id, { approved: true })
    },
  )

  app.post(
    '/content/ideas/:id/promote',
    {
      schema: {
        tags: ['content'],
        summary: 'Promosikan ide menjadi konten',
        params: idParams,
        body: promoteIdeaBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await promoteIdea(ownerId, request.params.id, request.body ?? {})
      return reply.status(201).send(result)
    },
  )

  app.get(
    '/content/library',
    { schema: { tags: ['content'], summary: 'Daftar aset library', querystring: assetQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAssets(ownerId, request.query)
    },
  )

  app.post(
    '/content/library',
    { schema: { tags: ['content'], summary: 'Tambah aset (metadata)', body: createAssetBody } },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createAsset(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.get(
    '/content/overview',
    { schema: { tags: ['content'], summary: 'Ringkasan pipeline content' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getOverview(ownerId)
    },
  )

  app.get(
    '/content/analytics',
    { schema: { tags: ['content'], summary: 'Analitik content', querystring: analyticsQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getAnalytics(ownerId, request.query.format, request.query.accountId, request.query.days)
    },
  )

  app.get(
    '/content/calendar',
    { schema: { tags: ['content'], summary: 'Kalender konten', querystring: calendarQuery } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getCalendar(
        ownerId,
        request.query.format,
        request.query.month,
        request.query.accountId,
      )
    },
  )

  app.get(
    '/content/energy',
    { schema: { tags: ['content'], summary: 'Status energy AI saat ini' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getEnergy(ownerId)
    },
  )

  app.post(
    '/content/energy/recharge',
    { schema: { tags: ['content'], summary: 'Isi ulang energy AI (reset ke 100)' } },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return rechargeEnergy(ownerId)
    },
  )

  app.post(
    '/content/generate-draft',
    {
      schema: {
        tags: ['content'],
        summary: 'Generate draft konten otomatis (-10 energy)',
        body: generateDraftBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await generateDraft(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.post(
    '/content/generate-production',
    {
      schema: {
        tags: ['content'],
        summary:
          'Generate paket produksi konten lengkap (music/audio prompt, storyboard scenes, poster SVG, draft video, -10 energy)',
        body: generateProductionBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await generateContentProduction(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.post(
    '/content/ideas/:id/reject',
    {
      schema: {
        tags: ['content'],
        summary: 'Tolak ide konten (status: rejected)',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return { idea: await rejectIdea(ownerId, request.params.id) }
    },
  )

  app.get(
    '/content/agent-report',
    {
      schema: {
        tags: ['content'],
        summary: 'Laporan agen Bambang (status konten, sisa generate, rekomendasi)',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getContentAgentReport(ownerId)
    },
  )
}
