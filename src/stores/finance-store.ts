import { create } from 'zustand'
import type { AssetItem, Budget, Goal, LiabilityItem, Transaction } from '@/types'
import { uid } from '@/lib/utils'
import { api, apiFetch } from '@/lib/api-client'

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
  refresh: () => Promise<void>
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
      transactions: [],
      budgets: [],
      goals: [],
      assets: [],
      liabilities: [],
      addTransaction: (t) => {
        set((s) => ({ transactions: [{ ...t, id: uid('tx') }, ...s.transactions] }))
        api.finance.createTransaction(t).catch(() => {})
      },
      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
        apiFetch(`/finance/transactions/${id}`, { method: 'DELETE' }).catch(() => {})
      },
      addBudget: (b) => {
        set((s) => ({ budgets: [...s.budgets, { ...b, id: uid('b'), spent: 0 }] }))
        api.finance.createBudget({ category: b.category, limit: b.limit }).catch(() => {})
      },
      updateBudget: (id, patch) => {
        set((s) => ({
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }))
        if (patch.limit !== undefined) {
          apiFetch(`/finance/budgets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ limit: patch.limit }),
          }).catch(() => {})
        }
      },
      addGoal: (g) => {
        set((s) => ({ goals: [...s.goals, { ...g, id: uid('g') }] }))
        api.finance.createGoal(g).catch(() => {})
      },
      contributeGoal: (id, amount) => {
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g,
          ),
        }))
        apiFetch(`/finance/goals/${id}/contribute`, {
          method: 'POST',
          body: JSON.stringify({ amount }),
        }).catch(() => {})
      },
      addAsset: (a) => {
        set((s) => ({ assets: [...s.assets, { ...a, id: uid('a') }] }))
        apiFetch('/finance/assets', {
          method: 'POST',
          body: JSON.stringify(a),
        }).catch(() => {})
      },
      addLiability: (l) => {
        set((s) => ({ liabilities: [...s.liabilities, { ...l, id: uid('l') }] }))
        apiFetch('/finance/liabilities', {
          method: 'POST',
          body: JSON.stringify(l),
        }).catch(() => {})
      },
      refresh: async () => {
        try {
          const [txRes, budgetRes, goalRes, assetRes] = await Promise.all([
            api.finance.listTransactions({ limit: '100' }),
            api.finance.listBudgets(),
            api.finance.listGoals(),
            apiFetch<{
              items: AssetItem[]
              liabilities: LiabilityItem[]
            }>('/finance/assets'),
          ])
          set({
            transactions: txRes.items as Transaction[],
            budgets: budgetRes.items as Budget[],
            goals: goalRes.items as Goal[],
            assets: assetRes.items,
            liabilities: assetRes.liabilities,
          })
        } catch {
          void get()
        }
      },
}))
