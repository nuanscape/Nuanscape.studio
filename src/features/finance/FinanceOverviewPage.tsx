import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleDollarSign,
  Landmark,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { PageHeader, MetricCard, InsightCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { AreaTrendChart, DonutChart, RadialScore } from '@/components/charts/charts'
import { TransactionModal } from '@/features/finance/components/transaction-modal'
import { useFinanceStore } from '@/stores/finance-store'
import {
  budgetSummary,
  categoryTotals,
  financeSummary,
} from '@/lib/metrics'
import { financeInsights, expenseCategories, financeSeries } from '@/data/mock'
import { cn, formatIDR, formatPercent } from '@/lib/utils'

type Range = '7d' | '30d' | '3m' | '6m' | '1y'

export function FinanceOverviewPage() {
  const { transactions, assets, liabilities, budgets } = useFinanceStore()
  const [range, setRange] = React.useState<Range>('30d')
  const [modalOpen, setModalOpen] = React.useState(false)

  const summary = financeSummary(transactions, assets, liabilities)
  const budgetInfo = budgetSummary(budgets)
  const incomeTotals = categoryTotals(transactions, 'income')

  const chartData = React.useMemo(() => {
    if (range === '3m' || range === '6m' || range === '1y') {
      const months = range === '3m' ? 3 : range === '6m' ? 6 : 12
      return financeSeries.slice(-months)
    }
    const days = range === '7d' ? 7 : 30
    const buckets: Record<string, { label: string; income: number; expense: number; net: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets[key] = {
        label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        income: 0,
        expense: 0,
        net: 0,
      }
    }
    transactions.forEach((t) => {
      const key = t.date.slice(0, 10)
      if (buckets[key]) {
        if (t.type === 'income') buckets[key].income += t.amount
        else buckets[key].expense += t.amount
        buckets[key].net = buckets[key].income - buckets[key].expense
      }
    })
    return Object.values(buckets)
  }, [range, transactions])

  const score = Math.min(96, Math.max(35, Math.round(summary.savingsRate * 1.55 + 32)))

  return (
    <div>
      <PageHeader
        title="Financial intelligence"
        description="Pahami seluruh kondisi keuanganmu — arus kas, pengeluaran, aset, dan proyeksi dalam satu pandangan."
        actions={
          <>
            <Button variant="secondary" onClick={() => window.location.assign('/app/monitor')}>
              <Sparkles /> Analisis AI
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <CircleDollarSign /> Tambah transaksi
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total balance"
          value={formatIDR(summary.balance)}
          delta={8.2}
          deltaLabel="vs bulan lalu"
          icon={<Wallet />}
          accent="yellow"
        />
        <MetricCard
          label="Total income"
          value={formatIDR(summary.income)}
          delta={12.4}
          deltaLabel="dari 8 sumber"
          icon={<TrendingUp />}
          accent="teal"
        />
        <MetricCard
          label="Total expenses"
          value={formatIDR(summary.expense)}
          delta={-12}
          deltaLabel="perlu perhatian"
          icon={<TrendingDown />}
          tone="warning"
          accent="orange"
        />
        <MetricCard
          label="Savings rate"
          value={formatPercent(summary.savingsRate)}
          delta={6.4}
          deltaLabel="di atas target 30%"
          icon={<Scale />}
          tone="positive"
          accent="pink"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-text-primary">Financial performance</h2>
              <p className="mt-0.5 text-[11px] text-text-muted">Income, expense, dan net cash flow per periode.</p>
            </div>
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { label: '7D', value: '7d' },
                { label: '30D', value: '30d' },
                { label: '3M', value: '3m' },
                { label: '6M', value: '6m' },
                { label: '1Y', value: '1y' },
              ]}
            />
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Net cash flow</p>
                <p className="num mt-1 text-[24px] font-semibold tracking-tight text-text-primary">
                  {formatIDR(summary.net)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-primary"><span className="size-1.5 rounded-full bg-primary" /> Income</span>
                <span className="flex items-center gap-1.5 text-danger"><span className="size-1.5 rounded-full bg-danger" /> Expense</span>
              </div>
              <Badge tone="primary" className="ml-auto">
                <TrendingUp /> {formatPercent(12.4, true)} MoM
              </Badge>
            </div>
            <AreaTrendChart
              data={chartData.map((d) => ({ label: d.label, income: d.income, expense: d.expense }))}
              xKey="label"
              series={[
                { key: 'income', label: 'Income', color: '#F5D64B' },
                { key: 'expense', label: 'Expense', color: '#F0512B' },
              ]}
              height={260}
            />
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-text-primary">Financial health</h2>
              <p className="mt-0.5 text-[11px] text-text-muted">Dihitung dari savings rate, budget, dan aset.</p>
            </div>
            <Badge tone={score >= 75 ? 'primary' : score >= 55 ? 'warning' : 'danger'}>
              {score >= 75 ? 'Sehat' : score >= 55 ? 'Cukup' : 'Perlu perhatian'}
            </Badge>
          </div>
          <div className="my-4 flex justify-center">
            <RadialScore value={score} label="health score" />
          </div>
          <div className="space-y-3">
            {[
              { label: 'Savings rate', value: summary.savingsRate, target: 'Target 30%', tone: 'primary' as const },
              { label: 'Budget usage', value: budgetInfo.usage, target: `${formatIDR(budgetInfo.remaining, { compact: true })} tersisa`, tone: budgetInfo.usage > 85 ? 'warning' as const : 'primary' as const },
              { label: 'Debt ratio', value: (summary.liabilityTotal / summary.assetTotal) * 100, target: `${formatIDR(summary.liabilityTotal, { compact: true })} liabilitas`, tone: 'info' as const },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="num text-text-primary">{item.value.toFixed(1)}%</span>
                </div>
                <Progress value={item.value} tone={item.tone} size="sm" className="mt-1.5" />
                <p className="mt-1 text-[9px] text-text-muted">{item.target}</p>
              </div>
            ))}
          </div>
          <Link
            to="/app/finance/reports"
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4 w-full')}
          >
            Lihat laporan lengkap <ArrowRight className="size-3" />
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionHeader title="Expense distribution" description="30 hari terakhir" />
          <DonutChart data={expenseCategories} height={190} centerValue={formatIDR(summary.expense, { compact: true })} centerLabel="total expense" />
          <div className="mt-3 space-y-2">
            {expenseCategories.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-text-secondary">{c.name}</span>
                <span className="num text-text-primary">{formatIDR(c.value, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Budget health"
            description={`${formatIDR(budgetInfo.spent, { compact: true })} dari ${formatIDR(budgetInfo.limit, { compact: true })}`}
            action={<Link to="/app/finance/budgets" className="text-[10px] text-primary hover:text-primary-soft">Kelola</Link>}
          />
          <div className="space-y-3.5">
            {budgets.slice(0, 4).map((budget) => {
              const usage = (budget.spent / budget.limit) * 100
              return (
                <div key={budget.id}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">{budget.category}</span>
                    <span className={cn('num', usage > 90 ? 'text-danger' : usage > 75 ? 'text-warning' : 'text-text-primary')}>
                      {Math.round(usage)}%
                    </span>
                  </div>
                  <Progress value={usage} size="sm" className="mt-1.5" tone={usage > 90 ? 'danger' : usage > 75 ? 'warning' : 'primary'} />
                  <div className="mt-1 flex justify-between text-[9px] text-text-muted">
                    <span>{formatIDR(budget.spent, { compact: true })}</span>
                    <span>dari {formatIDR(budget.limit, { compact: true })}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
            Marketing mendekati limit. AI menyarankan realokasi dari budget hiburan yang masih 75% tersisa.
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="AI finance intelligence"
            description="Insight berdasarkan data tercatat"
            action={<button onClick={() => window.location.assign('/app/monitor')} className="text-[10px] text-primary hover:text-primary-soft">Tanya Nuanscape AI</button>}
          />
          <div className="space-y-3">
            {financeInsights.map((insight) => (
              <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Assets & liabilities"
            description={`Net worth ${formatIDR(summary.netWorth)}`}
            action={<Link to="/app/finance/assets" className="text-[10px] text-primary hover:text-primary-soft">Detail</Link>}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                <Landmark className="size-3.5 text-primary" /> Assets
                <span className="num ml-auto text-text-primary">{formatIDR(summary.assetTotal, { compact: true })}</span>
              </div>
              <div className="mt-3 space-y-2">
                {assets.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 py-2 text-[10px]">
                    <span className="truncate text-text-muted">{a.name}</span>
                    <span className="num shrink-0 text-text-secondary">{formatIDR(a.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                <Scale className="size-3.5 text-danger" /> Liabilities
                <span className="num ml-auto text-text-primary">{formatIDR(summary.liabilityTotal, { compact: true })}</span>
              </div>
              <div className="mt-3 space-y-2">
                {liabilities.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 py-2 text-[10px]">
                    <span className="truncate text-text-muted">{l.name}</span>
                    <span className="num shrink-0 text-text-secondary">{formatIDR(l.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Income sources" description="Kontribusi pemasukan" />
          <div className="space-y-3">
            {incomeTotals.map((source) => {
              const share = (source.value / summary.income) * 100
              return (
                <div key={source.name}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">{source.name}</span>
                    <span className="num text-text-primary">{formatIDR(source.value, { compact: true })}</span>
                  </div>
                  <Progress value={share} size="sm" className="mt-1.5" />
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-text-muted">
            Marketplace dan business income menyumbang lebih dari setengah total pemasukan. Uang
            pribadi dan bisnis tetap terpisah.
          </p>
        </Card>
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
