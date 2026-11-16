import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiProviderId, ProviderConfigView } from '../lib/api-client'

export type ApiProvider = AiProviderId

export type ApiConnectionStatus = 'idle' | 'connected' | 'error'

export interface HeadAgentApiConfig {
  provider: ApiProvider
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export const providerPresets: Record<
  ApiProvider,
  { label: string; baseUrl: string; model: string }
> = {
  'kie.ai': { label: 'KIE.ai', baseUrl: 'https://api.kie.ai/gpt-5-2/v1', model: 'gpt-5-2' },
  nvidia: {
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  },
}

export const defaultHeadAgentConfig: HeadAgentApiConfig = {
  provider: 'kie.ai',
  baseUrl: providerPresets['kie.ai'].baseUrl,
  model: providerPresets['kie.ai'].model,
  temperature: 0.3,
  maxTokens: 2048,
  systemPrompt:
    'Kamu adalah Muhe, head agent Nuanscape. Orkestrasi agent finance, seller, dan content. Selalu minta approval sebelum aksi yang mengubah data.',
}

interface ApiSettingsState {
  headAgent: HeadAgentApiConfig
  providers: ProviderConfigView[]
  providersLoading: boolean
  providerError: string | null
  status: ApiConnectionStatus
  lastCheckedAt: string | null
  saveHeadAgent: (patch: Partial<HeadAgentApiConfig>) => void
  setProviders: (providers: ProviderConfigView[]) => void
  setProvidersLoading: (loading: boolean) => void
  setProviderError: (message: string | null) => void
  setStatus: (status: ApiConnectionStatus) => void
  resetHeadAgent: () => void
}

export const useApiSettingsStore = create<ApiSettingsState>()(
  persist(
    (set) => ({
      headAgent: defaultHeadAgentConfig,
      providers: [],
      providersLoading: false,
      providerError: null,
      status: 'idle',
      lastCheckedAt: null,
      saveHeadAgent: (patch) =>
        set((s) => ({
          headAgent: { ...s.headAgent, ...patch },
          status: 'idle',
          lastCheckedAt: null,
        })),
      setProviders: (providers) => set({ providers }),
      setProvidersLoading: (providersLoading) => set({ providersLoading }),
      setProviderError: (providerError) => set({ providerError }),
      setStatus: (status) => set({ status, lastCheckedAt: new Date().toISOString() }),
      resetHeadAgent: () => set({ headAgent: defaultHeadAgentConfig, status: 'idle', lastCheckedAt: null }),
    }),
    {
      name: 'nuanscape-api-settings',
      version: 3,
      partialize: (state) => ({
        headAgent: state.headAgent,
        status: state.status,
        lastCheckedAt: state.lastCheckedAt,
      }),
      migrate: (persistedState) => {
        const state = persistedState as
          | { headAgent?: Record<string, unknown>; status?: unknown; lastCheckedAt?: unknown }
          | undefined
        const headAgent = state?.headAgent
        if (headAgent) {
          delete headAgent.apiKey
          const provider = headAgent.provider
          if (provider !== 'kie.ai' && provider !== 'nvidia') {
            headAgent.provider = 'kie.ai'
            headAgent.baseUrl = providerPresets['kie.ai'].baseUrl
            headAgent.model = providerPresets['kie.ai'].model
          }
        }
        return persistedState
      },
    },
  ),
)
