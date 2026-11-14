import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Blocks,
  Bot,
  CheckCheck,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileBarChart2,
  Film,
  KeyRound,
  PackageSearch,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
  Zap,
} from 'lucide-react'
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { agentProfiles, type AgentId } from '@/features/monitor/components/agents'
import { useAppStore, useToastStore } from '@/stores/app-store'
import {
  defaultHeadAgentConfig,
  providerPresets,
  useApiSettingsStore,
  type ApiProvider,
} from '@/stores/api-settings-store'
import { useAutomationStore } from '@/stores/automation-store'
import { useContentStore } from '@/stores/content-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useSellerStore } from '@/stores/seller-store'
import { clamp, cn, formatIDR, formatRelative, pct } from '@/lib/utils'
import type { AppNotification } from '@/types'

type MonitorSection = 'office' | 'team' | 'automation' | 'report' | 'notifications' | 'settings'

const sectionFromPath = (pathname: string): MonitorSection => {
  if (pathname.startsWith('/app/monitor/team')) return 'team'
  if (pathname.startsWith('/app/monitor/automation')) return 'automation'
  if (pathname.startsWith('/app/monitor/report')) return 'report'
  if (pathname.startsWith('/app/monitor/notifications')) return 'notifications'
  if (pathname.startsWith('/app/monitor/settings')) return 'settings'
  return 'office'
}

const sectionMeta: Record<MonitorSection, { title: string; description: string }> = {
  office: {
    title: 'Command Center',
    description:
      'Kantor Nuanscape berjalan lewat Muhe dan tiga agent spesialis. Pantau bisnis seller, content, dan finance dari satu office.',
  },
  team: {
    title: 'Agent Team',
    description:
      'Muhe sebagai head agent memegang quality gate, dengan tiga spesialis yang menjaga finance, seller, dan content.',
  },
  automation: {
    title: 'Automation',
    description:
      'Alur otomatisasi agent dengan titik approval yang tidak bisa dilewati. Pantau status dan jalankan alur dari sini.',
  },
  report: {
    title: 'Report',
    description: 'Kumpulan laporan yang disusun Muhe dari sinyal tiga unit bisnis.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Sinyal dari finance, content, dan shop, ditambah pesan sistem.',
  },
  settings: {
    title: 'API Settings',
    description:
      'Hubungkan Muhe sebagai head agent ke provider model pilihanmu. Kunci API tersimpan lokal di perangkat ini.',
  },
}

const notifMeta: Record<
  AppNotification['type'],
  { label: string; icon: React.ElementType; accent: string }
> = {
  finance: { label: 'Finance', icon: CircleDollarSign, accent: '#F58FD9' },
  content: { label: 'Content', icon: Film, accent: '#24C7C4' },
  shop: { label: 'Shop', icon: ShoppingBag, accent: '#F0512B' },
  ai: { label: 'AI', icon: Sparkles, accent: '#F5D64B' },
  system: { label: 'System', icon: Settings2, accent: '#9CA3AF' },
}

const automationStatus = {
  active: { label: 'Aktif', tone: 'success' as const },
  paused: { label: 'Paused', tone: 'outline' as const },
  needs_approval: { label: 'Butuh approval', tone: 'warning' as const },
}

export function AgentMonitorPage() {
  const { pathname } = useLocation()
  const section = sectionFromPath(pathname)
  const meta = sectionMeta[section]

  return (
    <div className="pb-2">
      <PageHeader title={meta.title} description={meta.description} />

      <div key={section} className="page-in">
        {section === 'office' ? <OfficeSection /> : null}
        {section === 'team' ? <TeamSection /> : null}
        {section === 'automation' ? <AutomationSection /> : null}
        {section === 'report' ? <ReportSection /> : null}
        {section === 'notifications' ? <NotificationsSection /> : null}
        {section === 'settings' ? <ApiSettingsSection /> : null}
      </div>
    </div>
  )
}

