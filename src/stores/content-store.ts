import { create } from 'zustand'
import type {
  ContentIdea,
  ContentItem,
  ContentStatus,
  LibraryAsset,
  Platform,
  PlatformAccount,
} from '@/types'
import { uid } from '@/lib/utils'
import { api, apiFetch } from '@/lib/api-client'

export interface TrendPoint {
  label: string
  views: number
  engagement: number
}

interface ContentState {
  items: ContentItem[]
  ideas: ContentIdea[]
  library: LibraryAsset[]
  accounts: PlatformAccount[]
  accountsFromBackend: boolean
  trend: { long: TrendPoint[]; short: TrendPoint[] }
  linkedAccounts: Record<string, boolean>
  aiEnergy: number
  aiEnergyMax: number
  contentApiKey: string
  addContent: (item: Omit<ContentItem, 'id' | 'createdAt'>) => ContentItem
  updateStatus: (id: string, status: ContentStatus) => void
  deleteContent: (id: string) => void
  addIdea: (idea: Omit<ContentIdea, 'id'>) => void
  approveIdea: (id: string) => void
  rejectIdea: (id: string) => void
  restoreIdea: (id: string) => void
  promoteIdea: (id: string, platform?: Platform) => void
  addAsset: (asset: Omit<LibraryAsset, 'id'>) => void
  updateScript: (id: string, script: string) => void
  linkAccount: (id: string) => void
  unlinkAccount: (id: string) => void
  isAccountLinked: (id: string) => boolean
  consumeEnergy: (amount: number) => boolean
  addEnergy: (amount: number) => void
  setContentApiKey: (key: string) => void
  refresh: () => Promise<void>
}

export const useContentStore = create<ContentState>()((set, get) => ({
      items: [],
      ideas: [],
      library: [],
      accounts: [],
      accountsFromBackend: false,
      trend: { long: [], short: [] },
      linkedAccounts: {},
      aiEnergy: 100,
      aiEnergyMax: 100,
      contentApiKey: '',
      addContent: (item) => {
        const created: ContentItem = { ...item, id: uid('c'), createdAt: new Date().toISOString() }
        set((s) => ({ items: [created, ...s.items] }))
        api.content.createItem(item).catch(() => {})
        return created
      },
      updateStatus: (id, status) => {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, status } : i)),
        }))
        apiFetch(`/content/items/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }).catch(() => {})
      },
      deleteContent: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
        apiFetch(`/content/items/${id}`, {
          method: 'DELETE',
        }).catch(() => {})
      },
      addIdea: (idea) => {
        set((s) => ({ ideas: [{ ...idea, id: uid('i') }, ...s.ideas] }))
        apiFetch('/content/ideas', {
          method: 'POST',
          body: JSON.stringify(idea),
        }).catch(() => {})
      },
      approveIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: true, rejected: false } : i)),
        }))
      },
      rejectIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: false, rejected: true } : i)),
        }))
        apiFetch(`/content/ideas/${id}/reject`, {
          method: 'POST',
        }).catch(() => {})
      },
      restoreIdea: (id) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, rejected: false } : i)),
        })),
      promoteIdea: (id, platform) => {
        const idea = get().ideas.find((i) => i.id === id)
        if (!idea) return
        const created: ContentItem = {
          id: uid('c'),
          title: idea.title,
          platform: platform ?? idea.platform,
          niche: idea.niche,
          format: idea.format,
          accountId: idea.accountId,
          status: 'Approved',
          scheduledAt: new Date(Date.now() + 3 * 86400000).toISOString(),
          views: 0,
          engagement: 0,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          items: [created, ...s.items],
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: true, rejected: false } : i)),
        }))
      },
      addAsset: (asset) => set((s) => ({ library: [{ ...asset, id: uid('la') }, ...s.library] })),
      updateScript: (id, script) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, script } : i)) })),
      linkAccount: (id) => set((s) => ({ linkedAccounts: { ...s.linkedAccounts, [id]: true } })),
      unlinkAccount: (id) => set((s) => ({ linkedAccounts: { ...s.linkedAccounts, [id]: false } })),
      isAccountLinked: (id) => get().linkedAccounts[id] !== false,
      consumeEnergy: (amount) => {
        const { aiEnergy } = get()
        if (aiEnergy < amount) return false
        set({ aiEnergy: aiEnergy - amount })
        return true
      },
      addEnergy: (amount) => {
        set((s) => ({ aiEnergy: Math.min(s.aiEnergyMax, s.aiEnergy + amount) }))
      },
      setContentApiKey: (key) =>
        set((s) => {
          const trimmed = key.trim()
          if (trimmed && trimmed !== s.contentApiKey) {
            return { contentApiKey: trimmed, aiEnergy: s.aiEnergyMax }
          }
          return { contentApiKey: trimmed }
        }),
      refresh: async () => {
        try {
          const [itemsRes, ideasRes, energyRes, accountsRes, libraryRes, longTrend, shortTrend] =
            await Promise.all([
              api.content.listItems(),
              api.content.listIdeas(),
              api.content.getEnergy(),
              api.content.listAccounts(),
              api.content.listLibrary(),
              api.content.getAnalytics({ format: 'long', days: 7 }),
              api.content.getAnalytics({ format: 'short', days: 7 }),
            ])
          if (Array.isArray(itemsRes?.items)) {
            set({ items: itemsRes.items as ContentItem[] })
          }
          if (Array.isArray(ideasRes?.ideas)) {
            set({ ideas: ideasRes.ideas as ContentIdea[] })
          }
          if (typeof energyRes?.current === 'number') {
            set({ aiEnergy: energyRes.current, aiEnergyMax: energyRes.max })
          }
          if (Array.isArray(accountsRes?.accounts)) {
            set({ accounts: accountsRes.accounts as PlatformAccount[], accountsFromBackend: true })
          }
          if (Array.isArray(libraryRes?.assets)) {
            set({ library: libraryRes.assets as LibraryAsset[] })
          }
          const longSeries = Array.isArray(longTrend?.series) ? (longTrend.series as TrendPoint[]) : []
          const shortSeries = Array.isArray(shortTrend?.series) ? (shortTrend.series as TrendPoint[]) : []
          set({ trend: { long: longSeries, short: shortSeries } })
        } catch {
          // backend tidak tersedia: biarkan state kosong
        }
      },
}))
