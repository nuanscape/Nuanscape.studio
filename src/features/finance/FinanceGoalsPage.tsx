import * as React from 'react'
import { CalendarClock, Plus, Target, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GoalModal, ContributeModal } from '@/features/finance/components/goal-modals'
import { useFinanceStore } from '@/stores/finance-store'
import { goalSummary } from '@/lib/metrics'
import { formatDate, formatIDR } from '@/lib/utils'

export function FinanceGoalsPage() {
  const { goals } = useFinanceStore()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [contributeId, setContributeId] = React.useState<string | null>(null)
  const summary = goalSummary(goals)
  const selected = goals.find((g) => g.id === contributeId)

  const monthlyNeed = goals.reduce((acc, g) => {
    const months = Math.max(
      1,
      Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)),
    )
    return acc + Math.max(0, (g.target - g.saved) / months)
  }, 0)

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Rencanakan tujuan finansial dan lacak progresnya secara otomatis."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Goal baru
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total target" value={formatIDR(summary.target)} deltaLabel={`${goals.length} goal aktif`} icon={<Target />} accent="yellow" />
        <MetricCard label="Terkumpul" value={formatIDR(summary.saved)} deltaLabel={`${summary.progress.toFixed(1)}% progres`} icon={<Wallet />} tone="positive" accent="teal" />
        <MetricCard label="Sisa target" value={formatIDR(summary.target - summary.saved)} deltaLabel="menuju semua goal" icon={<TrendingUp />} accent="orange" />
        <MetricCard label="Kebutuhan / bulan" value={formatIDR(monthlyNeed)} deltaLabel="estimasi berbasis deadline" icon={<CalendarClock />} tone="warning" accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = Math.min(100, (goal.saved / goal.target) * 100)
            const remaining = Math.max(0, goal.target - goal.saved)
            const days = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000)
            const months = Math.max(1, Math.ceil(days / 30))
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2.5 rounded-full" style={{ backgroundColor: goal.color }} />
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-primary">{goal.name}</h3>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        Target {formatIDR(goal.target)} · deadline {formatDate(goal.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={days < 30 ? 'warning' : 'outline'}>{days < 0 ? 'Lewat deadline' : `${days} hari lagi`}</Badge>
                    <Button size="sm" variant="soft" onClick={() => setContributeId(goal.id)}>
                      <Plus /> Setor
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="num text-text-primary">{formatIDR(goal.saved)}</span>
                      <span className="text-text-muted">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="mt-2" tone={progress >= 100 ? 'primary' : undefined} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-2">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Sisa</p>
                      <p className="num mt-0.5 text-[12px] text-text-primary">{formatIDR(remaining, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">/ bulan</p>
                      <p className="num mt-0.5 text-[12px] text-primary">{formatIDR(remaining / months, { compact: true })}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          <button
            onClick={() => setCreateOpen(true)}
            className="ring-focus flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white/[0.01] py-5 text-[11px] font-medium text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary"
          >
            <Plus className="size-4" /> Tambah goal baru
          </button>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Progres keseluruhan" description="Semua goal aktif" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">Terkumpul</span>
              <span className="num text-text-primary">{formatIDR(summary.saved)}</span>
            </div>
            <Progress value={summary.progress} className="mt-2" />
            <p className="mt-2 text-[10px] text-text-muted">
              {summary.progress.toFixed(1)}% dari total target {formatIDR(summary.target, { compact: true })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Goal selesai</p>
                <p className="num mt-1 text-[14px] text-text-primary">{goals.filter((g) => g.saved >= g.target).length}</p>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Goal aktif</p>
                <p className="num mt-1 text-[14px] text-text-primary">{goals.filter((g) => g.saved < g.target).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Cara AI menghitung" description="Transparansi estimasi" />
            <ul className="space-y-2 text-[10px] leading-relaxed text-text-muted">
              <li>• Kebutuhan per bulan = sisa target ÷ bulan menuju deadline.</li>
              <li>• Deadline lewat dihitung minimal 1 bulan agar tidak error.</li>
              <li>• Setoran manual tidak membuat transaksi pengeluaran.</li>
              <li>• Angka adalah estimasi, bukan jaminan hasil investasi.</li>
            </ul>
          </Card>
        </div>
      </div>

      <GoalModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ContributeModal goal={selected} onClose={() => setContributeId(null)} />
    </div>
  )
}
