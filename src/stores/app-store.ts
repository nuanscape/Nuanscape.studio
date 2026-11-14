import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { currentUser, notifications as seedNotifications } from '@/data/mock'
import type { AppNotification } from '@/types'
import { uid } from '@/lib/utils'

interface AppUser {
  name: string
  email: string
  role: string
  initials: string
  plan: string
  timezone: string
  joinedAt: string
}

export interface Account extends AppUser {
  id: string
  password: string
}

export type AuthResult = { ok: true } | { ok: false; error: string }

interface AuthState {
  user: AppUser
  accounts: Account[]
  session: Account | null
  updateProfile: (patch: Partial<AppUser>) => void
  register: (input: { name: string; email: string; password: string }) => AuthResult
  login: (input: { email: string; password: string }) => AuthResult
  logout: () => void
}

function toUser(account: Account): AppUser {
  const { id: _id, password: _password, ...rest } = account
  return rest
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: currentUser,
      accounts: [],
      session: null,
      updateProfile: (patch) =>
        set((state) => ({
          user: {
            ...state.user,
            ...patch,
            initials: patch.name ? initialsOf(patch.name) : state.user.initials,
          },
        })),
      register: ({ name, email, password }) => {
        const cleanName = name.trim()
        const cleanEmail = email.trim().toLowerCase()
        if (cleanName.length < 2) return { ok: false, error: 'Nama minimal 2 karakter.' }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Email tidak valid.' }
        if (password.length < 6) return { ok: false, error: 'Password minimal 6 karakter.' }

        let duplicate = false
        set((state) => {
          if (state.accounts.some((a) => a.email === cleanEmail)) {
            duplicate = true
            return state
          }
          const account: Account = {
            id: uid('user'),
            name: cleanName,
            email: cleanEmail,
            password,
            role: 'Owner',
            initials: initialsOf(cleanName),
            plan: 'Demo',
            timezone: 'Asia/Jakarta',
            joinedAt: new Date().toISOString(),
          }
          return { accounts: [...state.accounts, account], session: account, user: toUser(account) }
        })
        return duplicate ? { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' } : { ok: true }
      },
      login: ({ email, password }) => {
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !password) return { ok: false, error: 'Email dan password wajib diisi.' }
        let matched: Account | undefined
        set((state) => {
          matched = state.accounts.find((a) => a.email === cleanEmail && a.password === password)
          if (!matched) return state
          return { session: matched, user: toUser(matched) }
        })
        return matched ? { ok: true } : { ok: false, error: 'Email atau password salah.' }
      },
      logout: () => {
        set({ session: null, user: currentUser })
      },
    }),
    {
      name: 'nuanscape-auth',
      partialize: (s) => ({ user: s.user, accounts: s.accounts, session: s.session }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<AuthState>
        return {
          ...current,
          user: stored.user ?? current.user,
          accounts: stored.accounts ?? [],
          session: stored.session ?? null,
        }
      },
    },
  ),
)

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

interface AppState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  commandOpen: boolean
  notifications: AppNotification[]
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setCommandOpen: (open: boolean) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      notifications: seedNotifications,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: uid('n'), time: new Date().toISOString(), read: false },
            ...s.notifications,
          ],
        })),
    }),
    {
      name: 'nuanscape-app',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        notifications: s.notifications,
      }),
    },
  ),
)

export interface Toast {
  id: string
  title: string
  description?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = uid('toast')
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
