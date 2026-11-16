import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { resolveOwnerId } from '../lib/owner.js'
import {
  batchApproveAutomations,
  createAutomation,
  createNotification,
  generateBriefingReport,
  getAutomation,
  getHeadAgentConfig,
  getOfficeOverview,
  getReport,
  getTeamOverview,
  listAutomations,
  listNotifications,
  listReports,
  markAllNotificationsRead,
  markNotificationRead,
  runAutomation,
  testProviderConnection,
  toggleAutomation,
  updateAutomation,
  updateHeadAgentConfig,
} from '../services/monitor.js'

const automationModuleSchema = z.enum(['Finance', 'Content', 'Shop'])
const automationStatusSchema = z.enum(['active', 'paused', 'needs_approval'])
const notificationTypeSchema = z.enum(['finance', 'content', 'shop', 'system', 'ai'])
const idParams = z.object({ id: z.string().min(1) })

const listAutomationsQuery = z.object({
  module: automationModuleSchema.optional(),
  status: automationStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
})

const createAutomationBody = z.object({
  name: z.string().trim().min(3).max(100),
  module: automationModuleSchema,
  description: z.string().trim().min(5).max(500),
  trigger: z.string().trim().min(3).max(100),
  steps: z.array(z.string().trim().min(1)).min(1),
  status: automationStatusSchema.optional(),
})

const updateAutomationBody = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(5).max(500).optional(),
  trigger: z.string().trim().min(3).max(100).optional(),
  steps: z.array(z.string().trim().min(1)).min(1).optional(),
  status: automationStatusSchema.optional(),
})

const batchApproveBody = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
  })
  .optional()

const listNotificationsQuery = z.object({
  type: notificationTypeSchema.optional(),
  read: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

const createNotificationBody = z.object({
  title: z.string().trim().min(3).max(100),
  message: z.string().trim().min(5).max(500),
  type: notificationTypeSchema,
  href: z.string().trim().optional(),
})

const listReportsQuery = z.object({
  period: z.enum(['daily', 'weekly']).optional(),
})

const generateReportBody = z
  .object({
    period: z.enum(['daily', 'weekly']).optional(),
  })
  .optional()

const updateSettingsBody = z.object({
  primaryProvider: z.string().trim().min(1).optional(),
  fallbackProvider: z.string().trim().min(1).optional(),
  primaryModel: z.string().trim().min(1).optional(),
  fallbackModel: z.string().trim().min(1).optional(),
  autoApproval: z.boolean().optional(),
  dailyBriefingHour: z.number().int().min(0).max(23).optional(),
  weeklyBriefingDay: z.string().trim().min(3).optional(),
})

const testConnectionBody = z.object({
  provider: z.string().trim().min(1),
  baseUrl: z.string().trim().url().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
})

export const monitorRoutes: FastifyPluginAsyncZod = async (app) => {
  // Office Command Center
  app.get(
    '/monitor/office',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Command center 3 pilar bisnis (Seller, Content, Finance) dan health pulse',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getOfficeOverview(ownerId)
    },
  )

  // Team Overview
  app.get(
    '/monitor/team',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Status live 4 agen Nuanscape (Muhe, Asep, Ucup, Bambang)',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getTeamOverview(ownerId)
    },
  )

  // Automations CRUD & Actions
  app.get(
    '/automations',
    {
      schema: {
        tags: ['automations'],
        summary: 'Daftar alur otomatisasi agent',
        querystring: listAutomationsQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAutomations(ownerId, request.query)
    },
  )

  app.get(
    '/monitor/automations',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Daftar alur otomatisasi agent (alias)',
        querystring: listAutomationsQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listAutomations(ownerId, request.query)
    },
  )

  app.get(
    '/automations/:id',
    {
      schema: {
        tags: ['automations'],
        summary: 'Detail alur otomatisasi dan riwayat eksekusi',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getAutomation(ownerId, request.params.id)
    },
  )

  app.post(
    '/automations',
    {
      schema: {
        tags: ['automations'],
        summary: 'Buat alur otomatisasi baru',
        body: createAutomationBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createAutomation(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.patch(
    '/automations/:id',
    {
      schema: {
        tags: ['automations'],
        summary: 'Perbarui konfigurasi alur otomatisasi',
        params: idParams,
        body: updateAutomationBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateAutomation(ownerId, request.params.id, request.body)
    },
  )

  app.post(
    '/automations/:id/toggle',
    {
      schema: {
        tags: ['automations'],
        summary: 'Toggle status alur otomatisasi (active <-> paused)',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return toggleAutomation(ownerId, request.params.id)
    },
  )

  app.post(
    '/automations/:id/run',
    {
      schema: {
        tags: ['automations'],
        summary: 'Jalankan alur otomatisasi saat ini juga',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return runAutomation(ownerId, request.params.id)
    },
  )

  app.post(
    '/automations/batch-approve',
    {
      schema: {
        tags: ['automations'],
        summary: 'Beri approval massal untuk alur yang butuh persetujuan',
        body: batchApproveBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return batchApproveAutomations(ownerId, request.body?.ids)
    },
  )

  // Notifications
  app.get(
    '/notifications',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Daftar notifikasi aktivitas dan sinyal sistem',
        querystring: listNotificationsQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listNotifications(ownerId, request.query)
    },
  )

  app.get(
    '/monitor/notifications',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Daftar notifikasi aktivitas dan sinyal sistem (alias)',
        querystring: listNotificationsQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listNotifications(ownerId, request.query)
    },
  )

  app.post(
    '/notifications',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Buat notifikasi baru',
        body: createNotificationBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await createNotification(ownerId, request.body)
      return reply.status(201).send(result)
    },
  )

  app.post(
    '/notifications/:id/read',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Tandai notifikasi telah dibaca',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return markNotificationRead(ownerId, request.params.id)
    },
  )

  app.post(
    '/notifications/read-all',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Tandai semua notifikasi telah dibaca',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return markAllNotificationsRead(ownerId)
    },
  )

  // Briefing Reports
  app.get(
    '/monitor/reports',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Daftar briefing report Muhe',
        querystring: listReportsQuery,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return listReports(ownerId, request.query.period)
    },
  )

  app.get(
    '/monitor/reports/:id',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Detail briefing report',
        params: idParams,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getReport(ownerId, request.params.id)
    },
  )

  app.post(
    '/monitor/reports/generate',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Generate briefing report baru oleh Head Agent Muhe',
        body: generateReportBody,
      },
    },
    async (request, reply) => {
      const ownerId = await resolveOwnerId(request)
      const result = await generateBriefingReport(ownerId, request.body?.period ?? 'daily')
      return reply.status(201).send(result)
    },
  )

  // Head Agent Settings
  app.get(
    '/monitor/settings',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Pengaturan Head Agent (provider, model, jadwal briefing)',
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return getHeadAgentConfig(ownerId)
    },
  )

  app.put(
    '/monitor/settings',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Perbarui pengaturan Head Agent',
        body: updateSettingsBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return updateHeadAgentConfig(ownerId, request.body)
    },
  )

  app.post(
    '/monitor/settings/test-connection',
    {
      schema: {
        tags: ['monitor'],
        summary: 'Uji koneksi provider AI (KIE.ai, NVIDIA NIM, dll.)',
        body: testConnectionBody,
      },
    },
    async (request) => {
      const ownerId = await resolveOwnerId(request)
      return testProviderConnection(ownerId, request.body)
    },
  )
}
