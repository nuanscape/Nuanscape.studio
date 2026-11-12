import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Blocks,
  CheckCircle2,
  Film,
  PackageSearch,
  ShieldCheck,
  Store,
  Wallet,
} from 'lucide-react'
import { MetricCard, PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Badge, Dot } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AgentStructure } from '@/features/monitor/components/agent-structure'
import { agentProfiles, type AgentProfile } from '@/features/monitor/components/agents'
import { automations } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useSellerStore } from '@/stores/seller-store'
import { cn, formatDate, formatIDR, formatRelative, pct } from '@/lib/utils'

type Urgency = 'Tinggi' | 'Sedang' | 'Rendah'

type Task = {
  id: string
  title: string
  detail: string
  href: string
  agent: AgentProfile
  urgency: Urgency
  icon: React.ElementType
}

const urgencyTone: Record<Urgency, 'danger' | 'warning' | 'default'> = {
  Tinggi: 'danger',
  Sedang: 'warning',
  Rendah: 'default',
}

const connectionTone = {
  connected: 'success',
  syncing: 'info',
  error: 'danger',
  disconnected: 'outline',
} as const

const connectionLabel = {
  connected: 'Terhubung',
  syncing: 'Sinkron',
  error: 'Gagal',
  disconnected: 'Terputus',
} as const

