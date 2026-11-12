import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PlatformChip } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import type { ContentItem, ContentStatus } from '@/types'
import { formatDate } from '@/lib/utils'

const columns: ContentStatus[] = [
  'Idea',
  'Script Ready',
  'Production',
  'Editing',
  'Review',
  'Ready to Publish',
  'Published',
]

function nextStatus(status: ContentStatus): ContentStatus | null {
  const index = columns.indexOf(status)
  if (index === -1 || index === columns.length - 1) return null
  return columns[index + 1]
}

const longLabels: Partial<Record<ContentStatus, string>> = {
  Idea: 'Ide',
  'Script Ready': 'Naskah',
  Production: 'Produksi',
  'Ready to Publish': 'Siap tayang',
  Published: 'Tayang',
}

const shortLabels: Partial<Record<ContentStatus, string>> = {
  Idea: 'Ide',
  'Script Ready': 'Hook',
  Production: 'Shoot',
  Editing: 'Edit',
  'Ready to Publish': 'Siap posting',
  Published: 'Tayang',
}

export function ContentDraftsPage() {
  const { updateStatus, deleteContent } = useContentStore()
  const { format, items, account, stagePath } = useContentScope()
  const isLong = format === 'long'
  const labels = isLong ? longLabels : shortLabels
  const { push } = useToastStore()
  const [toDelete, setToDelete] = React.useState<ContentItem | null>(null)
  const [filter, setFilter] = React.useState<'all' | 'active'>('all')

  const visible = filter === 'active' ? items.filter((i) => i.status !== 'Published') : items

  return (
    <div>
      <PageHeader
        title={isLong ? 'Production board' : 'Batch board'}
        description={
          isLong
            ? `Pindahkan episode dari ide hingga siap tayang${account ? ` untuk ${account.handle}` : ' di akun YouTube'} dengan alur panjang.`
            : `Pindahkan konten pendek dari hook hingga siap posting${account ? ` untuk ${account.handle}` : ''} dalam satu sesi batch.`
        }
        actions={
          <>
            <Button variant={filter === 'all' ? 'secondary' : 'ghost'} onClick={() => setFilter(filter === 'all' ? 'active' : 'all')}>
              {filter === 'all' ? 'Tampilkan aktif' : 'Tampilkan semua'}
            </Button>
            <Link to={stagePath('studio')} className={buttonVariants()}>
              <Plus /> Konten baru
            </Link>
          </>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => {
          const columnItems = visible.filter((i) => i.status === column)
          return (
            <div key={column} className="flex w-[270px] shrink-0 flex-col rounded-xl border border-line bg-card/40">
              <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <p className="text-[11px] font-semibold text-text-primary">{labels[column] ?? column}</p>
                <Badge tone="outline">{columnItems.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2.5" style={{ minHeight: 380, maxHeight: '62vh' }}>
                {columnItems.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-text-muted">
                    Kosong
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const next = nextStatus(item.status)
                    return (
                      <Card key={item.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <PlatformChip platform={item.platform} />
                          <span className="truncate text-[9px] text-text-muted">{resolveAccount(item)?.handle}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium leading-snug text-text-primary">{item.title}</p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-text-muted">
                          <span>{item.format}</span>
                          <span>·</span>
                          <span>{formatDate(item.scheduledAt, 'd MMM')}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
                          {item.script ? (
                            <Badge tone="primary" className="text-[9px]"><FileText className="size-2.5" /> {isLong ? 'Naskah' : 'Hook'}</Badge>
                          ) : (
                            <Link to={stagePath('scripts')} className="text-[9px] text-text-muted hover:text-primary">
                              {isLong ? 'Tulis naskah' : 'Tulis hook'}
                            </Link>
                          )}
                          <span className="flex-1" />
                          {next ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Pindahkan ke ${next}`}
                              title={`Pindahkan ke ${next}`}
                              onClick={() => {
                                updateStatus(item.id, next)
                                push({ title: 'Status diperbarui', description: `${item.title} → ${labels[next] ?? next}`, tone: 'success' })
                              }}
                            >
                              <ArrowRight />
                            </Button>
                          ) : null}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Hapus konten"
                            onClick={() => setToDelete(item)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[10px] text-text-muted">
        Board menampilkan status saat ini. Gunakan tombol panah untuk memindahkan ke tahap berikutnya.
        Publish tetap manual.
      </p>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteContent(toDelete.id)
            push({ title: 'Konten dihapus', description: toDelete.title, tone: 'info' })
          }
        }}
        title="Hapus konten?"
        description={toDelete ? `“${toDelete.title}” akan dihapus dari pipeline lokal.` : undefined}
        confirmLabel="Hapus konten"
      />
    </div>
  )
}
