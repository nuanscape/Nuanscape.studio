import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  const icons = {
    default: <Info className="size-4 text-info" />,
    info: <Info className="size-4 text-info" />,
    success: <CheckCircle2 className="size-4 text-primary" />,
    warning: <AlertTriangle className="size-4 text-warning" />,
    danger: <XCircle className="size-4 text-danger" />,
  }

  return (
    <div className="landing-surface pointer-events-none fixed bottom-5 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border border-line-strong bg-elevated/95 p-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md',
            )}
          >
            <div className="mt-0.5">{icons[toast.tone ?? 'default']}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-text-primary">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">{toast.description}</p>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-text-muted transition-colors hover:text-text-primary"
              aria-label="Tutup notifikasi"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
