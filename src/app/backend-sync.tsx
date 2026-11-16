import { useEffect } from 'react'
import { useAuthStore } from '@/stores/app-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useSellerStore } from '@/stores/seller-store'
import { useContentStore } from '@/stores/content-store'
import { useAutomationStore } from '@/stores/automation-store'
import { useAppStore } from '@/stores/app-store'
import { api, getStoredToken } from '@/lib/api-client'

export function BackendSync() {
  const session = useAuthStore((s) => s.session)
  const sessionId = session?.id

  useEffect(() => {
    const handleExpired = () => useAuthStore.getState().logout()
    window.addEventListener('nuanscape-auth-expired', handleExpired)
    return () => window.removeEventListener('nuanscape-auth-expired', handleExpired)
  }, [])

  useEffect(() => {
    if (!sessionId || !getStoredToken()) return
    let cancelled = false

    const run = async () => {
      let me
      try {
        me = await api.auth.me()
      } catch {
        return
      }
      if (cancelled) return
      if (me?.user?.id) {
        useAuthStore.setState((state) => ({
          user: {
            ...state.user,
            name: me.user.name,
            email: me.user.email,
            role: me.user.role || state.user.role,
            plan: me.user.plan || state.user.plan,
          },
        }))
      }
      await Promise.allSettled([
        useFinanceStore.getState().refresh(),
        useSellerStore.getState().refresh(),
        useContentStore.getState().refresh(),
        useAutomationStore.getState().refresh(),
        useAppStore.getState().refreshNotifications(),
      ])
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return null
}