export function AgentMonitorPage() {
  const finance = useFinanceStore()
  const shop = useSellerStore()
  const content = useContentStore()

  const income = finance.transactions
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount, 0)
  const expense = finance.transactions
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0)
  const financeNet = income - expense

  const activeOrders = shop.orders.filter((o) =>
    ['Pending', 'Processing', 'Shipped'].includes(o.status),
  )
  const pendingOrders = shop.orders.filter((o) => o.status === 'Pending')
  const lowStock = shop.products.filter((p) => p.stock <= p.minStock)
  const activeProducts = shop.products.filter((p) => p.status === 'Active')

  const inPipeline = content.items.filter((i) =>
    ['Researching', 'Idea', 'Approved', 'Script Ready', 'Production', 'Editing', 'Draft'].includes(
      i.status,
    ),
  )
  const inReview = content.items.filter((i) => ['Review', 'Ready to Publish'].includes(i.status))
  const published = content.items.filter((i) => i.status === 'Published')

  const approvals = automations.filter((a) => a.status === 'needs_approval')
  const tightBudgets = finance.budgets
    .filter((b) => b.limit > 0 && pct(b.spent, b.limit) >= 75)
    .sort((a, b) => pct(b.spent, b.limit) - pct(a.spent, a.limit))

  const signals = approvals.length + lowStock.length + inReview.length + pendingOrders.length
  const briefing = signals
    ? `Ada ${signals} hal yang butuh keputusanmu hari ini. Aku sudah mengelompokkan per unit kerja, mulai dari yang paling mendesak.`
    : 'Semua unit kerja hijau. Aku lanjut memantau sinyal dan akan mengabari kalau ada yang perlu tanganmu.'

  type Focus = { label: string; meta: string; href: string; icon: React.ElementType }
  const focus: Focus[] = []
  if (approvals.length) {
    focus.push({
      label: `Setujui ${approvals.length} automation`,
      meta: approvals[0].name,
      href: '/app/automations',
      icon: ShieldCheck,
    })
  }
  if (lowStock.length) {
    focus.push({
      label: `Restock ${lowStock.length} produk`,
      meta: lowStock.slice(0, 2).map((p) => p.name).join(', '),
      href: '/app/seller/inventory',
      icon: PackageSearch,
    })
  }
  if (inReview.length) {
    focus.push({
      label: `Review ${inReview.length} konten`,
      meta: inReview[0].title,
      href: '/app/content/drafts',
      icon: Film,
    })
  }
  if (tightBudgets.length) {
    focus.push({
      label: `Cek budget ${tightBudgets[0].category}`,
      meta: `${Math.round(pct(tightBudgets[0].spent, tightBudgets[0].limit))}% terpakai`,
      href: '/app/finance/budgets',
      icon: Wallet,
    })
  }
  const focusItems = focus.slice(0, 3)

  const tasks: Task[] = []
  approvals.slice(0, 1).forEach((a) => {
    tasks.push({
      id: `approval-${a.id}`,
      title: `Setujui "${a.name}"`,
      detail: `Automation ${a.module} · ${a.trigger}`,
      href: '/app/automations',
      agent: agentProfiles.muhe,
      urgency: 'Tinggi',
      icon: ShieldCheck,
    })
  })
  lowStock.slice(0, 2).forEach((p) => {
    tasks.push({
      id: `stock-${p.id}`,
      title: `Restock ${p.name}`,
      detail: `Stok ${p.stock} · minimum ${p.minStock} · ${p.marketplace}`,
      href: '/app/seller/inventory',
      agent: agentProfiles.ucup,
      urgency: 'Tinggi',
      icon: PackageSearch,
    })
  })
  if (pendingOrders.length) {
    const markets = Array.from(new Set(pendingOrders.map((o) => o.marketplace))).join(' · ')
    tasks.push({
      id: 'pending-orders',
      title: `Proses ${pendingOrders.length} order baru`,
      detail: `Menunggu diproses · ${markets}`,
      href: '/app/seller/orders',
      agent: agentProfiles.ucup,
      urgency: 'Sedang',
      icon: Store,
    })
  }
  inReview.slice(0, 1).forEach((c) => {
    tasks.push({
      id: `content-${c.id}`,
      title: `Review "${c.title}"`,
      detail: `${c.platform} · ${c.status} · ${formatDate(c.scheduledAt, 'd MMM')}`,
      href: '/app/content/drafts',
      agent: agentProfiles.bambang,
      urgency: 'Sedang',
      icon: Film,
    })
  })
  tightBudgets.slice(0, 1).forEach((b) => {
    tasks.push({
      id: `budget-${b.id}`,
      title: `Budget ${b.category} ${Math.round(pct(b.spent, b.limit))}%`,
      detail: `Terpakai ${formatIDR(b.spent, { compact: true })} dari ${formatIDR(b.limit, { compact: true })}`,
      href: '/app/finance/budgets',
      agent: agentProfiles.asep,
      urgency: 'Rendah',
      icon: Wallet,
    })
  })
  const taskQueue = tasks.slice(0, 6)

  const units = [
    {
      agent: agentProfiles.asep,
      stats: [
        { label: 'Net', value: formatIDR(financeNet, { compact: true }) },
        { label: 'Budget', value: `${finance.budgets.length - tightBudgets.length}/${finance.budgets.length}` },
        { label: 'Transaksi', value: finance.transactions.length },
      ],
    },
    {
      agent: agentProfiles.ucup,
      stats: [
        { label: 'Order aktif', value: activeOrders.length },
        { label: 'Stok kritis', value: lowStock.length },
        { label: 'Produk aktif', value: activeProducts.length },
      ],
    },
    {
      agent: agentProfiles.bambang,
      stats: [
        { label: 'Pipeline', value: inPipeline.length },
        { label: 'Review', value: inReview.length },
        { label: 'Published', value: published.length },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-6 pb-2">
      <PageHeader
        title="Command Center"
        description="Kantor Nuanscape berjalan lewat Muhe dan tiga agent spesialis. Mereka bekerja mandiri, tapi keputusan yang menyentuh uang, stok, dan publish selalu berhenti di approval kamu."
        actions={
          <>
            <Link to="/app/notifications" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <Bell />
              Notifikasi
            </Link>
            <Link to="/app/automations" className={buttonVariants({ size: 'sm' })}>
              <Blocks />
              Automations
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="yellow"
          label="Net finance"
          value={formatIDR(financeNet, { compact: true })}
          deltaLabel="pendapatan − pengeluaran"
          icon={<Wallet />}
        />
        <MetricCard
          accent="orange"
          label="Order aktif"
          value={`${activeOrders.length} order`}
          deltaLabel={`${pendingOrders.length} menunggu diproses`}
          icon={<Store />}
        />
        <MetricCard
          accent="pink"
          label="Stok kritis"
          value={`${lowStock.length} SKU`}
          deltaLabel={lowStock.length ? 'perlu restock segera' : 'semua stok aman'}
          icon={<PackageSearch />}
        />
        <MetricCard
          accent="teal"
          label="Pipeline konten"
          value={`${inPipeline.length} item`}
          deltaLabel={`${inReview.length} menunggu review`}
          icon={<Film />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.05]" />
          <div className="relative flex items-start gap-3.5">
            <div className="relative shrink-0">
              <img
                src={agentProfiles.muhe.photo}
                alt="Avatar Muhe, Head Agent"
                className="size-14 rounded-full bg-[#262626] object-cover"
                style={{ boxShadow: '0 0 0 2px #0b0b0b, 0 0 0 3px rgba(245,214,75,0.5)' }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold tracking-[-0.02em] text-white">Muhe</h2>
                <Badge tone="primary">Head Agent</Badge>
                <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-white/40 sm:inline-flex">
                  <Dot className="animate-pulse bg-teal" />
                  Online
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-white/40">
                Mengawasi Asep, Ucup, dan Bambang
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/65">{briefing}</p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-col gap-0.5 border-t border-line pt-3">
            {focusItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                to={item.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/55">
                  <item.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-white/85">
                    {item.label}
                  </span>
                  <span className="block truncate text-[10.5px] text-white/35">{item.meta}</span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-white/25 transition-colors group-hover:text-white/60" />
              </Link>
            ))}
            {!focusItems.length ? (
              <p className="py-2 text-[11.5px] text-white/40">
                Tidak ada yang mendesak. Semua unit kerja berjalan normal.
              </p>
            ) : null}
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Link to="/app/automations" className={buttonVariants({ size: 'sm' })}>
              Buka automations
              <ArrowRight />
            </Link>
            <Link
              to="/app/notifications"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Semua sinyal
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-bold tracking-[-0.02em] text-white">
              Butuh persetujuanmu
            </h2>
            <Badge tone={approvals.length ? 'warning' : 'success'}>
              {approvals.length ? `${approvals.length} tertunda` : 'Bersih'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Agent berhenti di gerbang ini. Tidak ada aksi eksternal tanpa izinmu.
          </p>

          <div className="mt-3.5 flex flex-1 flex-col gap-2">
            {approvals.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                to="/app/automations"
                className="group rounded-xl border border-yellow/[0.14] bg-yellow/[0.04] p-3 transition-colors hover:border-yellow/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-semibold text-white">{a.name}</p>
                  <span className="shrink-0 text-[10px] font-medium text-yellow">Review</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-white/45">
                  {a.trigger} · {a.module}
                </p>
              </Link>
            ))}
            {!approvals.length ? (
              <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-teal/[0.14] bg-teal/[0.04] p-3 text-[11.5px] text-teal">
                <CheckCircle2 className="size-4 shrink-0" />
                Semua automation sudah disetujui.
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Unit kerja"
          description="Tiga agent spesialis, satu arah laporan ke Muhe."
          action={
            <Link
              to="/app/automations"
              className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-white/50 transition-colors hover:text-white sm:inline-flex"
            >
              Semua workspace
              <ArrowRight className="size-3" />
            </Link>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          {units.map(({ agent, stats }) => (
            <Card key={agent.id} className="flex flex-col p-4">
              <div className="flex items-center gap-3">
                <img
                  src={agent.photo}
                  alt={`Avatar ${agent.name}, ${agent.role}`}
                  loading="lazy"
                  className="size-10 shrink-0 rounded-full bg-[#262626] object-cover"
                  style={{ boxShadow: `0 0 0 2px #0b0b0b, 0 0 0 3px ${agent.accent}55` }}
                />
                <div className="min-w-0">
                  <p
                    className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: agent.accent }}
                  >
                    {agent.role}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-white">
                    {agent.name} · {agent.duty}
                  </p>
                </div>
                <Badge tone="success" className="ml-auto shrink-0">
                  Aktif
                </Badge>
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-line pt-3">
                {stats.map((s) => (
                  <div key={s.label} className="min-w-0">
                    <p className="num truncate text-[13px] font-semibold text-white">{s.value}</p>
                    <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.06em] text-white/35">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                to={agent.href}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-white/45 transition-colors hover:text-white"
              >
                Buka workspace
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0">
          <SectionHeader
            title="Antrean kerja"
            description="Task yang sedang dikerjakan dan yang menunggu giliran."
            action={<span className="shrink-0 text-[10.5px] text-white/35">{taskQueue.length} task</span>}
          />
          <Card className="p-2 sm:p-3">
            <div className="divide-y divide-white/[0.05]">
              {taskQueue.map((task) => (
                <Link
                  key={task.id}
                  to={task.href}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.035]"
                >
                  <img
                    src={task.agent.photo}
                    alt=""
                    loading="lazy"
                    className="size-8 shrink-0 rounded-full bg-[#262626] object-cover"
                    style={{ boxShadow: `0 0 0 2px ${task.agent.accent}30` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-white/90">{task.title}</p>
                    <p className="truncate text-[10.5px] text-white/38">
                      {task.agent.name} · {task.detail}
                    </p>
                  </div>
                  <Badge tone={urgencyTone[task.urgency]} className="hidden shrink-0 sm:inline-flex">
                    {task.urgency}
                  </Badge>
                  <task.icon className="size-4 shrink-0 text-white/25 transition-colors group-hover:text-white/55" />
                </Link>
              ))}
              {!taskQueue.length ? (
                <p className="px-2 py-8 text-center text-[11.5px] text-white/40">
                  Antrean kosong — semua unit kerja santai.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold tracking-[-0.02em] text-white">Budget</h2>
              <Link
                to="/app/finance/budgets"
                className="text-[10px] font-medium text-white/40 transition-colors hover:text-white"
              >
                Kelola
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {tightBudgets.slice(0, 3).map((b) => {
                const used = Math.min(pct(b.spent, b.limit), 100)
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-white/70">{b.category}</span>
                      <span
                        className={cn(
                          'num shrink-0 font-medium',
                          used >= 90 ? 'text-orange' : 'text-yellow',
                        )}
                      >
                        {Math.round(used)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={cn('h-full rounded-full', used >= 90 ? 'bg-orange' : 'bg-yellow')}
                        style={{ width: `${used}%` }}
                      />
                    </div>
                    <p className="num mt-1 text-[9.5px] text-white/30">
                      {formatIDR(b.spent, { compact: true })} / {formatIDR(b.limit, { compact: true })}
                    </p>
                  </div>
                )
              })}
              {!tightBudgets.length ? (
                <p className="text-[11px] text-white/40">Semua budget di bawah 75%.</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold tracking-[-0.02em] text-white">
                Sinkronisasi marketplace
              </h2>
              <Link
                to="/app/seller/marketplaces"
                className="text-[10px] font-medium text-white/40 transition-colors hover:text-white"
              >
                Detail
              </Link>
            </div>
            <div className="mt-2 flex flex-col">
              {shop.connections.map((c) => (
                <Link
                  key={c.id}
                  to="/app/seller/marketplaces"
                  className="flex items-center gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <Dot
                    className={cn(
                      c.status === 'connected' && 'bg-teal',
                      c.status === 'syncing' && 'bg-info',
                      c.status === 'error' && 'bg-orange',
                      c.status === 'disconnected' && 'bg-white/25',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-white/85">{c.name}</p>
                    <p className="truncate text-[10px] text-white/35">
                      {c.storeName} · {formatRelative(c.lastSync)}
                    </p>
                  </div>
                  <Badge tone={connectionTone[c.status]} className="shrink-0">
                    {connectionLabel[c.status]}
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <AgentStructure />

      <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" />
        <p className="text-[11px] leading-relaxed text-white/40">
          Muhe menjalankan tugas operasional secara mandiri, tapi aksi yang mengubah uang, stok, atau
          publish konten selalu berhenti di approval kamu. Setiap langkah tercatat di audit trail.
        </p>
      </div>
    </div>
  )
}
