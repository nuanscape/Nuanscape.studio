import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ApiProvider = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'custom'

export type ApiConnectionStatus = 'idle' | 'connected' | 'error'

export interface HeadAgentApiConfig {
  provider: ApiProvider
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export const providerPresets: Record<
  Exclude<ApiProvider, 'custom'>,
  { label: string; baseUrl: string; model: string }
> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4' },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
  },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
}

export const defaultHeadAgentConfig: HeadAgentApiConfig = {
  provider: 'openai',
  baseUrl: providerPresets.openai.baseUrl,
  apiKey: '',
  model: providerPresets.openai.model,
  temperature: 0.3,
  maxTokens: 2048,
  systemPrompt:
    'Kamu adalah Muhe, head agent Nuanscape. Orkestrasi agent finance, seller, dan content. Selalu minta approval sebelum aksi yang mengubah data.',
}

interface ApiSettingsState {
  headAgent: HeadAgentApiConfig
  status: ApiConnectionStatus
  lastCheckedAt: string | null
  saveHeadAgent: (patch: Partial<HeadAgentApiConfig>) => void
  setStatus: (status: ApiConnectionStatus) => void
  resetHeadAgent: () => void
}

export const useApiSettingsStore = create<ApiSettingsState>()(
  persist(
    (set) => ({
      headAgent: defaultHeadAgentConfig,
      status: 'idle',
      lastCheckedAt: null,
      saveHeadAgent: (patch) =>
        set((s) => ({
          headAgent: { ...s.headAgent, ...patch },
          status: 'idle',
          lastCheckedAt: null,
        })),
      setStatus: (status) => set({ status, lastCheckedAt: new Date().toISOString() }),
      resetHeadAgent: () => set({ headAgent: defaultHeadAgentConfig, status: 'idle', lastCheckedAt: null }),
    }),
    { name: 'nuanscape-api-settings' },
  ),
)
