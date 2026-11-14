import * as React from 'react'
import { Download, FileText, Printer, Sparkles, TrendingUp } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader, InsightCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Segmented } from '@/components/ui/segmented'
import { BarTrendChart, DonutChart } from '@/components/charts/charts'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { categoryTotals, financeSummary } from '@/lib/metrics'
import { financeInsights, financeSeries } from '@/data/mock'
import { downloadText, formatIDR, formatPercent } from '@/lib/utils'

type Period = '3m' | '6m' | '12m'

const palette = ['#F5D64B', '#6DBBFF', '#FFD166', '#F0512B', '#FFE9A3', '#B4B4B4']

export function FinanceReportsPage() {
  const { transactions, assets, liabilities } = useFinanceStore()
    const { push } = useToastStore()
  const [period, setPeriod] = React.useState<Period>('6m')
  const summary = financeSummary(transactions, assets, liabilities)

  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
  const series = financeSeries.slice(-months)
  const totalIncome = series.reduce((a, s) => a + s.income, 0)
  const totalExpense = series.reduce((a, s) => a + s.expense, 0)
  const totalNet = totalIncome - totalExpense
  const margin = (totalNet / totalIncome) * 100
  const byCategory = categoryTotals(transactions, 'expense')
  const incomeByCategory = categoryTotals(transactions, 'income')

  const exportReport = () => {
    const lines = [
      'Periode,Income,Expense,Net',
      ...series.map((s) => `${s.label},${s.income},${s.expense},${s.net}`),
      '',
      `Total,${totalIncome},${totalExpense},${totalNet}`,
    ].join('\n')
    downloadText(`laporan-finance-${period}-${new Date().toISOString().slice(0, 10)}.csv`, lines)
    push({ title: 'Laporan diekspor', description: `Periode ${period.toUpperCase()} dalam format CSV.`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Laporan keuangan"
        description="Ringkasan performa keuangan periodik dengan sumber data yang jelas dan ekspor yang bisa diaudit."
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer /> Cetak
            </Button>
            <Button variant="secondary" onClick={exportReport}>
              <Download /> Ekspor
            </Button>
            <Button onClick={() => window.location.assign('/app/monitor')}>
              <Sparkles /> Insight AI
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { label: '3 bulan', value: '3m' },
            { label: '6 bulan', value: '6m' },
            { label: '12 bulan', value: '12m' },
          ]}
        />
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <FileText className="size-3.5" /> Sumber: transaksi demo + seri bulanan tersimpan
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total income" value={formatIDR(totalIncome)} delta={14.2} deltaLabel={`${months} bulan`} icon={<TrendingUp />} accent="yellow" />
        <MetricCard label="Total expense" value={formatIDR(totalExpense)} delta={-6.8} deltaLabel="lebih terkendali" icon={<TrendingUp />} tone="warning" accent="teal" />
        <MetricCard label="Net profit" value={formatIDR(totalNet)} delta={9.4} deltaLabel="vs periode sebelumnya" icon={<TrendingUp />} tone="positive" accent="orange" />
        <MetricCard label="Net margin" value={formatPercent(margin)} deltaLabel="dari total income" icon={<TrendingUp />} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Income vs expense" description={`${months} bulan terakhir`} />
          <BarTrendChart
            data={series.map((point) => ({ ...point }))}
            xKey="label"
            series={[
              { key: 'income', label: 'Income', color: '#F5D64B' },
              { key: 'expense', label: 'Expense', color: '#F0512B' },
            ]}
            height={280}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Cash flow summary" description="Rata-rata per bulan" />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Income</span>
                <span className="num text-text-primary">{formatIDR(totalIncome / months)}</span>
              </div>
              <Progress value={100} className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Expense</span>
                <span className="num text-text-primary">{formatIDR(totalExpense / months)}</span>
              </div>
              <Progress value={(totalExpense / totalIncome) * 100} className="mt-2" tone="danger" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Net</span>
                <span className="num text-primary">{formatIDR(totalNet / months)}</span>
              </div>
              <Progress value={(totalNet / totalIncome) * 100} className="mt-2" tone="primary" />
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-primary">Runway</p>
            <p className="num mt-1 text-[18px] font-semibold text-text-primary">
              {summary.expense ? (summary.balance / (summary.expense / 30)).toFixed(1) : '—'} hari
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
              Estimasi berbasis saldo dan rata-rata pengeluaran tercatat. Bukan proyeksi resmi.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Komposisi pengeluaran" description="Berdasarkan seluruh transaksi demo" />
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
            <DonutChart
              data={byCategory.map((c, i) => ({ ...c, color: palette[i % palette.length] }))}
              height={190}
              centerValue={formatIDR(summary.expense, { compact: true })}
              centerLabel="total expense"
            />
            <div className="space-y-2">
              {byCategory.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-[11px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                  <span className="flex-1 truncate text-text-secondary">{c.name}</span>
                  <span className="num text-text-primary">{formatPercent((c.value / summary.expense) * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Monthly breakdown" description="Klik ekspor untuk data lengkap" />
          <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-line">
            <table className="w-full min-w-[460px]">
              <thead>
                <tr className="border-b border-line bg-white/[0.03] text-[9px] uppercase tracking-[0.1em] text-text-muted">
                  <th className="px-3 py-2 text-left font-medium">Bulan</th>
                  <th className="px-3 py-2 text-right font-medium">Income</th>
                  <th className="px-3 py-2 text-right font-medium">Expense</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.label} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 text-[11px] text-text-secondary">{s.label}</td>
                    <td className="num px-3 py-2 text-right text-[11px] text-text-primary">{formatIDR(s.income, { compact: true })}</td>
                    <td className="num px-3 py-2 text-right text-[11px] text-text-muted">{formatIDR(s.expense, { compact: true })}</td>
                    <td className={`num px-3 py-2 text-right text-[11px] ${s.net >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {formatIDR(s.net, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {incomeByCategory.slice(0, 3).map((c) => (
              <Badge key={c.name} tone="outline">{c.name}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {financeInsights.map((insight) => (
          <InsightCard key={insight.id} {...insight} onAction={() => window.location.assign('/app/monitor')} />
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
        Laporan ini menggabungkan transaksi lokal dan seri bulanan demo. Angka dapat berbeda dari
        rekening bank sebenarnya. Selalu rekonsiliasi sebelum keputusan besar.
      </p>
    </div>
  )
}
