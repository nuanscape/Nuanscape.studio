import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentStatusBadge, PlatformChip, platformColor } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { cn, formatDate } from '@/lib/utils'

const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function ContentCalendarPage() {
  const { format: contentFormat, items, accounts, account, stagePath } = useContentScope()
  const isLong = contentFormat === 'long'
  const [month, setMonth] = React.useState(new Date())
  const [selected, setSelected] = React.useState(new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  const byDay = (day: Date) => items.filter((i) => isSameDay(new Date(i.scheduledAt), day))
  const selectedItems = byDay(selected)

  return (
    <div>
      <PageHeader
        title={isLong ? 'Kalender upload' : 'Kalender posting'}
        description={
          isLong
            ? `Distribusi jadwal upload YouTube${account ? ` untuk ${account.handle}` : ''} tanpa tabrakan antar akun.`
            : `Jadwal posting harian TikTok & Instagram${account ? ` untuk ${account.handle}` : ''} dalam satu flow pendek.`
        }
        actions={
          <Link to={stagePath('studio')} className={buttonVariants()}>
            <Plus /> {isLong ? 'Jadwalkan upload' : 'Jadwalkan posting'}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-text-primary">
                {format(month, 'MMMM yyyy', { locale: localeID })}
              </h2>
              <p className="mt-0.5 text-[10px] text-text-muted">Senin – Minggu · zona waktu lokal</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon-sm" aria-label="Bulan sebelumnya" onClick={() => setMonth((m) => subMonths(m, 1))}>
                <ChevronLeft />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setMonth(new Date()); setSelected(new Date()) }}>
                Hari ini
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Bulan berikutnya" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d) => (
              <div key={d} className="pb-1 text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const dayItems = byDay(day)
              const inMonth = isSameMonth(day, month)
              const active = isSameDay(day, selected)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={cn(
                    'relative min-h-[68px] rounded-lg border p-1.5 text-left transition-colors sm:min-h-[86px]',
                    active
                      ? 'border-primary/40 bg-primary/[0.07]'
                      : 'border-line/60 bg-white/[0.01] hover:border-line-strong hover:bg-white/[0.03]',
                    !inMonth && 'opacity-40',
                  )}
                >
                  <span
                    className={cn(
                      'num inline-grid size-5 place-items-center rounded-full text-[10px]',
                      isToday(day) ? 'bg-primary text-[#0B0B0B]' : 'text-text-secondary',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[8px] text-text-secondary"
                        style={{ backgroundColor: `${platformColor[item.platform]}1a` }}
                      >
                        <span className="size-1 shrink-0 rounded-full" style={{ backgroundColor: platformColor[item.platform] }} />
                        <span className="truncate">{item.title}</span>
                      </span>
                    ))}
                    {dayItems.length > 2 ? (
                      <span className="block pl-1 text-[8px] text-text-muted">+{dayItems.length - 2} lagi</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader
              title={formatDate(selected, 'EEEE, d MMMM yyyy')}
              description={`${selectedItems.length} konten dijadwalkan`}
              action={
                selectedItems.length === 0 ? (
                  <Link to={stagePath('studio')} className={buttonVariants({ variant: 'soft', size: 'sm' })}>
                    <Plus /> Isi slot
                  </Link>
                ) : undefined
              }
            />
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong py-8 text-center">
                <CalendarDays className="size-5 text-text-muted" />
                <p className="mt-2 text-[11px] text-text-secondary">Belum ada konten</p>
                <p className="mt-0.5 text-[10px] text-text-muted">Slot kosong bisa diisi konten evergreen.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <PlatformChip platform={item.platform} />
                      <span className="truncate text-[9px] text-text-muted">{resolveAccount(item)?.handle}</span>
                      <span className="num text-[9px] text-text-muted">{format(new Date(item.scheduledAt), 'HH:mm')}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] font-medium leading-snug text-text-primary">{item.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ContentStatusBadge status={item.status} />
                      <Badge tone="outline">{item.format}</Badge>
                    </div>
                    <Link to={stagePath('drafts')} className="mt-2 inline-flex text-[10px] text-primary hover:underline">
                      Kelola konten
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title="Bulan ini" description={isLong ? 'Ringkasan jadwal per akun YouTube' : 'Ringkasan jadwal per akun short'} />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: items.length },
                { label: 'Siap tayang', value: items.filter((i) => i.status === 'Ready to Publish' || i.status === 'Published').length },
                { label: isLong ? 'Produksi' : 'Batch', value: items.filter((i) => ['Production', 'Editing', 'Review'].includes(i.status)).length },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-center">
                  <p className="num text-[16px] font-semibold text-text-primary">{s.value}</p>
                  <p className="mt-0.5 text-[9px] text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {accounts.map((entry) => {
                const count = items.filter((item) => resolveAccount(item)?.id === entry.id).length
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <PlatformChip platform={entry.platform} />
                      <span className="truncate text-text-secondary">{entry.handle}</span>
                    </div>
                    <span className="shrink-0 text-text-muted">{count} konten</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
