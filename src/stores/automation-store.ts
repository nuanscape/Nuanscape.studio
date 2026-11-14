import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { automations as seedAutomations } from '@/data/mock'
import type { Automation } from '@/types'

interface AutomationState {
  items: Automation[]
  approve: (id: string) => void
  pause: (id: string) => void
  setStatus: (id: string, status: Automation['status']) => void
  runNow: (id: string) => void
  add: (item: Automation) => void
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set) => ({
      items: seedAutomations,
      approve: (id) =>
        set((s) => ({
          items: s.items.map((a) =>
            a.id === id ? { ...a, status: 'active', lastRun: new Date().toISOString(), runs: a.runs + 1 } : a,
          ),
        })),
      pause: (id) =>
        set((s) => ({ items: s.items.map((a) => (a.id === id ? { ...a, status: 'paused' } : a)) })),
      setStatus: (id, status) =>
        set((s) => ({ items: s.items.map((a) => (a.id === id ? { ...a, status } : a)) })),
      runNow: (id) =>
        set((s) => ({
          items: s.items.map((a) =>
            a.id === id ? { ...a, lastRun: new Date().toISOString(), runs: a.runs + 1, status: 'active' } : a,
          ),
        })),
      add: (item) => set((s) => ({ items: [item, ...s.items] })),
    }),
    { name: 'nuanscape-automations' },
  ),
)
