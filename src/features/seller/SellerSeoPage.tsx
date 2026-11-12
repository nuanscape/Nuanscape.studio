import * as React from 'react'
import { CheckCircle2, Copy, Globe2, Lightbulb, Search, Sparkles, Wand2 } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadialScore } from '@/components/charts/charts'
import { MarketplaceBadge } from '@/features/seller/components/seller-ui'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { cn, formatPercent } from '@/lib/utils'

export function SellerSeoPage() {
  const { products, updateProduct } = useSellerStore()
  const { push } = useToastStore()
  const [selectedId, setSelectedId] = React.useState(products[0]?.id ?? '')
  const [query, setQuery] = React.useState('')

  const selected = products.find((p) => p.id === selectedId) ?? products[0]
  const avgSeo = products.length ? products.reduce((a, p) => a + p.seoScore, 0) / products.length : 0
  const avgGeo = products.length ? products.reduce((a, p) => a + p.geoScore, 0) / products.length : 0
  const below = products.filter((p) => p.seoScore < 70).length

  const list = products
    .filter((p) => !query.trim() || `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.seoScore - b.seoScore)

  const titleSuggestion = selected ? `${selected.name} ${selected.category} Premium | ${selected.marketplace === 'Both' ? 'TikTok Seller & Shopee' : selected.marketplace}` : ''
  const descSuggestion = selected
    ? `${selected.name} dengan desain ${selected.category.toLowerCase()} yang rapi dan tahan lama. Cocok untuk ruang kerja minimalis. Harga ${selected.price.toLocaleString('id-ID')} rupiah, stok terbatas.`
    : ''

  const checklist = selected
    ? [
        { label: 'Judul memuat kata kunci utama', done: selected.seoScore >= 70 },
        { label: 'Deskripsi menjawab kebutuhan pembeli', done: selected.seoScore >= 75 },
        { label: 'Atribut produk lengkap', done: selected.geoScore >= 70 },
        { label: 'Gambar utama jelas dan konsisten', done: selected.seoScore >= 65 },
        { label: 'Harga kompetitif di kategori', done: selected.geoScore >= 60 },
        { label: 'Ulasan dan rating cukup', done: selected.geoScore >= 75 },
      ]
    : []

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      push({ title: 'Disalin', description: `${label} disalin ke clipboard.`, tone: 'success' })
    } catch {
      push({ title: 'Gagal menyalin', description: 'Clipboard tidak tersedia di browser ini.', tone: 'danger' })
    }
  }

  return (
    <div>
      <PageHeader
        title="SEO & GEO"
        description="Periksa kualitas judul, deskripsi, dan atribut produk untuk pencarian marketplace dan AI."
        actions={
          <Button
            variant="secondary"
            onClick={() => push({ title: 'Audit dijalankan', description: 'Skor dihitung ulang dari data produk saat ini.', tone: 'info' })}
          >
            <Sparkles /> Jalankan audit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rata-rata SEO" value={Math.round(avgSeo)} deltaLabel="dari 100" icon={<Search />} accent="orange" />
        <MetricCard label="Rata-rata GEO" value={Math.round(avgGeo)} deltaLabel="kesiapan untuk AI search" icon={<Globe2 />} accent="yellow" />
        <MetricCard label="Perlu perbaikan" value={`${below} produk`} deltaLabel="SEO di bawah 70" icon={<Lightbulb />} tone={below ? 'warning' : 'positive'} accent="teal" />
        <MetricCard label="Produk dianalisis" value={`${products.length} SKU`} deltaLabel="di semua marketplace" icon={<Search />} accent="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Prioritas perbaikan" description="Skor terendah lebih dulu" action={<Badge tone="outline">{list.length} produk</Badge>} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk…"
            className="mb-3 h-9 w-full rounded-lg border border-line bg-white/[0.02] px-3 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-primary/40"
          />
          <div className="space-y-2">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition',
                  p.id === selected?.id ? 'border-primary/30 bg-primary/[0.05]' : 'border-line bg-white/[0.02] hover:border-line-strong',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-text-primary">{p.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[9px] text-text-muted">
                      {p.sku} <MarketplaceBadge marketplace={p.marketplace} />
                    </p>
                  </div>
                  <Badge tone={p.seoScore >= 80 ? 'primary' : p.seoScore >= 70 ? 'warning' : 'danger'}>{p.seoScore}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[9px] text-text-muted"><span>SEO</span><span className="num">{p.seoScore}</span></div>
                    <Progress value={p.seoScore} className="mt-1 h-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-text-muted"><span>GEO</span><span className="num">{p.geoScore}</span></div>
                    <Progress value={p.geoScore} className="mt-1 h-1" />
                  </div>
                </div>
              </button>
            ))}
            {list.length === 0 ? <p className="py-6 text-center text-[11px] text-text-muted">Produk tidak ditemukan.</p> : null}
          </div>
        </Card>

        <Card className="p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Produk terpilih</p>
                  <h3 className="mt-1 text-[15px] font-semibold text-text-primary">{selected.name}</h3>
                  <p className="text-[10px] text-text-muted">{selected.sku} · {selected.category}</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-center">
                    <RadialScore value={selected.seoScore} size={78} label="SEO" />
                  </div>
                  <div className="text-center">
                    <RadialScore value={selected.geoScore} size={78} label="GEO" color="#6DBBFF" />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">Saran judul</p>
                    <Button variant="ghost" size="icon-sm" onClick={() => copy(titleSuggestion, 'Judul')}><Copy /></Button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{titleSuggestion}</p>
                  <p className="mt-1 text-[9px] text-text-muted">{titleSuggestion.length} karakter · target 60–90</p>
                </div>
                <div className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">Saran deskripsi</p>
                    <Button variant="ghost" size="icon-sm" onClick={() => copy(descSuggestion, 'Deskripsi')}><Copy /></Button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{descSuggestion}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">Checklist</p>
                <div className="space-y-1.5">
                  {checklist.map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-[11px]">
                      <CheckCircle2 className={cn('size-3.5', c.done ? 'text-primary' : 'text-text-muted/40')} />
                      <span className={c.done ? 'text-text-secondary' : 'text-text-muted'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/[0.04] p-2.5">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <p className="text-[10px] leading-relaxed text-text-muted">
                  Saran dibuat dari template nama, kategori, dan harga — bukan hasil verifikasi AI.
                  Skor estimasi dan tidak menjamin peringkat marketplace.
                </p>
              </div>

              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => {
                  updateProduct(selected.id, {
                    seoScore: Math.min(100, selected.seoScore + 5),
                    geoScore: Math.min(100, selected.geoScore + 4),
                  })
                  push({ title: 'Simulasi optimasi', description: 'Skor dinaikkan +5 SEO / +4 GEO secara lokal.', tone: 'info' })
                }}
              >
                <Wand2 /> Simulasikan optimasi
              </Button>
            </>
          ) : (
            <p className="text-[11px] text-text-muted">Belum ada produk.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Cara skor dihitung" description="Transparan agar tidak menyesatkan" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { t: 'SEO score', d: 'Kelengkapan judul, kata kunci, deskripsi, dan gambar. Rentang 0–100.' },
            { t: 'GEO score', d: 'Kesiapan atribut untuk AI search: struktur data, kejelasan manfaat, rating.' },
            { t: 'Bukan jaminan', d: 'Peringkat aktual ditentukan algoritma marketplace dan kompetisi.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
              <p className="text-[11px] font-medium text-text-primary">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <p className="text-[10px] text-text-muted">Rata-rata skor gabungan</p>
          <p className="num text-[12px] text-primary">{formatPercent((avgSeo + avgGeo) / 2)}</p>
        </div>
      </Card>
    </div>
  )
}
