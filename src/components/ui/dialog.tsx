import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#000000]/80 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'landing-surface panel relative z-10 max-h-[92dvh] w-full overflow-hidden rounded-t-[22px] sm:rounded-[22px]',
              sizes[size],
              className,
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  {title ? (
                    <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>
                  ) : null}
                  {description ? (
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup">
                  <X />
                </Button>
              </div>
            )}
            <div className="max-h-[calc(92dvh-9rem)] overflow-y-auto p-5">{children}</div>
            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-background-secondary/40 px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
