import { AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { Dialog } from './dialog'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi aksi',
  description,
  confirmLabel = 'Ya, lanjutkan',
  tone = 'danger',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
  tone?: 'danger' | 'primary'
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-danger/25 bg-danger/10">
          <AlertTriangle className="size-4 text-danger" />
        </span>
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {description ? <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p> : null}
        </div>
      </div>
    </Dialog>
  )
}
