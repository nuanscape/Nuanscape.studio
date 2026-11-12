import * as React from 'react'
import { AlertCircle, CheckCircle2, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DonutChart } from '@/components/charts/charts'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { marketplaces } from '@/data/mock'
import { formatDate, formatIDR, formatRelative } from '@/lib/utils'
import type { MarketplaceConnection } from '@/types'

const statusMeta: Record<MarketplaceConnection['status'], { label: string; tone: 'primary' | 'warning' | 'danger' | 'outline' }> = {
  connected: { label: 'Terhubung', tone: 'primary' },
  syncing: { label: 'Sinkronisasi…', tone: 'warning' },
  disconnected: { label: 'Terputus', tone: 'outline' },
  error: { label: 'Error', tone: 'danger' },
}

export function SellerMarketplacesPage() {
  const { connections, syncMarketplace } = useSellerStore()
  const { push } = useToastStore()
  const [syncing, setSyncing] = React.useState<string | null>(null)

  const sync = async (id: string, name: string) => {
    setSyncing(id)
    await syncMarketplace(id)
    setSyncing(null)
    push({ title: `${name} tersinkron`, description: 'Data produk, pesanan, dan inventory diperbarui (demo).', tone: 'success' })
  }

  const syncAll = async () => {
    for (const c of connections.filter((c) => c.status !== 'syncing')) {
      setSyncing(c.id)
      await syncMarketplace(c.id)
    }
    setSyncing(null)
    push({ title: 'Semua marketplace tersinkron', description: 'Data demo diperbarui.', tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Marketplace connections"
        description="Kelola koneksi, izin, dan sinkronisasi data dari TikTok Seller dan Shopee."
        actions={
          <>
            <Button variant="secondary" onClick={syncAll} loading={Boolean(syncing)}>
              <RefreshCw /> Sync semua
            </Button>
            <Button onClick={() => push({ title: 'Koneksi baru', description: 'Integrasi marketplace baru belum tersedia pada demo ini.', tone: 'info' })}>
              <Link2 /> Hubungkan baru
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {connections.map((c) => {
          const meta = statusMeta[c.status]
          const busy = syncing === c.id || c.status === 'syncing'
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-line bg-white/[0.03]">
                    <span className="size-3.5 rounded-full" style={{ backgroundColor: c.name === 'TikTok Shop' ? '#F5D64B' : '#FFD166' }} />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-text-primary">{c.name}</h2>
                    <p className="text-[10px] text-text-muted">{c.storeName}</p>
                  </div>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Sync terakhir</p>
                  <p className="mt-1 text-[10px] text-text-secondary">{c.lastSync ? formatRelative(c.lastSync) : 'Belum pernah'}</p>
                </div>
                <div className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Izin</p>
                  <p className="mt-1 text-[10px] text-text-secondary">{c.permissions.length} akses</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.permissions.map((p) => (
                  <Badge key={p} tone="outline">{p}</Badge>
                ))}
              </div>

              {c.note ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/[0.04] p-2.5">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                  <p className="text-[10px] text-text-muted">{c.note}</p>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  {c.status === 'connected' ? <CheckCircle2 className="size-3 text-primary" /> : <Unplug className="size-3" />}
                  Data read-only kecuali produk
                </div>
                <Button variant="soft" size="sm" loading={busy} onClick={() => sync(c.id, c.name)}>
                  <RefreshCw /> Sync
                </Button>
              </div>
            </Card>
          )
        })}

        <Card className="flex flex-col items-center justify-center border-dashed p-6 text-center">
          <span className="grid size-10 place-items-center rounded-xl border border-line bg-white/[0.03] text-text-muted">
            <Link2 className="size-4" />
          </span>
          <p className="mt-3 text-[12px] font-medium text-text-primary">Tambah marketplace lain</p>
          <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-text-muted">
            Integrasi marketplace tambahan memerlukan kredensial resmi. Pada demo, koneksi baru tidak
            dapat dibuat.
          </p>
          <Button variant="ghost" size="sm" className="mt-3" disabled>
            Segera hadir
          </Button>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Performa marketplace" description="30 hari terakhir" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-[9px] uppercase tracking-[0.1em] text-text-muted">
                  <th className="py-2 text-left font-medium">Marketplace</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {marketplaces.map((m) => (
                  <tr key={m.name} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 text-[11px] text-text-primary">
                        <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.name}
                      </span>
                    </td>
                    <td className="num py-2.5 text-right text-[11px] text-text-primary">{formatIDR(m.revenue)}</td>
                    <td className="num py-2.5 text-right text-[11px] text-text-secondary">{m.orders}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={m.share} size="sm" className="w-16" />
                        <span className="num w-8 text-[10px] text-text-muted">{m.share}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Revenue share" description="Dominasi kanal penjualan" />
          <DonutChart
            data={marketplaces.map((m) => ({ name: m.name, value: m.revenue, color: m.color }))}
            height={180}
            centerValue={formatIDR(marketplaces.reduce((a, m) => a + m.revenue, 0), { compact: true })}
            centerLabel="total revenue"
          />
          <div className="mt-3 space-y-2">
            {marketplaces.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-[10px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="flex-1 text-text-secondary">{m.name}</span>
                <span className="num text-text-muted">{m.share}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Keamanan & izin" description="Prinsip akses minimum" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: <ShieldCheck className="size-4 text-primary" />, t: 'Read-only default', d: 'Pesanan dan analitik hanya dibaca. Aksi tulis memerlukan konfirmasi.' },
            { icon: <RefreshCw className="size-4 text-primary" />, t: 'Sinkronisasi manual', d: 'Tidak ada perubahan otomatis ke marketplace pada demo ini.' },
            { icon: <AlertCircle className="size-4 text-primary" />, t: 'Audit trail', d: 'Setiap aksi demo ditampilkan sebagai notifikasi dan tidak dikirim ke marketplace.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-2">{x.icon}<p className="text-[11px] font-medium text-text-primary">{x.t}</p></div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-text-muted">
          Sync terakhir: {connections[0] ? formatDate(connections[0].lastSync) : '—'}. Semua data adalah simulasi lokal.
        </p>
      </Card>
    </div>
  )
}
