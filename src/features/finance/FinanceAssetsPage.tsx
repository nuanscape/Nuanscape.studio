import * as React from 'react'
import { Landmark, Plus, Scale, TrendingUp, Wallet } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DonutChart } from '@/components/charts/charts'
import { AssetModal } from '@/features/finance/components/asset-modal'
import { useFinanceStore } from '@/stores/finance-store'
import { financeSummary } from '@/lib/metrics'
import { formatDate, formatIDR } from '@/lib/utils'

const typeColors: Record<string, string> = {
  Cash: '#F5D64B',
  Bank: '#6DBBFF',
  Investment: '#FFE9A3',
  Business: '#FFD166',
  Inventory: '#FF9E7D',
}

export function FinanceAssetsPage() {
  const { assets, liabilities, transactions } = useFinanceStore()
  const [assetOpen, setAssetOpen] = React.useState(false)
  const [liabilityOpen, setLiabilityOpen] = React.useState(false)
  const summary = financeSummary(transactions, assets, liabilities)

  const allocation = React.useMemo(() => {
    const map = new Map<string, number>()
    assets.forEach((a) => map.set(a.type, (map.get(a.type) ?? 0) + a.value))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: typeColors[name] ?? '#B4B4B4' }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  const liquidity = assets.filter((a) => a.type === 'Cash' || a.type === 'Bank').reduce((a, x) => a + x.value, 0)
  const debtRatio = summary.assetTotal ? (summary.liabilityTotal / summary.assetTotal) * 100 : 0

  return (
    <div>
      <PageHeader
        title="Aset & net worth"
        description="Pantau kekayaan bersih, alokasi aset, dan kewajiban dalam satu tempat."
        actions={
          <>
            <Button variant="secondary" onClick={() => setLiabilityOpen(true)}>
              <Scale /> Tambah liabilitas
            </Button>
            <Button onClick={() => setAssetOpen(true)}>
              <Plus /> Tambah aset
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net worth" value={formatIDR(summary.netWorth)} delta={6.8} deltaLabel="vs awal bulan" icon={<TrendingUp />} accent="yellow" />
        <MetricCard label="Total aset" value={formatIDR(summary.assetTotal)} deltaLabel={`${assets.length} pos aset`} icon={<Landmark />} accent="teal" />
        <MetricCard label="Total liabilitas" value={formatIDR(summary.liabilityTotal)} deltaLabel={`${liabilities.length} kewajiban`} icon={<Scale />} tone="warning" accent="orange" />
        <MetricCard label="Aset likuid" value={formatIDR(liquidity)} deltaLabel={`${((liquidity / summary.assetTotal) * 100).toFixed(0)}% dari aset`} icon={<Wallet />} tone="positive" accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.6fr]">
        <Card className="p-5">
          <SectionHeader title="Alokasi aset" description="Berdasarkan tipe" />
          <DonutChart data={allocation} height={200} centerValue={formatIDR(summary.assetTotal, { compact: true })} centerLabel="total aset" />
          <div className="mt-4 space-y-2">
            {allocation.map((a) => (
              <div key={a.name} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="flex-1 text-text-secondary">{a.name}</span>
                <span className="num text-text-muted">{formatIDR(a.value, { compact: true })}</span>
                <span className="num w-10 text-right text-text-primary">{((a.value / summary.assetTotal) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">Debt to asset ratio</span>
              <span className={debtRatio > 40 ? 'text-warning' : 'text-primary'}>{debtRatio.toFixed(1)}%</span>
            </div>
            <Progress value={debtRatio} tone={debtRatio > 40 ? 'warning' : 'primary'} size="sm" className="mt-2" />
            <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
              Rasio di bawah 40% umumnya dianggap sehat untuk keuangan pribadi dan bisnis kecil.
              Angka ini bukan nasihat keuangan.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionHeader title="Daftar aset" description={`${assets.length} aset tercatat`} className="mb-0" />
            <Button variant="soft" size="sm" onClick={() => setAssetOpen(true)}>
              <Plus /> Aset
            </Button>
          </div>
          <div className="divide-y divide-line">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-8 place-items-center rounded-lg border border-line bg-white/[0.02]">
                  <Landmark className="size-3.5" style={{ color: typeColors[asset.type] }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-text-primary">{asset.name}</p>
                  <p className="text-[10px] text-text-muted">{asset.type}{asset.note ? ` · ${asset.note}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="num text-[12px] text-text-primary">{formatIDR(asset.value)}</p>
                  <p className="text-[9px] text-text-muted">{((asset.value / summary.assetTotal) * 100).toFixed(1)}% dari aset</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <SectionHeader title="Liabilitas" description="Kewajiban dan jatuh tempo" className="mb-0" />
          <Badge tone={debtRatio > 40 ? 'warning' : 'primary'}>{formatIDR(summary.liabilityTotal, { compact: true })}</Badge>
        </div>
        {liabilities.length === 0 ? (
          <p className="p-5 text-xs text-text-muted">Tidak ada liabilitas tercatat.</p>
        ) : (
          <div className="divide-y divide-line">
            {liabilities.map((l) => {
              const due = new Date(l.dueDate)
              const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="grid size-8 place-items-center rounded-lg border border-danger/20 bg-danger/[0.06]">
                    <Scale className="size-3.5 text-danger" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-text-primary">{l.name}</p>
                    <p className="text-[10px] text-text-muted">{l.type} · jatuh tempo {formatDate(l.dueDate)}</p>
                  </div>
                  <Badge tone={days < 7 ? 'danger' : days < 30 ? 'warning' : 'outline'}>
                    {days < 0 ? 'Lewat' : `${days} hari lagi`}
                  </Badge>
                  <p className="num w-28 text-right text-[12px] text-text-primary">{formatIDR(l.value)}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <AssetModal open={assetOpen} onClose={() => setAssetOpen(false)} mode="asset" />
      <AssetModal open={liabilityOpen} onClose={() => setLiabilityOpen(false)} mode="liability" />
    </div>
  )
}
