const BASE_URL = '/api/v1'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface YouTubeResearchVideo {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  ageDays: number
  durationSeconds: number
  views: number
  likes: number
  comments: number
  engagementRate: number
  viewsPerDay: number
  viewsPerHour: number
  outlierRatio: number
  outlierBasis: 'channel' | 'sample'
  channelMedianViews: number | null
  baselineSampleSize: number
  subscriberCount: number
  smallChannel: boolean
  breakout: boolean
  tags: string[]
  url: string
  thumbnail: string
}

export interface YouTubeResearchPatterns {
  sampleSize: number
  queryCount: number
  channelBaselineCount: number
  breakoutCount: number
  medianViews: number
  medianViewsPerDay: number
  shortsShare: number
  topKeywords: Array<{ term: string; count: number }>
  topTags: Array<{ tag: string; count: number }>
  durationBuckets: Array<{ label: string; count: number; medianViews: number }>
  topChannels: Array<{
    channelId: string
    channelTitle: string
    videos: number
    totalViews: number
    breakoutCount: number
    subscriberCount: number
  }>
}

export interface YouTubeResearchResult {
  configured: boolean
  query: string | null
  queries: string[]
  reason?: string
  error?: string
  regionCode: string
  language: string
  windowDays: number
  sampledAt: string
  videos: YouTubeResearchVideo[]
  patterns: YouTubeResearchPatterns
}

export class ApiResponseError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.name = 'ApiResponseError'
    this.status = status
    this.code = error.code
    this.details = error.details
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('nuanscape-token')
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('nuanscape-token', token)
    } else {
      localStorage.removeItem('nuanscape-token')
    }
  } catch {
    // Ignore storage errors
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem('nuanscape-refresh-token')
  } catch {
    return null
  }
}

export function setStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('nuanscape-refresh-token', token)
    } else {
      localStorage.removeItem('nuanscape-refresh-token')
    }
  } catch {
    // Ignore storage errors
  }
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        setStoredToken(null)
        setStoredRefreshToken(null)
        return null
      }
      const data = (await res.json().catch(() => null)) as
        | { accessToken?: string; refreshToken?: string }
        | null
      if (!data?.accessToken || !data?.refreshToken) return null
      setStoredToken(data.accessToken)
      setStoredRefreshToken(data.refreshToken)
      return data.accessToken
    } catch {
      return null
    }
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }

  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json'
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = path.startsWith('/api') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  let response = await fetch(url, {
    ...options,
    headers,
  })

  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/google')
  if (response.status === 401 && token && !isAuthEndpoint) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      headers.Authorization = `Bearer ${nextToken}`
      response = await fetch(url, {
        ...options,
        headers,
      })
    } else if (response.status === 401) {
      window.dispatchEvent(new Event('nuanscape-auth-expired'))
    }
  }

  if (response.status === 204) {
    return {} as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const errorData: ApiError = data?.error ?? {
      code: `HTTP_${response.status}`,
      message: data?.message || response.statusText || 'Terjadi kesalahan sistem.',
    }
    throw new ApiResponseError(response.status, errorData)
  }

  return data as T
}

// ----------------------------------------------------------------------
// Typed API Endpoints
// ----------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  initials?: string
  plan?: string
  timezone?: string
  joinedAt?: string
  lastLoginAt?: string
}

export interface AuthSessionResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: number
  refreshExpiresIn?: number
}

export type AiProviderId = 'kie.ai' | 'nvidia'

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

export interface ProviderTestResult {
  ok: boolean
  status: string
  message: string
  model?: string
  latencyMs?: number
  keySource?: 'database' | 'environment' | 'request'
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      apiFetch<AuthSessionResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    register: (body: { email: string; password: string; name: string }) =>
      apiFetch<AuthSessionResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    me: () =>
      apiFetch<{ user: AuthUser; preferences?: unknown }>('/auth/me'),

    googleUrl: (params?: { next?: string }) => {
      const qs = params?.next ? `?${new URLSearchParams({ next: params.next }).toString()}` : ''
      return apiFetch<{ url: string }>(`/auth/google/url${qs}`)
    },

