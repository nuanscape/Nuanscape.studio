import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  contentIdeas as seedIdeas,
  contentItems as seedItems,
  libraryAssets as seedAssets,
} from '@/data/mock'
import type { ContentIdea, ContentItem, ContentStatus, LibraryAsset, Platform } from '@/types'
import { uid } from '@/lib/utils'

interface ContentState {
  items: ContentItem[]
  ideas: ContentIdea[]
  library: LibraryAsset[]
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
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      items: seedItems,
      ideas: seedIdeas,
      library: seedAssets,
      linkedAccounts: {},
      aiEnergy: 100,
      aiEnergyMax: 100,
      contentApiKey: '',
      addContent: (item) => {
        const created: ContentItem = { ...item, id: uid('c'), createdAt: new Date().toISOString() }
        set((s) => ({ items: [created, ...s.items] }))
        return created
      },
      updateStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, status } : i)),
        })),
      deleteContent: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      addIdea: (idea) => set((s) => ({ ideas: [{ ...idea, id: uid('i') }, ...s.ideas] })),
      approveIdea: (id) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: true, rejected: false } : i)),
        })),
      rejectIdea: (id) =>
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: false, rejected: true } : i)),
        })),
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
        const { aiEnergy, aiEnergyMax } = get()
        set({ aiEnergy: Math.min(aiEnergyMax, aiEnergy + amount) })
      },
      setContentApiKey: (key) =>
        set((s) => {
          const trimmed = key.trim()
          if (trimmed && trimmed !== s.contentApiKey) {
            return { contentApiKey: trimmed, aiEnergy: s.aiEnergyMax }
          }
          return { contentApiKey: trimmed }
        }),
    }),
    { name: 'nuanscape-content' },
  ),
)
