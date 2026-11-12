import * as React from 'react'
import { CalendarClock, Plus, Repeat, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarTrendChart, DonutChart } from '@/components/charts/charts'
import { TransactionsTable } from '@/features/finance/components/transactions-table'
import { TransactionModal } from '@/features/finance/components/transaction-modal'
import { useFinanceStore } from '@/stores/finance-store'
import { categoryTotals, financeSummary } from '@/lib/metrics'
import { formatIDR, formatPercent } from '@/lib/utils'

const palette = ['#F5D64B', '#6DBBFF', '#FFE9A3', '#FFD166', '#FF9E7D', '#B4B4B4', '#7C8CF8']

export function FinanceIncomePage() {
  const { transactions, assets, liabilities } = useFinanceStore()
  const [open, setOpen] = React.useState(false)
  const income = transactions.filter((t) => t.type === 'income')
  const summary = financeSummary(transactions, assets, liabilities)
  const byCategory = categoryTotals(transactions, 'income')
  const donut = byCategory.map((c, i) => ({ ...c, color: palette[i % palette.length] }))
  const recurring = income.filter((t) => t.recurring !== 'none')
  const avg = income.length ? summary.income / income.length : 0
  const top = byCategory[0]

  const monthly = React.useMemo(() => {
    const map = new Map<string, number>()
    income.forEach((t) => {
      const key = t.date.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + t.amount)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => {
        const [y, m] = key.split('-')
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('id-ID', { month: 'short' })
        return { label, income: value }
      })
  }, [income])

  return (
    <div>
      <PageHeader
        title="Pemasukan"
        description="Lacak semua sumber pemasukan, pemasukan berulang, dan pertumbuhan dari waktu ke waktu."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Catat pemasukan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total pemasukan" value={formatIDR(summary.income)} delta={12.4} deltaLabel="vs periode lalu" icon={<Wallet />} accent="yellow" />
        <MetricCard label="Rata-rata / transaksi" value={formatIDR(avg)} delta={4.1} deltaLabel={`${income.length} transaksi`} icon={<TrendingUp />} accent="teal" />
        <MetricCard label="Pemasukan berulang" value={`${recurring.length} sumber`} deltaLabel={`${formatIDR(recurring.reduce((a, t) => a + t.amount, 0))} total`} icon={<Repeat />} accent="orange" />
        <MetricCard
          label="Sumber terbesar"
          value={top?.name ?? '—'}
          deltaLabel={top ? `${formatPercent((top.value / summary.income) * 100)} dari total` : undefined}
          icon={<CalendarClock />}
          accent="pink"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Tren pemasukan" description="Total per bulan dari transaksi tercatat." />
          <BarTrendChart
            data={monthly}
            xKey="label"
            series={[{ key: 'income', label: 'Income', color: '#F5D64B' }]}
            height={240}
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Komposisi sumber" description="Kontribusi tiap kategori" />
          <DonutChart data={donut} height={180} centerValue={formatIDR(summary.income, { compact: true })} centerLabel="total income" />
          <div className="mt-3 space-y-2">
            {byCategory.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                <span className="flex-1 text-text-secondary">{c.name}</span>
                <span className="num text-text-primary">{formatPercent((c.value / summary.income) * 100)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <SectionHeader title="Riwayat pemasukan" description={`${income.length} transaksi tercatat`} className="mb-0" />
          </div>
          <TransactionsTable transactions={income} showAccount={false} />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Pemasukan berulang" description="Yang dijadwalkan masuk" />
          {recurring.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada pemasukan berulang.</p>
          ) : (
            <div className="space-y-3">
              {recurring.map((t) => (
                <div key={t.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-medium text-text-primary">{t.description}</p>
                      <p className="text-[10px] text-text-muted">
                        {t.source ?? t.category} · {t.recurring === 'monthly' ? 'Bulanan' : 'Mingguan'}
                      </p>
                    </div>
                    <span className="num text-[12px] text-primary">+{formatIDR(t.amount)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
                    <CalendarClock className="size-3" /> Berikutnya {t.recurring === 'monthly' ? 'bulan depan' : 'minggu depan'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Konsistensi pemasukan</p>
            <Progress value={recurring.length ? 74 : 22} className="mt-2" size="sm" />
            <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
              {recurring.length
                ? 'Sebagian pemasukan berulang. Sisanya berbasis proyek dan perlu cadangan kas lebih besar.'
                : 'Tambahkan pemasukan berulang agar AI bisa memproyeksikan arus kas lebih akurat.'}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {byCategory.slice(0, 4).map((c) => (
              <Badge key={c.name} tone="outline">
                {c.name}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      <TransactionModal open={open} onClose={() => setOpen(false)} defaultType="income" />
    </div>
  )
}