    googleExchange: (ticket: string) =>
      apiFetch<AuthSessionResponse>('/auth/google/exchange', {
        method: 'POST',
        body: JSON.stringify({ ticket }),
      }),
  },

  finance: {
    getSummary: () => apiFetch<{ summary: unknown }>('/finance/summary'),
    listTransactions: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ items: unknown[]; total: number }>(`/finance/transactions${qs}`)
    },
    createTransaction: (body: unknown) =>
      apiFetch<{ transaction: unknown }>('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listBudgets: () => apiFetch<{ items: unknown[]; month: string }>('/finance/budgets'),
    createBudget: (body: unknown) =>
      apiFetch<{ budget: unknown }>('/finance/budgets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listGoals: () => apiFetch<{ items: unknown[] }>('/finance/goals'),
    createGoal: (body: unknown) =>
      apiFetch<{ goal: unknown }>('/finance/goals', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getAnalytics: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ series: unknown[] }>(`/finance/analytics${qs}`)
    },
    getRunway: () => apiFetch<{ runway: unknown }>('/finance/runway'),
    getReports: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{
        period: unknown
        months: unknown[]
        series: unknown[]
        totals: unknown
        byCategory: unknown[]
        incomeByCategory: unknown[]
        summary: unknown
        runwayDays: number
        generatedAt: string
      }>(`/finance/reports${qs}`)
    },
  },

  seller: {
    getMetrics: () => apiFetch<{ metrics: unknown }>('/seller/metrics'),
    listProducts: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ items: unknown[]; total: number; summary: unknown }>(`/seller/products${qs}`)
    },
    createProduct: (body: unknown) =>
      apiFetch<{ product: unknown }>('/seller/products', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listOrders: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ items: unknown[]; total: number; summary: unknown }>(`/seller/orders${qs}`)
    },
    getInventoryStock: () => apiFetch<{ items: unknown[] }>('/seller/inventory/stock'),
    listMarketplaces: () =>
      apiFetch<{ items: unknown[]; performance: unknown[]; summary: unknown }>('/seller/marketplaces'),
    syncMarketplace: (id: string) =>
      apiFetch<unknown>(`/seller/marketplaces/${id}/sync`, { method: 'POST' }),
    syncAllMarketplaces: () =>
      apiFetch<{ items: unknown[]; performance: unknown[]; summary: unknown }>('/seller/marketplaces/sync', {
        method: 'POST',
      }),
    listVouchers: () => apiFetch<unknown[]>('/seller/vouchers'),
    listFlashSales: () => apiFetch<unknown[]>('/seller/flash-sales'),
    listAdCampaigns: () => apiFetch<unknown[]>('/seller/ad-campaigns'),
    getFinance: () =>
      apiFetch<{
        fees: unknown
        metrics: unknown
        waterfall: unknown[]
        series: unknown[]
        profitByProduct: unknown[]
      }>('/seller/finance'),
    getAgentReport: () => apiFetch<unknown>('/seller/agent-report'),
    getIntelligence: () => apiFetch<unknown>('/seller/intelligence'),
  },

  content: {
    listItems: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ items: unknown[] }>(`/content/items${qs}`)
    },
    createItem: (body: unknown) =>
      apiFetch<{ item: unknown }>('/content/items', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listIdeas: () => apiFetch<{ ideas: unknown[] }>('/content/ideas'),
    researchIdeas: (body: {
      contentType: string
      platform: string
      accountId?: string
      niche: string
      format?: 'long' | 'short'
      researchQuery?: string
    }) =>
      apiFetch<{
        ideas: {
          id: string
          title: string
          hook: string
          angle: string
          thumbnail?: string
          reference?: string
          score: number
          platform: string
          niche: string
        }[]
        provider: string
        model: string
        youtubeResearch?: YouTubeResearchResult
      }>('/content/ideas/research', { method: 'POST', body: JSON.stringify(body) }),
    scriptFromIdea: (
      id: string,
      body: { contentType: string; platform: string; animationStyles?: string[] },
    ) =>
      apiFetch<{
        ideaId: string
        script: string
        disclaimer: string
        scenes: {
          title: string
          narration: string
          visual: string
          animation: string
          duration: number
          claimType?: 'Fakta' | 'Dugaan' | 'Spekulasi'
          source?: string
        }[]
        provider: string
        model: string
      }>(`/content/ideas/${id}/script`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listAccounts: () => apiFetch<{ accounts: unknown[] }>('/content/accounts'),
    listLibrary: () => apiFetch<{ assets: unknown[] }>('/content/library'),
    oauthUrl: (params?: { format?: 'long' | 'short'; niche?: string }) => {
      const query = new URLSearchParams()
      if (params?.format) query.set('format', params.format)
      if (params?.niche) query.set('niche', params.niche)
      const suffix = query.toString()
      return apiFetch<{ url: string }>(
        `/content/youtube/oauth/url${suffix ? `?${suffix}` : ''}`,
      )
    },
    createAccount: (body: { handle: string; format?: 'long' | 'short'; niche?: string }) =>
      apiFetch<{
        account: unknown
        channel: { id: string; title: string }
        stats: { followers: number; views30d: number; posts30d: number; engagement: number }
      }>('/content/accounts', { method: 'POST', body: JSON.stringify(body) }),
    syncAccount: (id: string) =>
      apiFetch<{
        account: unknown
        channel: { id: string; title: string }
        stats: { followers: number; views30d: number; posts30d: number; engagement: number }
      }>(`/content/accounts/${id}/sync`, { method: 'POST' }),
    syncAllAccounts: () =>
      apiFetch<{ synced: number; failed: { id: string; handle: string; message: string }[]; items: unknown[] }>(
        '/content/accounts/sync',
        { method: 'POST' },
      ),
    getAnalytics: (params: { format: 'long' | 'short'; days?: number; accountId?: string }) => {
      const query: Record<string, string> = { format: params.format }
      if (params.days) query.days = String(params.days)
      if (params.accountId) query.accountId = params.accountId
      return apiFetch<{
        series: { date: string; label: string; views: number; engagement: number }[]
        summary: { items: number; published: number; views: number; engagement: number }
      }>(`/content/analytics?${new URLSearchParams(query).toString()}`)
    },
    getAgentReport: () => apiFetch<unknown>('/content/agent-report'),
    researchYouTube: (params: {
      q: string
      days?: number
      maxResults?: number
      refresh?: boolean
    }) => {
      const query = new URLSearchParams({ q: params.q })
      if (params.days) query.set('days', String(params.days))
      if (params.maxResults) query.set('maxResults', String(params.maxResults))
      if (params.refresh) query.set('refresh', 'true')
      return apiFetch<YouTubeResearchResult>(`/content/youtube/research?${query.toString()}`)
    },
    getEnergy: () => apiFetch<{ current: number; max: number }>('/content/energy'),
    rechargeEnergy: () =>
      apiFetch<{ current: number; max: number }>('/content/energy/recharge', {
        method: 'POST',
      }),
    generateDraft: (body: unknown) =>
      apiFetch<{ item: unknown; energy: unknown }>('/content/generate-draft', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    generateProduction: (body: unknown) =>
      apiFetch<{
        item: unknown
        media: {
          previewUrl: string
          videoUrl: string
          audioPrompt: string
          scenes: unknown[]
          productionPackText: string
          downloadFilename: string
          phasesCompleted: string[]
          render?: {
            duration: number
            width: number
            height: number
            narration: 'tts' | 'bed'
            musicProvider?: string
            musicTrackCount?: number
            ttsProvider?: string | null
            videoProvider?: 'kie' | 'none'
            videoModel?: string | null
            videoBytes: number
            posterBytes: number
          }
        }
        energy: { current: number; max: number; remainingGenerations?: number }
      }>('/content/generate-production', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    publishYouTube: (
      id: string,
      body: { privacyStatus: 'private' | 'unlisted' | 'public'; confirm: true },
    ) =>
      apiFetch<{
        item: unknown
        upload: {
          videoId: string
          url: string
          privacyStatus: 'private' | 'unlisted' | 'public'
          uploadedAt: string
        }
      }>(`/content/items/${id}/youtube-upload`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  providers: {
    list: () => apiFetch<{ providers: ProviderConfigView[] }>('/providers'),
    save: (body: {
      provider: AiProviderId
      baseUrl?: string
      model?: string
      apiKey?: string
    }) =>
      apiFetch<{ provider: ProviderConfigView }>('/providers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    test: (
      provider: AiProviderId,
      body: { baseUrl?: string; model?: string; apiKey?: string } = {},
    ) =>
      apiFetch<ProviderTestResult>(`/providers/${encodeURIComponent(provider)}/test`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (provider: AiProviderId) =>
      apiFetch<{ deleted: boolean; provider: AiProviderId }>(
        `/providers/${encodeURIComponent(provider)}`,
        { method: 'DELETE' },
      ),
  },

  monitor: {
    getOffice: () => apiFetch<unknown>('/monitor/office'),
    getTeam: () => apiFetch<{ agents: unknown[] }>('/monitor/team'),
    listAutomations: () => apiFetch<{ automations: unknown[] }>('/automations'),
    runAutomation: (id: string) =>
      apiFetch<{ run: unknown; automation: unknown }>(`/automations/${id}/run`, {
        method: 'POST',
      }),
    toggleAutomation: (id: string) =>
      apiFetch<{ automation: unknown }>(`/automations/${id}/toggle`, {
        method: 'POST',
      }),
    batchApproveAutomations: (ids?: string[]) =>
      apiFetch<{ count: number; ids: string[] }>('/automations/batch-approve', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    listNotifications: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
      return apiFetch<{ notifications: unknown[]; unreadCount: number }>(
        `/notifications${qs}`,
      )
    },
    markNotificationRead: (id: string) =>
      apiFetch<{ notification: unknown }>(`/notifications/${id}/read`, {
        method: 'POST',
      }),
    markAllNotificationsRead: () =>
      apiFetch<{ count: number }>('/notifications/read-all', {
        method: 'POST',
      }),
    listReports: () => apiFetch<{ reports: unknown[] }>('/monitor/reports'),
    generateReport: (period = 'daily') =>
      apiFetch<{ report: unknown }>('/monitor/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ period }),
      }),
    getSettings: () => apiFetch<{ config: unknown }>('/monitor/settings'),
    saveSettings: (body: unknown) =>
      apiFetch<{ config: unknown }>('/monitor/settings', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    testConnection: (body: unknown) =>
      apiFetch<{ ok: boolean; status: string; message: string }>(
        '/monitor/settings/test-connection',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      ),
  },
}
