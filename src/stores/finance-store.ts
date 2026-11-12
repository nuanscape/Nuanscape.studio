import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  assets as seedAssets,
  budgets as seedBudgets,
  goals as seedGoals,
  liabilities as seedLiabilities,
  transactions as seedTransactions,
} from '@/data/mock'
import type { AssetItem, Budget, Goal, LiabilityItem, Transaction } from '@/types'
import { uid } from '@/lib/utils'

interface FinanceState {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  assets: AssetItem[]
  liabilities: LiabilityItem[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  deleteTransaction: (id: string) => void
  addBudget: (b: Omit<Budget, 'id' | 'spent'>) => void
  updateBudget: (id: string, patch: Partial<Budget>) => void
  addGoal: (g: Omit<Goal, 'id'>) => void
  contributeGoal: (id: string, amount: number) => void
  addAsset: (a: Omit<AssetItem, 'id'>) => void
  addLiability: (l: Omit<LiabilityItem, 'id'>) => void
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: seedTransactions,
      budgets: seedBudgets,
      goals: seedGoals,
      assets: seedAssets,
      liabilities: seedLiabilities,
      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid('tx') }, ...s.transactions] })),
      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      addBudget: (b) =>
        set((s) => ({ budgets: [...s.budgets, { ...b, id: uid('b'), spent: 0 }] })),
      updateBudget: (id, patch) =>
        set((s) => ({
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid('g') }] })),
      contributeGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g,
          ),
        })),
      addAsset: (a) => set((s) => ({ assets: [...s.assets, { ...a, id: uid('a') }] })),
      addLiability: (l) => set((s) => ({ liabilities: [...s.liabilities, { ...l, id: uid('l') }] })),
    }),
    { name: 'nuanscape-finance' },
  ),
)
