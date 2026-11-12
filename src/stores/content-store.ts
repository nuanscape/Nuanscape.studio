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
  addContent: (item: Omit<ContentItem, 'id' | 'createdAt'>) => ContentItem
  updateStatus: (id: string, status: ContentStatus) => void
  deleteContent: (id: string) => void
  addIdea: (idea: Omit<ContentIdea, 'id'>) => void
  approveIdea: (id: string) => void
  promoteIdea: (id: string, platform?: Platform) => void
  addAsset: (asset: Omit<LibraryAsset, 'id'>) => void
  updateScript: (id: string, script: string) => void
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      items: seedItems,
      ideas: seedIdeas,
      library: seedAssets,
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
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: true } : i)),
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
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, approved: true } : i)),
        }))
      },
      addAsset: (asset) => set((s) => ({ library: [{ ...asset, id: uid('la') }, ...s.library] })),
      updateScript: (id, script) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, script } : i)) })),
    }),
    { name: 'nuanscape-content' },
  ),
)
