import * as React from 'react'
import { AlertTriangle, Plus, Receipt, Repeat, TrendingDown } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DonutChart } from '@/components/charts/charts'
import { TransactionsTable } from '@/features/finance/components/transactions-table'
import { TransactionModal } from '@/features/finance/components/transaction-modal'
import { useFinanceStore } from '@/stores/finance-store'
import { budgetSummary, categoryTotals, financeSummary } from '@/lib/metrics'
import { cn, formatIDR, formatPercent } from '@/lib/utils'

const palette = ['#F0512B', '#FFD166', '#FF9E7D', '#6DBBFF', '#B4B4B4', '#FFE9A3', '#7C8CF8']

export function FinanceExpensesPage() {
  const { transactions, assets, liabilities, budgets } = useFinanceStore()
  const [open, setOpen] = React.useState(false)
  const [category, setCategory] = React.useState<string | null>(null)
  const expenses = transactions.filter((t) => t.type === 'expense')
  const summary = financeSummary(transactions, assets, liabilities)
  const byCategory = categoryTotals(transactions, 'expense')
  const donut = byCategory.map((c, i) => ({ ...c, color: palette[i % palette.length] }))
  const budgetsInfo = budgetSummary(budgets)
  const avg = expenses.length ? summary.expense / expenses.length : 0
  const unusual = expenses.filter((t) => t.amount > avg * 1.6)
  const recurring = expenses.filter((t) => t.recurring !== 'none')
  const filtered = category ? expenses.filter((t) => t.category === category) : expenses

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        description="Kendalikan pengeluaran, temukan kebocoran, dan pastikan budget tetap sehat."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Catat pengeluaran
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total pengeluaran" value={formatIDR(summary.expense)} delta={-8.2} deltaLabel="vs periode lalu" icon={<TrendingDown />} tone="warning" accent="yellow" />
        <MetricCard label="Rata-rata / transaksi" value={formatIDR(avg)} deltaLabel={`${expenses.length} transaksi`} icon={<Receipt />} accent="teal" />
        <MetricCard label="Kategori terbesar" value={byCategory[0]?.name ?? '-'} deltaLabel={byCategory[0] ? formatIDR(byCategory[0].value) : undefined} icon={<AlertTriangle />} tone="warning" accent="orange" />
        <MetricCard label="Biaya berulang" value={`${recurring.length} item`} deltaLabel={`${formatIDR(recurring.reduce((a, t) => a + t.amount, 0))} terikat`} icon={<Repeat />} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Distribusi pengeluaran" description="Klik kategori untuk memfilter tabel di bawah." />
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
            <DonutChart data={donut} height={200} centerValue={formatIDR(summary.expense, { compact: true })} centerLabel="total" />
            <div className="space-y-2">
              {byCategory.map((c, i) => {
                const active = category === c.name
                return (
                  <button
                    key={c.name}
                    onClick={() => setCategory(active ? null : c.name)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-white/[0.03]',
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                    <span className="flex-1">{c.name}</span>
                    <span className="num">{formatPercent((c.value / summary.expense) * 100)}</span>
                    <span className="num w-16 text-right text-text-muted">{formatIDR(c.value, { compact: true })}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="p-5">
            <SectionHeader
              title="Budget usage"
              description={`${formatIDR(budgetsInfo.spent)} dari ${formatIDR(budgetsInfo.limit)}`}
              action={<Badge tone={budgetsInfo.usage > 85 ? 'warning' : 'primary'}>{Math.round(budgetsInfo.usage)}%</Badge>}
            />
            <Progress value={budgetsInfo.usage} tone={budgetsInfo.usage > 85 ? 'warning' : 'primary'} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Tersisa</p>
                <p className="num mt-1 text-[13px] text-text-primary">{formatIDR(budgetsInfo.remaining, { compact: true })}</p>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Hari tersisa</p>
                <p className="num mt-1 text-[13px] text-text-primary">12 hari</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Pengeluaran tidak biasa" description="Di atas 1.6× rata-rata transaksi" />
            {unusual.length === 0 ? (
              <p className="text-xs text-text-muted">Tidak ada anomali terdeteksi pada data demo.</p>
            ) : (
              <div className="space-y-2">
                {unusual.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-warning/20 bg-warning/[0.04] px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-text-primary">{t.description}</p>
                      <p className="text-[9px] text-text-muted">{t.category} · {t.date}</p>
                    </div>
                    <span className="num shrink-0 text-[11px] text-warning">{formatIDR(t.amount, { compact: true })}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
              Anomali dihitung dari rata-rata transaksi, bukan patokan industri. Verifikasi manual
              sebelum mengambil keputusan.
            </p>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <SectionHeader
            title="Riwayat pengeluaran"
            description={category ? `Filter: ${category}` : `${filtered.length} transaksi`}
            className="mb-0"
          />
          {category ? (
            <Button variant="ghost" size="sm" onClick={() => setCategory(null)}>
              Hapus filter
            </Button>
          ) : null}
        </div>
        <TransactionsTable transactions={filtered} showAccount={false} emptyMessage="Tidak ada pengeluaran pada kategori ini." />
      </Card>

      <TransactionModal open={open} onClose={() => setOpen(false)} defaultType="expense" />
    </div>
  )
}
