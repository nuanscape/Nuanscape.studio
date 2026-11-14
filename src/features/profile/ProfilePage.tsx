import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Film,
  Mail,
  MapPin,
  Pencil,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useAuthStore, useToastStore } from '@/stores/app-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useContentStore } from '@/stores/content-store'
import { useSellerStore } from '@/stores/seller-store'
import { contentSummary, financeSummary, goalSummary, shopMetrics } from '@/lib/metrics'
import { cn, formatDate, formatIDR, formatNumber, formatRelative } from '@/lib/utils'

export function ProfilePage() {
  const { user, updateProfile } = useAuthStore()
  const { push } = useToastStore()
  const { transactions, assets, liabilities, goals, budgets } = useFinanceStore()
  const { items, ideas } = useContentStore()
  const { products, orders, fees } = useSellerStore()
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: user.name, role: user.role, timezone: user.timezone })

  const fin = financeSummary(transactions, assets, liabilities)
  const goal = goalSummary(goals)
  const content = contentSummary(items)
  const shop = shopMetrics(products, fees)

  const published = items.filter((i) => i.status === 'Published')
  const completed = orders.filter((o) => o.status === 'Completed')

  const activity = [
    ...transactions.slice(0, 3).map((t) => ({
      id: t.id,
      icon: <Wallet className="size-3.5" />,
      title: t.note || t.category,
      meta: `${t.type === 'income' ? '+' : '-'}${formatIDR(t.amount, { compact: true })} · ${t.account}`,
      time: t.date,
      href: '/app/finance/transactions',
      tone: t.type === 'income' ? 'text-primary' : 'text-danger',
    })),
    ...published.slice(0, 2).map((i) => ({
      id: i.id,
      icon: <Film className="size-3.5" />,
      title: i.title,
      meta: `${formatNumber(i.views)} views · ${i.platform}`,
      time: i.scheduledAt,
      href: '/app/content/analytics',
      tone: 'text-info',
    })),
    ...orders.slice(0, 2).map((o) => ({
      id: o.id,
      icon: <Store className="size-3.5" />,
      title: `${o.product} · ${o.customer}`,
      meta: `${formatIDR(o.total, { compact: true })} · ${o.status}`,
      time: o.date,
      href: '/app/seller/orders',
      tone: 'text-warning',
    })),
  ]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice(0, 8)

  const badges = [
    { label: 'First workspace', done: true, desc: 'Membuka command center pertama' },
    { label: 'Budget keeper', done: budgets.length > 0, desc: 'Membuat budget pertama' },
    { label: 'Content engine', done: published.length >= 2, desc: 'Publish minimal 2 konten' },
    { label: 'Seller ready', done: products.length >= 5, desc: 'Memiliki 5 SKU' },
    { label: 'Goal getter', done: goal.progress >= 40, desc: 'Progres goal di atas 40%' },
    { label: 'Data explorer', done: transactions.length >= 10, desc: 'Mencatat 10 transaksi' },
  ]

  const save = () => {
    updateProfile(draft)
    setOpen(false)
    push({ title: 'Profil diperbarui', description: draft.name, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Identitas, ringkasan lintas workspace, dan jejak aktivitas."
        actions={
          <>
            <Link to="/app/settings" className={buttonVariants({ variant: 'secondary' })}>Settings</Link>
            <Button onClick={() => { setDraft({ name: user.name, role: user.role, timezone: user.timezone }); setOpen(true) }}>
              <Pencil /> Edit profil
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="relative flex h-full flex-col overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/[0.06] blur-2xl" />
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid size-16 place-items-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 to-info/10 text-xl font-semibold text-primary">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight text-text-primary">{user.name}</h2>
                <Badge tone="info">Studio</Badge>
              </div>
              <p className="text-[12px] text-text-secondary">{user.role}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted">
                <span className="flex items-center gap-1"><Mail className="size-3" />{user.email}</span>
                <span className="flex items-center gap-1"><MapPin className="size-3" />{user.timezone}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-3" />Bergabung {formatDate(user.joinedAt, 'MMM yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Net worth</p>
              <p className="num mt-0.5 text-[14px] text-text-primary">{formatIDR(fin.netWorth, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Konten publish</p>
              <p className="num mt-0.5 text-[14px] text-text-primary">{content.published}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Net profit shop</p>
              <p className="num mt-0.5 text-[14px] text-primary">{formatIDR(shop.netProfit, { compact: true })}</p>
            </div>
          </div>
          <div className="mt-auto pt-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">Akses workspace</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: 'Agent Monitor', color: '#F5D64B' },
                { label: 'Seller Center', color: '#F0512B' },
                { label: 'Content Production', color: '#24C7C4' },
                { label: 'Finance', color: '#F58FD9' },
              ].map((w) => (
                <span key={w.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/60">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: w.color }} />
                  {w.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Fokus saat ini" description="Dari goal dan budget aktif" action={<Link to="/app/finance/goals" className="text-[10px] text-primary">Goals</Link>} />
          <div className="space-y-3">
            {goals.slice(0, 3).map((g) => {
              const pct = g.target ? (g.saved / g.target) * 100 : 0
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-secondary">{g.name}</span>
                    <span className="num text-text-muted">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} className="mt-1 h-1.5" tone={pct >= 75 ? 'primary' : pct >= 40 ? 'info' : 'warning'} />
                  <p className="mt-0.5 text-[9px] text-text-muted">{formatIDR(g.saved, { compact: true })} dari {formatIDR(g.target, { compact: true })}</p>
                </div>
              )
            })}
            {goals.length === 0 ? <p className="text-[11px] text-text-muted">Belum ada goal.</p> : null}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2">
            <span className="text-[10px] text-text-muted">Progres semua goal</span>
            <span className="num text-[11px] text-primary">{Math.round(goal.progress)}%</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Transaksi" value={`${transactions.length}`} deltaLabel={`${budgets.length} budget`} icon={<Wallet />} accent="yellow" />
        <MetricCard label="Konten" value={`${items.length}`} deltaLabel={`${ideas.length} ide · ${content.published} publish`} icon={<Film />} accent="teal" />
        <MetricCard label="Produk" value={`${products.length} SKU`} deltaLabel={`${orders.length} pesanan`} icon={<Store />} accent="pink" />
        <MetricCard label="Pesanan selesai" value={`${completed.length}`} deltaLabel={`${formatIDR(completed.reduce((a, o) => a + o.total, 0), { compact: true })}`} icon={<CheckCircle2 />} tone="positive" accent="orange" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <SectionHeader title="Aktivitas terbaru" description="Gabungan finance, content, dan shop" className="mb-0" />
          </div>
          <div className="divide-y divide-line">
            {activity.map((a) => (
              <Link key={a.id} to={a.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.02] text-text-muted">
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-text-primary">{a.title}</p>
                  <p className={cn('text-[9px]', a.tone)}>{a.meta}</p>
                </div>
                <span className="shrink-0 text-[9px] text-text-muted">{formatRelative(a.time)}</span>
                <ArrowRight className="size-3 shrink-0 text-text-muted" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Pencapaian" description="Berdasarkan data nyata di workspace" />
          <div className="grid grid-cols-2 gap-2">
            {badges.map((b) => (
              <div key={b.label} className={cn('rounded-xl border p-3', b.done ? 'border-primary/20 bg-primary/[0.035]' : 'border-line bg-white/[0.02]')}>
                <Award className={cn('size-4', b.done ? 'text-primary' : 'text-text-muted/50')} />
                <p className={cn('mt-1.5 text-[10px] font-medium', b.done ? 'text-text-primary' : 'text-text-muted')}>{b.label}</p>
                <p className="mt-0.5 text-[9px] leading-snug text-text-muted">{b.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-white/[0.02] p-2.5">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p className="text-[10px] leading-relaxed text-text-muted">
              Pencapaian dihitung dari data lokal, bukan gamifikasi yang diverifikasi server.
            </p>
          </div>
        </Card>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit profil"
        description="Perubahan tersimpan di browser ini."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={!draft.name.trim()}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama">
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Peran">
            <Input value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
          </Field>
          <Field label="Zona waktu">
            <Select value={draft.timezone} onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}>
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
