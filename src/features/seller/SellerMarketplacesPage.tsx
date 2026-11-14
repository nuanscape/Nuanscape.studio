import * as React from 'react'
import { AlertCircle, Link2, Link2Off, RefreshCw, ShieldCheck } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DonutChart } from '@/components/charts/charts'
import { AccountScope } from '@/features/seller/components/account-scope'
import { MAX_MARKETPLACE_ACCOUNTS, useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { marketplaces } from '@/data/mock'
import { cn, formatDate, formatIDR, formatRelative } from '@/lib/utils'
import type { MarketplaceConnection } from '@/types'

const platforms: MarketplaceConnection['name'][] = ['TikTok Shop', 'Shopee']

const platformMeta: Record<MarketplaceConnection['name'], { label: string; color: string }> = {
  'TikTok Shop': { label: 'TikTok Seller Center', color: '#F5D64B' },
  Shopee: { label: 'Shopee Seller Center', color: '#FFD166' },
}

const statusMeta: Record<MarketplaceConnection['status'], { label: string; tone: 'primary' | 'warning' | 'danger' | 'outline' }> = {
  connected: { label: 'Tertaut', tone: 'primary' },
  syncing: { label: 'Sinkronisasi…', tone: 'warning' },
  disconnected: { label: 'Terputus', tone: 'outline' },
  error: { label: 'Error', tone: 'danger' },
}

export function SellerMarketplacesPage() {
  const { connections, activeAccountId, setActiveAccount, syncMarketplace, connectMarketplace, disconnectMarketplace } = useSellerStore()
  const { push } = useToastStore()
  const [syncing, setSyncing] = React.useState<string | null>(null)

  const sync = async (account: MarketplaceConnection) => {
    if (account.status === 'disconnected') return
    setSyncing(account.id)
    await syncMarketplace(account.id)
    setSyncing(null)
    push({
      title: `${account.storeName} tersinkron`,
      description: 'Data produk, pesanan, dan inventory diperbarui (demo).',
      tone: 'success',
    })
  }

  const syncAll = async () => {
    for (const c of connections.filter((c) => c.status === 'connected')) {
      setSyncing(c.id)
      await syncMarketplace(c.id)
    }
    setSyncing(null)
    push({ title: 'Semua akun tersinkron', description: 'Data demo diperbarui.', tone: 'success' })
  }

  const connect = (account: MarketplaceConnection) => {
    const connected = connections.filter((c) => c.name === account.name && c.status === 'connected').length
    if (connected >= MAX_MARKETPLACE_ACCOUNTS) {
      push({
        title: 'Slot akun penuh',
        description: `${account.name} maksimal ${MAX_MARKETPLACE_ACCOUNTS} akun tertaut. Putuskan salah satu terlebih dahulu.`,
        tone: 'warning',
      })
      return
    }
    connectMarketplace(account.id)
    push({ title: 'Akun ditautkan', description: `${account.storeName} kembali tersinkron.`, tone: 'success' })
  }

  const disconnect = (account: MarketplaceConnection) => {
    disconnectMarketplace(account.id)
    push({
      title: 'Tautan diputus',
      description: `${account.storeName} tidak lagi menerima sinkronisasi.`,
      tone: 'info',
    })
  }

  const latestSync = [...connections]
    .map((c) => c.lastSync)
    .sort((a, b) => +new Date(b) - +new Date(a))[0]

  return (
    <div>
      <PageHeader
        title="Marketplace accounts"
        description="Kelola hingga 3 akun TikTok Seller Center dan 3 akun Shopee Seller Center. Tautkan atau putuskan tautan akun kapan saja."
actions={
          <>
            <AccountScope />
            <Button variant="secondary" onClick={syncAll} loading={Boolean(syncing)}>
              <RefreshCw /> Sync semua
            </Button>
          </>
        }
      />

      <div className="space-y-5">
        {platforms.map((platform) => {
          const accounts = connections.filter((c) => c.name === platform)
          const linked = accounts.filter((c) => c.status === 'connected')
          const meta = platformMeta[platform]
          return (
            <Card key={platform} className="p-5">
              <SectionHeader
                title={meta.label}
                description={`${linked.length} dari ${accounts.length} akun tertaut · maksimal ${MAX_MARKETPLACE_ACCOUNTS} akun`}
                action={
                  <Badge
                    tone="outline"
                    style={{ borderColor: `${meta.color}55`, color: meta.color }}
                  >
                    {linked.length}/{MAX_MARKETPLACE_ACCOUNTS} tertaut
                  </Badge>
                }
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => {
                  const status = statusMeta[account.status]
                  const isLinked = account.status === 'connected'
                  const busy = syncing === account.id || account.status === 'syncing'
                  return (
                    <div
                      key={account.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveAccount(activeAccountId === account.id ? 'all' : account.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveAccount(activeAccountId === account.id ? 'all' : account.id) }}
                      className={cn(
                        'cursor-pointer rounded-xl border p-4 transition-colors',
                        activeAccountId === account.id
                          ? 'border-primary/40 bg-primary/[0.06]' 
                          : 'border-line bg-white/[0.02] hover:border-line-strong',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            <p className="truncate text-[13px] font-semibold text-text-primary">{account.storeName}</p>
                          </div>
                          <p className="mt-0.5 text-[10px] text-text-muted">
                            {account.name} · {account.permissions.length} izin akses
                          </p>
                        </div>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <p className="text-[9px] text-text-muted">Sync terakhir</p>
                          <p className="mt-0.5 text-[10px] text-text-secondary">
                            {account.lastSync ? formatRelative(account.lastSync) : 'Belum pernah'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <p className="text-[9px] text-text-muted">Status data</p>
                          <p className="mt-0.5 text-[10px] text-text-secondary">
                            {isLinked ? 'Tersinkron' : 'Tidak aktif'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {account.permissions.map((p) => (
                          <Badge key={p} tone="outline" className="text-[9px]">{p}</Badge>
                        ))}
                      </div>

                      {account.note ? (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/[0.04] p-2.5">
                          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                          <p className="text-[10px] text-text-muted">{account.note}</p>
                        </div>
                      ) : null}

                      <div className="mt-3 flex gap-2">
                        {isLinked ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => { e.stopPropagation(); disconnect(account) }}
                          >
                            <Link2Off /> Putuskan
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); connect(account) }}>
                            <Link2 /> Tautkan
                          </Button>
                        )}
                        <Button
                          variant="soft"
                          size="sm"
                          loading={busy}
                          disabled={!isLinked}
                          onClick={(e) => { e.stopPropagation(); sync(account) }}
                        >
                          <RefreshCw /> Sync
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[10px] text-text-muted">
                Maksimal {MAX_MARKETPLACE_ACCOUNTS} akun per platform. Lepas tautan tidak menghapus riwayat pesanan (demo).
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Performa marketplace" description="30 hari terakhir" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line text-[9px] uppercase tracking-[0.1em] text-text-muted">
                  <th className="py-2 text-left font-medium">Marketplace</th>
                  <th className="py-2 text-right font-medium">Akun</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {marketplaces.map((m) => {
                  const accounts = connections.filter((c) => c.name === m.name)
                  const linked = accounts.filter((c) => c.status === 'connected').length
                  return (
                    <tr key={m.name} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5">
                        <span className="flex items-center gap-2 text-[11px] text-text-primary">
                          <span className="size-2 rounded-full" style={{ backgroundColor: m.color }} />
                          {m.name}
                        </span>
                      </td>
                      <td className="num py-2.5 text-right text-[11px] text-text-secondary">
                        {linked}/{accounts.length}
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
                  )
                })}
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
          Sync terakhir: {latestSync ? formatDate(latestSync) : '—'}. Semua data adalah simulasi lokal.
        </p>
      </Card>
    </div>
  )
}
