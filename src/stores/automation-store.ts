import { create } from 'zustand'
import { api, apiFetch } from '@/lib/api-client'
import type { Automation } from '@/types'

interface AutomationState {
  items: Automation[]
  approve: (id: string) => void
  pause: (id: string) => void
  setStatus: (id: string, status: Automation['status']) => void
  runNow: (id: string) => void
  add: (item: Automation) => void
  refresh: () => Promise<void>
}

export const useAutomationStore = create<AutomationState>()((set) => ({
      items: [],
      approve: (id) => {
        set((s) => ({
          items: s.items.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'active',
                  lastRun: new Date().toISOString(),
                  runs: a.runs + 1,
                }
              : a,
          ),
        }))
        api.monitor.toggleAutomation(id).catch(() => {})
      },
      pause: (id) => {
        set((s) => ({
          items: s.items.map((a) => (a.id === id ? { ...a, status: 'paused' } : a)),
        }))
        api.monitor.toggleAutomation(id).catch(() => {})
      },
      setStatus: (id, status) =>
        set((s) => ({ items: s.items.map((a) => (a.id === id ? { ...a, status } : a)) })),
      runNow: (id) => {
        set((s) => ({
          items: s.items.map((a) =>
            a.id === id
              ? {
                  ...a,
                  lastRun: new Date().toISOString(),
                  runs: a.runs + 1,
                  status: 'active',
                }
              : a,
          ),
        }))
        api.monitor.runAutomation(id).catch(() => {})
      },
      add: (item) => {
        set((s) => ({ items: [item, ...s.items] }))
        apiFetch('/automations', {
          method: 'POST',
          body: JSON.stringify(item),
        }).catch(() => {})
      },
      refresh: async () => {
        try {
          const res = await api.monitor.listAutomations()
          if (Array.isArray(res?.automations)) {
            set({ items: res.automations as Automation[] })
          }
        } catch {
          // fallback to current local state
        }
      },
}))
