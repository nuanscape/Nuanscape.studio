import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { BackendSync } from '@/app/backend-sync'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BackendSync />
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