function OfficeSection() {
  const finance = useFinanceStore()
  const shop = useSellerStore()
  const content = useContentStore()

  const income = finance.transactions
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount, 0)
  const expense = finance.transactions
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0)
  const net = income - expense

  const activeOrders = shop.orders.filter((o) =>
    ['Pending', 'Processing', 'Shipped'].includes(o.status),
  )
  const pendingOrders = shop.orders.filter((o) => o.status === 'Pending')
  const lowStock = shop.products.filter((p) => p.stock <= p.minStock)
  const revenue = shop.orders
    .filter((o) => !['Cancelled', 'Returned'].includes(o.status))
    .reduce((a, o) => a + o.total, 0)

  const inPipeline = content.items.filter((i) =>
    ['Researching', 'Idea', 'Approved', 'Script Ready', 'Production', 'Editing', 'Draft'].includes(
      i.status,
    ),
  )
  const inReview = content.items.filter((i) => ['Review', 'Ready to Publish'].includes(i.status))
  const published = content.items.filter((i) => i.status === 'Published')

  const healthyBudgets = finance.budgets.filter((b) => b.limit > 0 && pct(b.spent, b.limit) < 75)

  const cards = [
    {
      id: 'seller',
      agent: agentProfiles.ucup,
      icon: Store,
      intro: 'Marketplace, stok, dan order berjalan di TikTok Shop & Shopee.',
      href: '/app/seller/overview',
      stats: [
        { label: 'Order aktif', value: `${activeOrders.length}` },
        { label: 'Stok kritis', value: `${lowStock.length} SKU` },
        { label: 'Omzet', value: formatIDR(revenue, { compact: true }) },
      ],
    },
    {
      id: 'content',
      agent: agentProfiles.bambang,
      icon: Film,
      intro: 'Riset, produksi, dan distribusi konten lintas kanal.',
      href: '/app/content/overview',
      stats: [
        { label: 'Pipeline', value: `${inPipeline.length}` },
        { label: 'Review', value: `${inReview.length}` },
        { label: 'Published', value: `${published.length}` },
      ],
    },
    {
      id: 'finance',
      agent: agentProfiles.asep,
      icon: Wallet,
      intro: 'Arus kas, budget, dan kesehatan keuangan kantor.',
      href: '/app/finance/overview',
      stats: [
        { label: 'Net', value: formatIDR(net, { compact: true }) },
        { label: 'Budget sehat', value: `${healthyBudgets.length}/${finance.budgets.length}` },
        { label: 'Transaksi', value: `${finance.transactions.length}` },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <section>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <img
                  src={card.agent.photo}
                  alt={`Avatar ${card.agent.name}`}
                  loading="lazy"
                  className="size-10 shrink-0 rounded-full bg-[#262626] object-cover"
                  style={{
                    boxShadow: `0 0 0 2px #0b0b0b, 0 0 0 3px ${card.agent.accent}55`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: card.agent.accent }}
                  >
                    {card.agent.role}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-white">{card.agent.name}</p>
                </div>
                <card.icon className="size-4 shrink-0 text-white/25" />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-white/40">{card.intro}</p>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-line bg-white/[0.02] p-2.5">
                {card.stats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <p className="num truncate text-[13px] font-semibold text-white">{stat.value}</p>
                    <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.06em] text-white/35">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                to={card.href}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-white/45 transition-colors hover:text-white"
              >
                Buka workspace
                <ArrowUpRight className="size-3" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="Kondisi hari ini"
            description="Hal yang paling layak dicek dari ketiga bisnis."
          />
          <div className="divide-y divide-white/[0.05]">
            {[
              {
                icon: ShoppingBag,
                title: `${pendingOrders.length} order menunggu diproses`,
                detail: pendingOrders.length
                  ? `${Array.from(new Set(pendingOrders.map((o) => o.marketplace))).join(' · ')} · ${formatIDR(pendingOrders.reduce((a, o) => a + o.total, 0), { compact: true })}`
                  : 'Tidak ada order baru yang menunggu.',
                href: '/app/seller/orders',
              },
              {
                icon: PackageSearch,
                title: `${lowStock.length} produk di bawah stok minimum`,
                detail: lowStock.length
                  ? lowStock.slice(0, 3).map((p) => `${p.name} (${p.stock})`).join(', ')
                  : 'Semua stok di atas minimum.',
                href: '/app/seller/inventory',
              },
              {
                icon: Film,
                title: `${inReview.length} konten menunggu review`,
                detail: inReview.length ? inReview[0].title : 'Tidak ada konten di gerbang review.',
                href: '/app/content/drafts',
              },
              {
                icon: Wallet,
                title: `${finance.budgets.length - healthyBudgets.length} budget mendekati batas`,
                detail: `Net ${formatIDR(net, { compact: true })} dari ${finance.transactions.length} transaksi.`,
                href: '/app/finance/budgets',
              },
            ].map((row) => (
              <Link
                key={row.title}
                to={row.href}
                className="group flex items-center gap-3 rounded-xl px-1.5 py-2.5 transition-colors hover:bg-white/[0.035]"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/50">
                  <row.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-white/85">
                    {row.title}
                  </span>
                  <span className="block truncate text-[10.5px] text-white/35">{row.detail}</span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-white/20 transition-colors group-hover:text-white/60" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionHeader title="Ringkas bisnis" description="Indikator utama tiga unit." />
          <div className="space-y-3">
            {[
              {
                label: 'Omzet marketplace',
                value: formatIDR(revenue, { compact: true }),
                note: `${shop.orders.length} order tercatat`,
                tone: 'primary' as const,
                progress: clamp((activeOrders.length / Math.max(shop.orders.length, 1)) * 100, 6, 100),
              },
              {
                label: 'Konten published',
                value: `${published.length} / ${content.items.length}`,
                note: `${inPipeline.length} masih di pipeline`,
                tone: 'info' as const,
                progress: clamp((published.length / Math.max(content.items.length, 1)) * 100, 6, 100),
              },
              {
                label: 'Budget terpakai',
                value: `${Math.round(
                  finance.budgets.reduce((a, b) => a + pct(b.spent, b.limit), 0) /
                    Math.max(finance.budgets.length, 1),
                )}%`,
                note: `${healthyBudgets.length} budget masih sehat`,
                tone: 'warning' as const,
                progress: clamp(
                  finance.budgets.reduce((a, b) => a + pct(b.spent, b.limit), 0) /
                    Math.max(finance.budgets.length, 1),
                  6,
                  100,
                ),
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] text-white/60">{item.label}</p>
                  <p className="num text-[12px] font-semibold text-white">{item.value}</p>
                </div>
                <Progress value={item.progress} tone={item.tone} size="sm" className="mt-1.5" />
                <p className="mt-1 text-[9.5px] text-white/30">{item.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

function TeamSection() {
  const finance = useFinanceStore()
  const shop = useSellerStore()
  const content = useContentStore()
  const automations = useAutomationStore((s) => s.items)

  const lowStock = shop.products.filter((p) => p.stock <= p.minStock)
  const pendingOrders = shop.orders.filter((o) => o.status === 'Pending')
  const tightBudgets = finance.budgets.filter((b) => b.limit > 0 && pct(b.spent, b.limit) >= 75)

  const energy: Record<AgentId, number> = {
    asep: clamp(100 - tightBudgets.length * 12, 25, 100),
    ucup: clamp(100 - pendingOrders.length * 4 - lowStock.length * 6, 20, 100),
    bambang: Math.round((content.aiEnergy / Math.max(content.aiEnergyMax, 1)) * 100),
    muhe: 0,
  }
  energy.muhe = Math.round((energy.asep + energy.ucup + energy.bambang) / 3)

  const tasks: Record<AgentId, { value: number; label: string; href: string }> = {
    muhe: { value: automations.length, label: 'alur diorkestrasi', href: '/app/monitor/automation' },
    asep: {
      value: finance.transactions.length,
      label: 'transaksi dipantau',
      href: '/app/finance/overview',
    },
    ucup: { value: shop.products.length, label: 'produk dikelola', href: '/app/seller/overview' },
    bambang: { value: content.items.length, label: 'konten dikelola', href: '/app/content/overview' },
  }

  const order: AgentId[] = ['asep', 'ucup', 'bambang']

  return (
    <div className="space-y-4">
      <section>
        <Card className="relative overflow-hidden p-5">
          <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.05]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <img
                  src={agentProfiles.muhe.photo}
                  alt="Avatar Muhe, Head Agent"
                  className="size-16 rounded-full bg-[#262626] object-cover"
                  style={{ boxShadow: '0 0 0 2px #0b0b0b, 0 0 0 3px rgba(245,214,75,0.5)' }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-teal" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-white">Muhe</h3>
                  <Badge tone="primary">Head Agent</Badge>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/40">
                  Orkestrasi · quality gate · audit trail
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  {tasks.muhe.value} alur diorkestrasi · mengawasi 3 agent
                </p>
              </div>
            </div>

            <div className="flex-1 sm:pl-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-white/35">Energy</p>
                <p className="num text-[12px] font-semibold text-white">{energy.muhe}%</p>
              </div>
              <Progress value={energy.muhe} tone="primary" className="mt-1.5" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['Routing & prioritas', 'Quality gate & audit'].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {order.map((id) => {
            const agent = agentProfiles[id]
            const value = energy[id]
            const tone = value >= 60 ? 'primary' : value >= 35 ? 'warning' : 'danger'
            return (
              <Card key={id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={agent.photo}
                    alt={`Avatar ${agent.name}`}
                    loading="lazy"
                    className="size-11 shrink-0 rounded-full bg-[#262626] object-cover"
                    style={{ boxShadow: `0 0 0 2px #0b0b0b, 0 0 0 3px ${agent.accent}55` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: agent.accent }}
                    >
                      {agent.role}
                    </p>
                    <h3 className="truncate text-[14px] font-semibold text-white">{agent.name}</h3>
                    <p className="truncate text-[10px] text-white/35">{agent.duty}</p>
                  </div>
                  <Badge tone="success" className="shrink-0">
                    Aktif
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[9.5px] uppercase tracking-[0.1em] text-white/35">
                      Sisa energy
                    </p>
                    <p className="num text-[11px] font-semibold text-white">{value}%</p>
                  </div>
                  <Progress value={value} tone={tone} size="sm" className="mt-1.5" />
                </div>

                <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
                  <div>
                    <p className="num text-[18px] font-bold leading-none text-white">
                      {tasks[id].value}
                    </p>
                    <p className="mt-1 text-[9.5px] text-white/35">{tasks[id].label}</p>
                  </div>
                  <Link
                    to={tasks[id].href}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-white/45 transition-colors hover:text-white"
                  >
                    Workspace
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

type AutomationFlowNodeData = {
  label: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
}
type AutomationFlowNode = Node<AutomationFlowNodeData, 'automation'>

function AutomationFlowNodeCard({ data }: NodeProps<AutomationFlowNode>) {
  const Icon = data.icon
  return (
    <div className="flex w-[188px] items-center gap-3 rounded-xl border border-line bg-card p-3">
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-white/15 !opacity-0" />
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/[0.12] text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-white">{data.label}</p>
        <p className="truncate text-[10px] text-white/40">{data.detail}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-white/15 !opacity-0" />
    </div>
  )
}

const automationNodeTypes = { automation: AutomationFlowNodeCard }

function AutomationSection() {
  const automations = useAutomationStore((s) => s.items)
  const approve = useAutomationStore((s) => s.approve)
  const pause = useAutomationStore((s) => s.pause)
  const runNow = useAutomationStore((s) => s.runNow)
  const { push } = useToastStore()

  const pending = automations.filter((a) => a.status === 'needs_approval')
  const activeCount = automations.filter((a) => a.status === 'active').length

  const flow = [
    { label: 'Trigger', detail: 'Jadwal, event, atau pesan', icon: Zap },
    { label: 'Agent', detail: 'Muhe membagi task', icon: Bot },
    { label: 'Approval', detail: 'Gerbang keputusanmu', icon: ShieldCheck },
    { label: 'Aksi', detail: 'Eksekusi & audit log', icon: Blocks },
  ]

  const flowNodes: AutomationFlowNode[] = flow.map((node, index) => ({
    id: node.label,
    type: 'automation',
    position: { x: index * 236, y: 0 },
    data: { label: node.label, detail: node.detail, icon: node.icon },
  }))

  const flowEdges: Edge[] = flow.slice(1).map((node, index) => ({
    id: `${flow[index].label}-${node.label}`,
    source: flow[index].label,
    target: node.label,
    type: 'smoothstep',
    style: { stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: 'rgba(255,255,255,0.28)',
    },
  }))

  return (
    <div className="space-y-4">
      <section>
        <Card className="overflow-hidden p-0">
          <div className="h-[220px] w-full">
            <ReactFlow
              defaultNodes={flowNodes}
              defaultEdges={flowEdges}
              nodeTypes={automationNodeTypes}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.5}
              maxZoom={1.2}
              zoomOnScroll={false}
              zoomOnDoubleClick={false}
              zoomOnPinch={false}
              nodesConnectable={false}
              preventScrolling={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1}
                color="rgba(255,255,255,0.05)"
              />
            </ReactFlow>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-line px-4 py-4 sm:px-5">
            <div>
              <p className="num text-[20px] font-bold leading-none text-white">{automations.length}</p>
              <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.08em] text-white/35">
                Total alur
              </p>
            </div>
            <div>
              <p className="num text-[20px] font-bold leading-none text-teal">{activeCount}</p>
              <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.08em] text-white/35">Aktif</p>
            </div>
            <div>
              <p className="num text-[20px] font-bold leading-none text-yellow">{pending.length}</p>
              <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.08em] text-white/35">
                Butuh approval
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Daftar alur" description="Status, run, dan success rate tiap automation." />
        <Card className="divide-y divide-white/[0.05] p-2 sm:p-3">
          {automations.map((a) => {
            const meta = automationStatus[a.status]
            return (
              <div key={a.id} className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-white/90">{a.name}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Badge tone="outline">{a.module}</Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10.5px] text-white/35">
                    {a.trigger} · {a.runs} run · {a.successRate}% sukses · terakhir{' '}
                    {formatRelative(a.lastRun)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.status === 'needs_approval' ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          pause(a.id)
                          push({ title: 'Ditunda', description: a.name, tone: 'info' })
                        }}
                      >
                        <Pause /> Tunda
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          approve(a.id)
                          push({
                            title: 'Disetujui',
                            description: `${a.name} otomatis berjalan.`,
                            tone: 'success',
                          })
                        }}
                      >
                        Setujui
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        runNow(a.id)
                        push({ title: 'Automation dijalankan', description: a.name, tone: 'success' })
                      }}
                    >
                      <Play /> Run now
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {!automations.length ? (
            <p className="px-2 py-8 text-center text-[11.5px] text-white/40">
              Belum ada automation.
            </p>
          ) : null}
        </Card>
      </section>
    </div>
  )
}

function ReportSection() {
  const finance = useFinanceStore()
  const shop = useSellerStore()
  const content = useContentStore()
  const automations = useAutomationStore((s) => s.items)

  const income = finance.transactions
    .filter((t) => t.type === 'income')
    .reduce((a, t) => a + t.amount, 0)
  const expense = finance.transactions
    .filter((t) => t.type === 'expense')
    .reduce((a, t) => a + t.amount, 0)
  const net = income - expense
  const pendingOrders = shop.orders.filter((o) => o.status === 'Pending')
  const lowStock = shop.products.filter((p) => p.stock <= p.minStock)
  const published = content.items.filter((i) => i.status === 'Published')
  const views = content.items.reduce((a, i) => a + i.views, 0)
  const engagement = content.items.length
    ? content.items.reduce((a, i) => a + i.engagement, 0) / content.items.length
    : 0
  const approvals = automations.filter((a) => a.status === 'needs_approval')

  const reports = [
    {
      id: 'daily',
      title: 'Daily briefing',
      summary: `${pendingOrders.length} order menunggu, ${lowStock.length} stok kritis, ${approvals.length} automation butuh approval. Prioritas hari ini: rapikan order lalu restock.`,
      time: 'Hari ini · 07:00',
      tone: approvals.length ? ('warning' as const) : ('success' as const),
      status: approvals.length ? 'Perlu perhatian' : 'Terkendali',
      href: '/app/monitor/automation',
      icon: BellRing,
    },
    {
      id: 'weekly',
      title: 'Weekly business review',
      summary: `Net ${formatIDR(net, { compact: true })} dari ${finance.transactions.length} transaksi. Omzet marketplace ${formatIDR(
        shop.orders.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).reduce((a, o) => a + o.total, 0),
        { compact: true },
      )} dengan ${shop.orders.length} order tercatat.`,
      time: 'Minggu ini',
      tone: 'info' as const,
      status: 'Siap',
      href: '/app/finance/reports',
      icon: FileBarChart2,
    },
    {
      id: 'finance',
      title: 'Finance health check',
      summary: `Pendapatan ${formatIDR(income, { compact: true })} vs pengeluaran ${formatIDR(expense, { compact: true })}. ${
        finance.budgets.filter((b) => b.limit > 0 && pct(b.spent, b.limit) >= 75).length
      } budget di atas 75% dan perlu penyesuaian.`,
      time: 'Hari ini · 06:30',
      tone: net >= 0 ? ('success' as const) : ('danger' as const),
      status: net >= 0 ? 'Sehat' : 'Defisit',
      href: '/app/finance/overview',
      icon: Wallet,
    },
    {
      id: 'seller',
      title: 'Seller operations',
      summary: `${lowStock.length} SKU di bawah minimum dan ${pendingOrders.length} order baru. Agent Ucup menyarankan restock sebelum campaign berikutnya.`,
      time: 'Hari ini · 08:00',
      tone: lowStock.length ? ('warning' as const) : ('success' as const),
      status: lowStock.length ? 'Perlu restock' : 'Aman',
      href: '/app/seller/overview',
      icon: Store,
    },
    {
      id: 'content',
      title: 'Content performance',
      summary: `${published.length} konten published dengan ${views.toLocaleString('id-ID')} views dan engagement rata-rata ${engagement.toFixed(1)}%. Bambang menandai 2 format untuk diulang.`,
      time: 'Hari ini · 09:00',
      tone: 'info' as const,
      status: 'Siap',
      href: '/app/content/agent-report',
      icon: Film,
    },
  ]

  return (
    <div className="space-y-4">
      <section>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary">
                  <report.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-white">{report.title}</p>
                    <Badge tone={report.tone}>{report.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.08em] text-white/30">
                    {report.time}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-[11.5px] leading-relaxed text-white/50">
                {report.summary}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[10px] text-white/30">Laporan otomatis dari data live</span>
                <Link
                  to={report.href}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-white/55 transition-colors hover:text-white"
                >
                  Buka detail
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

function NotificationsSection() {
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead)
  const { push } = useToastStore()
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')

  const unread = notifications.filter((n) => !n.read).length
  const sorted = [...notifications]
    .filter((n) => filter === 'all' || !n.read)
    .sort((a, b) => (a.time < b.time ? 1 : -1))

  return (
    <div className="space-y-4">
      <section>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(notifMeta) as AppNotification['type'][]).map((type) => {
            const meta = notifMeta[type]
            const count = notifications.filter((n) => n.type === type && !n.read).length
            return (
              <Card key={type} className="p-3">
                <div className="flex items-center gap-2">
                  <meta.icon className="size-3.5" style={{ color: meta.accent }} />
                  <p className="text-[10px] uppercase tracking-[0.08em] text-white/35">
                    {meta.label}
                  </p>
                </div>
                <p className="num mt-1.5 text-[18px] font-bold leading-none text-white">{count}</p>
                <p className="mt-1 text-[9.5px] text-white/30">belum dibaca</p>
              </Card>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-full border border-line bg-white/[0.02] p-0.5">
            {(['all', 'unread'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                  filter === value ? 'bg-primary/[0.14] text-primary' : 'text-white/50',
                )}
              >
                {value === 'all' ? 'Semua' : `Belum dibaca${unread ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!unread}
            onClick={() => {
              markAllNotificationsRead()
              push({ title: 'Semua ditandai dibaca', tone: 'success' })
            }}
          >
            <CheckCheck /> Tandai semua
          </Button>
        </div>

        <Card className="mt-3 divide-y divide-white/[0.05] p-2">
          {sorted.map((n) => {
            const meta = notifMeta[n.type]
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className="ring-focus flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-white/[0.035]"
              >
                <span
                  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border"
                  style={{
                    borderColor: `${meta.accent}33`,
                    backgroundColor: `${meta.accent}14`,
                    color: meta.accent,
                  }}
                >
                  <meta.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[12px] font-medium text-white/90">{n.title}</span>
                    {!n.read ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-relaxed text-white/40">
                    {n.message}
                  </span>
                  <span className="mt-1 block text-[9.5px] text-white/25">
                    {meta.label} · {formatRelative(n.time)}
                  </span>
                </span>
                {!n.read ? <span className="mt-1 text-[9px] text-primary">Baru</span> : null}
              </button>
            )
          })}
          {!sorted.length ? (
            <p className="px-2 py-10 text-center text-[11.5px] text-white/40">
              Tidak ada notifikasi pada filter ini.
            </p>
          ) : null}
        </Card>
      </section>
    </div>
  )
}

function ApiSettingsSection() {
  const { push } = useToastStore()
  const { headAgent, status, lastCheckedAt, saveHeadAgent, setStatus, resetHeadAgent } =
    useApiSettingsStore()
  const [draft, setDraft] = React.useState(headAgent)
  const [showKey, setShowKey] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const patch = (next: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...next }))

  const changeProvider = (provider: ApiProvider) => {
    if (provider === 'custom') {
      patch({ provider })
      return
    }
    const preset = providerPresets[provider]
    patch({ provider, baseUrl: preset.baseUrl, model: preset.model })
  }

  const save = () => {
    if (!draft.baseUrl.trim()) {
      push({ title: 'Base URL wajib diisi', tone: 'warning' })
      return
    }
    if (!/^https?:\/\//i.test(draft.baseUrl.trim())) {
      push({ title: 'Base URL harus diawali http:// atau https://', tone: 'warning' })
      return
    }
    if (!draft.model.trim()) {
      push({ title: 'Model wajib diisi', tone: 'warning' })
      return
    }
    saveHeadAgent({
      ...draft,
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
      apiKey: draft.apiKey.trim(),
    })
    push({ title: 'API head agent disimpan', description: draft.model.trim(), tone: 'success' })
  }

  const testConnection = async () => {
    if (!draft.apiKey.trim()) {
      setStatus('error')
      push({ title: 'API key belum diisi', tone: 'warning' })
      return
    }
    setTesting(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setTesting(false)
    setStatus('connected')
    push({ title: 'Koneksi API terverifikasi', description: 'Mode demo: tidak ada request ke provider.', tone: 'success' })
  }

  const reset = () => {
    resetHeadAgent()
    setDraft(defaultHeadAgentConfig)
    push({ title: 'API head agent dikembalikan ke default', tone: 'info' })
  }

  const statusMeta =
    status === 'connected'
      ? { label: 'Terhubung', tone: 'success' as const }
      : status === 'error'
        ? { label: 'Gagal', tone: 'danger' as const }
        : { label: 'Belum diuji', tone: 'outline' as const }

  return (
    <div className="space-y-4">
      <section>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <h3 className="text-[13px] font-semibold text-white">Koneksi API head agent</h3>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3">
              <img
                src={agentProfiles.muhe.photo}
                alt={agentProfiles.muhe.name}
                className="size-10 shrink-0 rounded-lg border border-line object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white/90">
                  {agentProfiles.muhe.name} · {agentProfiles.muhe.role}
                </p>
                <p className="text-[10px] text-white/40">{agentProfiles.muhe.duty}</p>
              </div>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Provider">
                  <Select value={draft.provider} onChange={(e) => changeProvider(e.target.value as ApiProvider)}>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="custom">Custom / self-hosted</option>
                  </Select>
                </Field>
                <Field label="Model">
                  <Input
                    value={draft.model}
                    onChange={(e) => patch({ model: e.target.value })}
                    placeholder="gpt-4o-mini"
                  />
                </Field>
              </div>

              <Field label="Base URL" hint="Endpoint OpenAI-compatible yang dipakai head agent.">
                <Input
                  value={draft.baseUrl}
                  onChange={(e) => patch({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  spellCheck={false}
                />
              </Field>

              <Field label="API key" hint="Disimpan lokal di browser ini, tidak dikirim ke mana pun.">
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={draft.apiKey}
                    onChange={(e) => patch({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    autoComplete="off"
                    spellCheck={false}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                    className="ring-focus absolute right-1 top-1 grid size-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Temperature">
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={draft.temperature}
                    onChange={(e) => patch({ temperature: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max tokens">
                  <Input
                    type="number"
                    min={256}
                    max={128000}
                    step={256}
                    value={draft.maxTokens}
                    onChange={(e) => patch({ maxTokens: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="Instruksi sistem" hint="Konteks dasar yang dikirim ke head agent.">
                <Textarea
                  value={draft.systemPrompt}
                  onChange={(e) => patch({ systemPrompt: e.target.value })}
                  className="min-h-[84px]"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={save}>
                  <Save /> Simpan
                </Button>
                <Button variant="secondary" size="sm" onClick={testConnection} loading={testing}>
                  <Zap /> Test koneksi
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw /> Reset
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-teal" />
                <h3 className="text-[13px] font-semibold text-white">Status koneksi</h3>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-[11px] text-white/40">Provider</span>
                  <span className="text-[11px] text-white/75">
                    {draft.provider === 'custom' ? 'Custom' : providerPresets[draft.provider].label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-[11px] text-white/40">Status</span>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                  <span className="text-[11px] text-white/40">Kredensial</span>
                  <span className="text-[11px] text-white/75">
                    {headAgent.apiKey ? 'Tersimpan lokal' : 'Belum diisi'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/40">Terakhir diuji</span>
                  <span className="text-[11px] text-white/75">
                    {lastCheckedAt ? formatRelative(lastCheckedAt) : '—'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <h3 className="text-[13px] font-semibold text-white">Cakupan head agent</h3>
              </div>
              <div className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-white/45">
                <p className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  Mengorkestrasi Finance, Seller, dan Content Agent.
                </p>
                <p className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  Semua aksi yang mengubah data tetap menunggu approval.
                </p>
                <p className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  Kunci API hanya tersimpan di perangkat ini.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

