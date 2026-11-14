import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { agentProfiles, type AgentId } from '@/features/monitor/components/agents'
import { useAutomationStore } from '@/stores/automation-store'
import { useContentStore } from '@/stores/content-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useSellerStore } from '@/stores/seller-store'

const details: Record<AgentId, { specialty: string; skills: [string, string] }> = {
  muhe: {
    specialty:
      'Membagi task ke tiap agent, menjaga prioritas harian, dan memegang quality gate sebelum aksi dikirim.',
    skills: ['Routing & prioritas', 'Quality gate & audit'],
  },
  asep: {
    specialty:
      'Menjaga arus kas kantor, memantau budget, dan menyiapkan laporan keuangan bulanan.',
    skills: ['Budget & kas', 'Laporan'],
  },
  ucup: {
    specialty:
      'Mengurus listing marketplace, memproses order, serta menjaga stok dan harga tetap sehat.',
    skills: ['Marketplace', 'Stok & harga'],
  },
  bambang: {
    specialty:
      'Meriset tren, menyusun script, dan menjadwalkan publish konten lintas kanal.',
    skills: ['Riset & script', 'Jadwal publish'],
  },
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/50">
      {children}
    </span>
  )
}

function SubAgentCard({
  id,
  stat,
  statLabel,
}: {
  id: Exclude<AgentId, 'muhe'>
  stat: number
  statLabel: string
}) {
  const agent = agentProfiles[id]
  const { specialty, skills } = details[id]

  return (
    <Link to={agent.href} className="group block h-full">
      <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-white/[0.16]">
        <div className="flex items-start gap-3.5">
          <img
            src={agent.photo}
            alt={`Avatar ${agent.name}, ${agent.role}`}
            loading="lazy"
            className="size-[54px] shrink-0 rounded-full bg-[#262626] object-cover"
            style={{ boxShadow: `0 0 0 2px #0b0b0b, 0 0 0 3px ${agent.accent}55` }}
          />
          <div className="min-w-0 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: agent.accent }}
            >
              {agent.role}
            </p>
            <h3 className="mt-0.5 text-[17px] font-semibold leading-tight tracking-[-0.02em] text-white">
              {agent.name}
            </h3>
            <p className="mt-0.5 truncate text-[10.5px] text-white/40">{agent.duty}</p>
          </div>
          <ArrowUpRight className="ml-auto size-4 shrink-0 text-white/20 transition-colors group-hover:text-white/60" />
        </div>

        <p className="mt-3.5 text-[11.5px] leading-relaxed text-white/50">{specialty}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Chip key={skill}>{skill}</Chip>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3.5">
          <div>
            <span className="num block text-[19px] font-bold leading-none text-white">{stat}</span>
            <span className="mt-1 block text-[10px] text-white/38">{statLabel}</span>
          </div>
          <Badge tone="success">Aktif</Badge>
        </div>
      </Card>
    </Link>
  )
}

export function AgentStructure() {
  const finance = useFinanceStore()
  const shop = useSellerStore()
  const content = useContentStore()
  const automations = useAutomationStore((s) => s.items)
  const head = agentProfiles.muhe

  const stats: Record<AgentId, { value: number; label: string }> = {
    muhe: { value: automations.length, label: 'alur diorkestrasi' },
    asep: { value: finance.transactions.length, label: 'transaksi dipantau' },
    ucup: { value: shop.products.length, label: 'produk dikelola' },
    bambang: { value: content.items.length, label: 'konten dikelola' },
  }

  return (
    <section className="w-full">
      <header className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Orchestration
        </p>
        <h2 className="mt-2 text-[24px] font-extrabold tracking-[-0.03em] text-white sm:text-[28px]">
          Agent Network
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-white/50">
          Muhe mengorkestrasi tiga agent spesialis dan mendelegasikan task ke workspace
          masing-masing.
        </p>
      </header>

      <div className="mt-9">
        <Link to={head.href} className="group mx-auto block w-full max-w-[720px]">
          <Card className="relative flex flex-col gap-5 overflow-hidden p-5 transition-colors group-hover:border-white/[0.16] sm:flex-row sm:items-center sm:p-6">
            <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.06]" />

            <div className="relative flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={head.photo}
                  alt={`Avatar ${head.name}, ${head.role}`}
                  className="size-[76px] rounded-full bg-[#262626] object-cover sm:size-20"
                  style={{ boxShadow: '0 0 0 3px #0b0b0b, 0 0 0 4px rgba(245,214,75,0.55)' }}
                />
                <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-[3px] border-card bg-teal">
                  <CheckCircle2 className="size-3 text-black" strokeWidth={3} />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {head.role} · {head.duty}
                </p>
                <h3 className="mt-1 text-[22px] font-bold leading-none tracking-[-0.03em] text-white">
                  {head.name}
                </h3>
                <p className="mt-1.5 text-[11px] text-white/45">
                  Memegang quality gate seluruh workspace
                </p>
              </div>
            </div>

            <div className="relative flex flex-1 flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-1.5">
                {details.muhe.skills.map((skill) => (
                  <Chip key={skill}>{skill}</Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="num text-2xl font-bold leading-none text-white">
                  {stats.muhe.value}
                </span>
                <span className="text-[11px] text-white/40">{stats.muhe.label}</span>
                <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-white/45 transition-colors group-hover:text-white">
                  Buka automations
                  <ArrowUpRight className="size-3" />
                </span>
              </div>
            </div>
          </Card>
        </Link>

        <div aria-hidden className="relative mx-auto hidden h-16 w-full max-w-5xl lg:block">
          <span className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-white/[0.12]" />
          <span className="absolute left-[16.6667%] right-[16.6667%] top-8 h-px bg-white/[0.12]" />
          <span className="absolute left-[16.6667%] top-8 h-8 w-px bg-white/[0.12]" />
          <span className="absolute left-1/2 top-8 h-8 w-px -translate-x-1/2 bg-white/[0.12]" />
          <span className="absolute right-[16.6667%] top-8 h-8 w-px bg-white/[0.12]" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3.5 lg:mt-0 lg:grid-cols-3 lg:gap-6">
          {(['asep', 'ucup', 'bambang'] as const).map((id) => (
            <SubAgentCard
              key={id}
              id={id}
              stat={stats[id].value}
              statLabel={stats[id].label}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
