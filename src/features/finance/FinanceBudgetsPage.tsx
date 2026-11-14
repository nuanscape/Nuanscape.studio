import * as React from 'react'
import { ArrowRight, Pencil, Plus, PiggyBank, ShieldCheck, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader, InsightCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BudgetModal } from '@/features/finance/components/budget-modal'
import { useFinanceStore } from '@/stores/finance-store'
import { budgetSummary } from '@/lib/metrics'
import { financeInsights } from '@/data/mock'
import { cn, formatIDR } from '@/lib/utils'

export function FinanceBudgetsPage() {
  const { budgets } = useFinanceStore()
    const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)
  const summary = budgetSummary(budgets)
  const editingBudget = budgets.find((b) => b.id === editing)
  const over = budgets.filter((b) => b.spent > b.limit)

  return (
    <div>
      <PageHeader
        title="Budget"
        description="Tetapkan batas pengeluaran per kategori dan biarkan AI memantau pemakaiannya."
        actions={
          <>
            <Button variant="secondary" onClick={() => window.location.assign('/app/monitor')}>
              Minta saran AI
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus /> Budget baru
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total limit" value={formatIDR(summary.limit)} deltaLabel={`${budgets.length} kategori`} icon={<Wallet />} accent="yellow" />
        <MetricCard label="Terpakai" value={formatIDR(summary.spent)} deltaLabel={`${Math.round(summary.usage)}% dari limit`} icon={<PiggyBank />} tone={summary.usage > 85 ? 'warning' : 'default'} accent="teal" />
        <MetricCard label="Tersisa" value={formatIDR(summary.remaining)} deltaLabel="hingga akhir bulan" icon={<ShieldCheck />} tone="positive" accent="orange" />
        <MetricCard label="Budget terlampaui" value={`${over.length} kategori`} deltaLabel={over.length ? 'butuh perhatian' : 'semua terkendali'} icon={<ShieldCheck />} tone={over.length ? 'danger' : 'positive'} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {budgets.map((budget) => {
            const usage = (budget.spent / budget.limit) * 100
            const remaining = budget.limit - budget.spent
            const tone = usage > 100 ? 'danger' : usage > 85 ? 'warning' : 'primary'
            return (
              <Card key={budget.id} className="group p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">{budget.category}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted">Budget bulanan</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={tone}>
                      {usage > 100 ? 'Over' : usage > 85 ? 'Hampir habis' : 'Aman'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ubah budget ${budget.category}`}
                      onClick={() => {
                        setEditing(budget.id)
                      }}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="num text-[19px] font-semibold text-text-primary">{formatIDR(budget.spent)}</p>
                    <p className="text-[10px] text-text-muted">dari {formatIDR(budget.limit)}</p>
                  </div>
                  <span className={cn('num text-[12px] font-medium', remaining < 0 ? 'text-danger' : 'text-primary')}>
                    {remaining < 0 ? '-' : ''}{formatIDR(Math.abs(remaining), { compact: true })} {remaining < 0 ? 'lebih' : 'tersisa'}
                  </span>
                </div>
                <Progress value={usage} tone={tone} size="sm" className="mt-3" />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[9px] text-text-muted">{Math.round(usage)}% terpakai</p>
                  {remaining < 0 ? (
                    <button onClick={() => window.location.assign('/app/monitor')} className="text-[9px] text-danger hover:underline">
                      Minta saran realokasi
                    </button>
                  ) : null}
                </div>
              </Card>
            )
          })}
          <button
            onClick={() => setOpen(true)}
            className="ring-focus flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.01] text-white/40 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary sm:col-span-2"
          >
            <span className="grid size-9 place-items-center rounded-full border border-line bg-white/[0.03]">
              <Plus className="size-4" />
            </span>
            <span className="text-[11px] font-medium">Tambah budget kategori</span>
          </button>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Ringkasan pemakaian" description="Perbandingan limit dan realisasi" />
            <div className="space-y-3">
              {[...budgets]
                .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
                .slice(0, 6)
                .map((b) => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary">{b.category}</span>
                      <span className={cn('num', b.spent > b.limit ? 'text-danger' : 'text-text-primary')}>
                        {Math.round((b.spent / b.limit) * 100)}%
                      </span>
                    </div>
                    <Progress value={(b.spent / b.limit) * 100} size="sm" tone={b.spent > b.limit ? 'danger' : b.spent / b.limit > 0.85 ? 'warning' : 'primary'} className="mt-1.5" />
                  </div>
                ))}
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader
              title="AI budget advisor"
              description="Saran berbasis data transaksi"
              action={<button onClick={() => window.location.assign('/app/monitor')} className="text-[10px] text-primary">Buka AI</button>}
            />
            <div className="space-y-3">
              {financeInsights.slice(0, 2).map((insight) => (
                <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] p-2.5">
              <span className="text-[10px] leading-relaxed text-text-muted">
                Ingin membuat budget otomatis dari pola pengeluaran? AI dapat mengusulkan limit awal.
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-primary" />
            </div>
          </Card>
        </div>
      </div>

      <BudgetModal open={open} onClose={() => setOpen(false)} />
      <BudgetModal open={Boolean(editingBudget)} onClose={() => setEditing(null)} budget={editingBudget} />
    </div>
  )
}
