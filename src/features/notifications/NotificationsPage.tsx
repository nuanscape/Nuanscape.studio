import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  CircleDollarSign,
  Film,
  Info,
  Settings,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/input'
import { useAppStore } from '@/stores/app-store'
import { useToastStore } from '@/stores/app-store'
import type { AppNotification } from '@/types'
import { cn, formatRelative } from '@/lib/utils'

const typeMeta: Record<AppNotification['type'], { label: string; icon: React.ReactNode; className: string }> = {
  finance: { label: 'Finance', icon: <CircleDollarSign />, className: 'border-primary/20 bg-primary/[0.06] text-primary' },
  content: { label: 'Content', icon: <Film />, className: 'border-info/20 bg-info/[0.06] text-info' },
  shop: { label: 'Shop', icon: <ShoppingBag />, className: 'border-warning/20 bg-warning/[0.06] text-warning' },
  ai: { label: 'AI', icon: <Sparkles />, className: 'border-primary/20 bg-primary/[0.06] text-primary' },
  system: { label: 'System', icon: <Info />, className: 'border-line bg-white/[0.04] text-text-secondary' },
}

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const { push } = useToastStore()
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [type, setType] = React.useState('all')

  const filtered = notifications
    .filter((n) => filter === 'all' || !n.read)
    .filter((n) => type === 'all' || n.type === type)
    .sort((a, b) => (a.time < b.time ? 1 : -1))

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Sinyal penting dari finance, content, dan shop. Dibuat dari data workspace, bukan push eksternal."
        actions={
          <>
            <Link to="/app/settings" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[11px] text-text-secondary transition-colors hover:text-text-primary">
              <Settings className="size-3.5" /> Preferensi
            </Link>
            <Button onClick={() => { markAllNotificationsRead(); push({ title: 'Semua ditandai dibaca', tone: 'success' }) }} disabled={unread === 0}>
              <CheckCheck /> Tandai semua
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Belum dibaca" value={`${unread} notifikasi`} deltaLabel={unread ? 'perlu dicek' : 'semua beres'} icon={<Bell />} tone={unread ? 'warning' : 'positive'} accent="yellow" />
        <MetricCard label="Total" value={`${notifications.length} notifikasi`} deltaLabel="tersimpan lokal" icon={<Bell />} accent="pink" />
        <MetricCard label="Finance" value={`${notifications.filter((n) => n.type === 'finance').length}`} deltaLabel="cash flow & budget" icon={<CircleDollarSign />} accent="teal" />
        <MetricCard label="Shop" value={`${notifications.filter((n) => n.type === 'shop').length}`} deltaLabel="stok & pesanan" icon={<ShoppingBag />} accent="orange" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'Semua', value: 'all' },
            { label: `Belum dibaca${unread ? ` (${unread})` : ''}`, value: 'unread' },
          ]}
        />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto min-w-[140px] text-xs">
          <option value="all">Semua tipe</option>
          <option value="finance">Finance</option>
          <option value="content">Content</option>
          <option value="shop">Shop</option>
          <option value="ai">AI</option>
          <option value="system">System</option>
        </Select>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <SectionHeader title="Inbox" description={`${filtered.length} notifikasi pada filter ini`} className="mb-0" />
          <Badge tone="outline">Lokal</Badge>
        </div>
        <div className="divide-y divide-line">
          {filtered.map((n) => {
            const meta = typeMeta[n.type]
            return (
              <div key={n.id} className={cn('flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5', !n.read && 'bg-primary/[0.02]')}>
                <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border [&_svg]:size-3.5', meta.className)}>
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('text-[12px] leading-snug', n.read ? 'text-text-secondary' : 'font-medium text-text-primary')}>{n.title}</p>
                    <Badge tone={n.type === 'finance' ? 'primary' : n.type === 'shop' ? 'warning' : n.type === 'content' ? 'info' : n.type === 'ai' ? 'primary' : 'outline'}>
                      {meta.label}
                    </Badge>
                    {!n.read ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{n.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-[9px] text-text-muted">{formatRelative(n.time)}</span>
                    {n.href ? <Link to={n.href} className="text-[10px] font-medium text-primary/80 hover:text-primary">Buka detail</Link> : null}
                    {!n.read ? (
                      <button type="button" onClick={() => markNotificationRead(n.id)} className="text-[10px] text-text-muted transition-colors hover:text-text-secondary">
                        Tandai dibaca
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <BellOff className="size-6 text-text-muted/50" />
              <p className="text-[12px] text-text-muted">Tidak ada notifikasi pada filter ini.</p>
              <p className="text-[10px] text-text-muted/70">Notifikasi baru akan muncul saat ada perubahan data.</p>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Sumber notifikasi" description="Dihubungkan ke data workspace" />
          <div className="space-y-2">
            {[
              { t: 'Cash flow & budget', d: 'Saat saldo proyeksi atau budget melewati ambang.' },
              { t: 'Stok & pesanan', d: 'Saat stok di bawah minimum atau pesanan perlu diproses.' },
              { t: 'Konten', d: 'Saat script selesai quality check atau jadwal publish tiba.' },
              { t: 'Sistem', d: 'Sinkronisasi marketplace dan perubahan pengaturan.' },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-line bg-white/[0.02] px-3 py-2.5">
                <p className="text-[11px] text-text-secondary">{x.t}</p>
                <p className="text-[10px] text-text-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Preferensi" description="Atur kanal dan frekuensi" />
          <div className="space-y-2.5">
            {[
              { t: 'Ringkasan harian', on: true, d: 'Satu ringkasan 07:00 WIB' },
              { t: 'Alert stok kritis', on: true, d: 'Langsung saat di bawah minimum' },
              { t: 'Pengingat budget', on: true, d: 'Saat pemakaian melewati 80%' },
              { t: 'Email digest', on: false, d: 'Tidak aktif pada demo' },
            ].map((p) => (
              <div key={p.t} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                <div>
                  <p className="text-[11px] text-text-secondary">{p.t}</p>
                  <p className="text-[9px] text-text-muted">{p.d}</p>
                </div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[9px]', p.on ? 'border-primary/25 bg-primary/[0.06] text-primary' : 'border-line text-text-muted')}>
                  {p.on ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
            Pada demo ini preferensi hanya ilustrasi. Ubah pengaturan nyata di halaman Settings.
          </p>
        </Card>
      </div>
    </div>
  )
}
