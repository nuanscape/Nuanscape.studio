import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setStoredToken, setStoredRefreshToken, ApiResponseError } from '@/lib/api-client'
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

const guestUser: AppUser = {
  name: '',
  email: '',
  role: 'Owner',
  initials: '',
  plan: 'Studio',
  timezone: 'Asia/Jakarta',
  joinedAt: '',
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
  register: (input: { name: string; email: string; password: string }) => Promise<AuthResult>
  login: (input: { email: string; password: string }) => Promise<AuthResult>
  loginWithGoogle: (ticket: string) => Promise<AuthResult>
  logout: () => void
}

function toUser(account: Account): AppUser {
  const { id: _id, password: _password, ...rest } = account
  return rest
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: guestUser,
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
      register: async ({ name, email, password }) => {
        const cleanName = name.trim()
        const cleanEmail = email.trim().toLowerCase()
        if (cleanName.length < 2) return { ok: false, error: 'Nama minimal 2 karakter.' }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Email tidak valid.' }
        if (password.length < 6) return { ok: false, error: 'Password minimal 6 karakter.' }

        try {
          const res = await api.auth.register({ name: cleanName, email: cleanEmail, password })
          setStoredToken(res.accessToken)
          setStoredRefreshToken(res.refreshToken)
          const account: Account = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            password: '',
            role: res.user.role || 'Owner',
            initials: res.user.initials || initialsOf(res.user.name),
            plan: res.user.plan || 'Studio',
            timezone: res.user.timezone || 'Asia/Jakarta',
            joinedAt: res.user.joinedAt || new Date().toISOString(),
          }
          set((state) => ({
            accounts: [...state.accounts.filter((a) => a.email !== cleanEmail), account],
            session: account,
            user: toUser(account),
          }))
          return { ok: true }
        } catch (err) {
          if (err instanceof ApiResponseError && err.status === 409) {
            return { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' }
          }
          const errorMsg = err instanceof Error ? err.message : 'Pendaftaran gagal.'
          return { ok: false, error: errorMsg }
        }
      },
      login: async ({ email, password }) => {
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !password) return { ok: false, error: 'Email dan password wajib diisi.' }

        try {
          const res = await api.auth.login({ email: cleanEmail, password })
          setStoredToken(res.accessToken)
          setStoredRefreshToken(res.refreshToken)
          const account: Account = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            password: '',
            role: res.user.role || 'Owner',
            initials: res.user.initials || initialsOf(res.user.name),
            plan: res.user.plan || 'Studio',
            timezone: res.user.timezone || 'Asia/Jakarta',
            joinedAt: res.user.joinedAt || new Date().toISOString(),
          }
          set({
            session: account,
            user: toUser(account),
          })
          return { ok: true }
        } catch (err) {
          let matched: Account | undefined
          set((state) => {
            matched = state.accounts.find((a) => a.email === cleanEmail && a.password === password)
            if (!matched) return state
            return { session: matched, user: toUser(matched) }
          })
          if (matched) return { ok: true }
          const errorMsg = err instanceof Error ? err.message : 'Email atau password salah.'
          return { ok: false, error: errorMsg }
        }
      },
      loginWithGoogle: async (ticket) => {
        try {
          const res = await api.auth.googleExchange(ticket)
          setStoredToken(res.accessToken)
          setStoredRefreshToken(res.refreshToken)
          const account: Account = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            password: '',
            role: res.user.role || 'Owner',
            initials: res.user.initials || initialsOf(res.user.name),
            plan: res.user.plan || 'Studio',
            timezone: res.user.timezone || 'Asia/Jakarta',
            joinedAt: res.user.joinedAt || new Date().toISOString(),
          }
          set((state) => ({
            accounts: [...state.accounts.filter((a) => a.email !== account.email), account],
            session: account,
            user: toUser(account),
          }))
          return { ok: true }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Login Google gagal.'
          return { ok: false, error: errorMsg }
        }
      },
      logout: () => {
        setStoredToken(null)
        setStoredRefreshToken(null)
        set({ session: null, user: guestUser })
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
  refreshNotifications: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandOpen: false,
      notifications: [],
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }))
        api.monitor.markNotificationRead(id).catch(() => {})
      },
      markAllNotificationsRead: () => {
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
        api.monitor.markAllNotificationsRead().catch(() => {})
      },
      refreshNotifications: async () => {
        try {
          const res = await api.monitor.listNotifications()
          if (Array.isArray(res?.notifications)) {
            set({ notifications: res.notifications as AppNotification[] })
          }
        } catch {
          // keep local state
        }
      },
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
