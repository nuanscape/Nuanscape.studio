import * as React from 'react'
import { Download, FileText, Film, Image as ImageIcon, Plus, Search, Upload } from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { PlatformChip } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { AssetModal } from '@/features/content/components/asset-modal'
import { useToastStore } from '@/stores/app-store'
import type { LibraryAsset } from '@/types'
import { formatDate } from '@/lib/utils'

const typeIcon: Record<LibraryAsset['type'], React.ReactNode> = {
  Video: <Film className="size-4" />,
  Image: <ImageIcon className="size-4" />,
  Thumbnail: <ImageIcon className="size-4" />,
  Script: <FileText className="size-4" />,
  Caption: <FileText className="size-4" />,
}

const typeColor: Record<LibraryAsset['type'], string> = {
  Video: '#F5D64B',
  Image: '#6DBBFF',
  Thumbnail: '#FFD166',
  Script: '#FFE9A3',
  Caption: '#FF9E7D',
}

export function ContentLibraryPage() {
  const { format, meta, library, items, accounts, account } = useContentScope()
  const isLong = format === 'long'
  const { push } = useToastStore()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [type, setType] = React.useState<'all' | LibraryAsset['type']>('all')

  const filtered = library
    .filter((a) => type === 'all' || a.type === type)
    .filter((a) => !query.trim() || a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const counts = (t: LibraryAsset['type']) => library.filter((a) => a.type === t).length

  return (
    <div>
      <PageHeader
        title={isLong ? 'Library long-form' : 'Library short-form'}
        description={
          isLong
            ? `Master video, thumbnail, naskah, dan aset episode${account ? ` ${account.handle}` : ''} dalam satu tempat.`
            : `Klip vertikal, caption, dan hook${account ? ` ${account.handle}` : ''} untuk produksi batch dalam satu tempat.`
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Upload /> Tambah aset
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total aset" value={`${library.length} file`} deltaLabel={`${accounts.length} akun · ${meta.platforms.join(' & ')}`} icon={<Film />} accent="teal" />
        <MetricCard label="Video" value={`${counts('Video')} file`} deltaLabel={isLong ? 'master & cut' : 'klip & cut'} icon={<Film />} accent="yellow" />
        <MetricCard label="Visual" value={`${counts('Image') + counts('Thumbnail')} file`} deltaLabel={isLong ? 'gambar & thumbnail' : 'cover & frame'} icon={<ImageIcon />} accent="pink" />
        <MetricCard label="Teks" value={`${counts('Script') + counts('Caption')} file`} deltaLabel={isLong ? 'naskah & deskripsi' : 'hook & caption'} icon={<FileText />} accent="orange" />
      </div>

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Segmented
            size="sm"
            value={type}
            onChange={setType}
            options={[
              { label: 'Semua', value: 'all' },
              { label: 'Video', value: 'Video' },
              { label: 'Visual', value: 'Image' },
              { label: 'Script', value: 'Script' },
            ]}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama file…" className="h-9 pl-8 text-xs" />
          </div>
          <Button variant="soft" size="sm" onClick={() => setOpen(true)}>
            <Plus /> Tambah
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            onClick={() => setOpen(true)}
            className="ring-focus flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white/[0.01] text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-primary"
          >
            <Upload className="size-5" />
            <span className="text-[11px] font-medium">Tambah aset baru</span>
            <span className="text-[9px]">Metadata demo</span>
          </button>

          {filtered.map((asset) => {
            const linked = items.find((i) => i.id === asset.contentId)
            return (
              <div key={asset.id} className="group overflow-hidden rounded-xl border border-line bg-white/[0.02]">
                <div
                  className="flex h-[92px] items-end p-3"
                  style={{
                    background: `radial-gradient(100% 100% at 100% 0%, ${typeColor[asset.type]}22, transparent 60%), linear-gradient(160deg, #1A1A1A, #06192b)`,
                  }}
                >
                  <span
                    className="grid size-8 place-items-center rounded-lg border border-white/10 bg-black/20 backdrop-blur"
                    style={{ color: typeColor[asset.type] }}
                  >
                    {typeIcon[asset.type]}
                  </span>
                  <Badge tone="outline" className="ml-auto border-white/15 text-white/70">{asset.type}</Badge>
                </div>
                <div className="p-3">
                  <p className="truncate text-[11px] font-medium text-text-primary" title={asset.name}>{asset.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <PlatformChip platform={asset.platform} />
                    <span className="truncate text-[9px] text-text-muted">{resolveAccount(asset)?.handle}</span>
                    <span className="shrink-0 text-[9px] text-text-muted">{asset.size}</span>
                  </div>
                  {linked ? (
                    <p className="mt-1.5 truncate text-[9px] text-text-muted">Terkait: {linked.title}</p>
                  ) : (
                    <p className="mt-1.5 text-[9px] text-text-muted">Belum ditautkan</p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
                    <span className="text-[9px] text-text-muted">{formatDate(asset.createdAt, 'd MMM yyyy')}</span>
                    <button
                      onClick={() => push({ title: 'Metadata aset', description: 'Unduhan file tidak tersedia pada demo ini.', tone: 'info' })}
                      className="flex items-center gap-1 text-[9px] text-primary hover:underline"
                    >
                      <Download className="size-3" /> Detail
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 pb-10 text-center">
            <p className="text-sm text-text-primary">Tidak ada aset ditemukan.</p>
            <p className="mt-1 text-[11px] text-text-muted">Coba kata kunci lain atau tambahkan aset baru.</p>
          </div>
        ) : null}

        <div className="border-t border-line px-4 py-3">
          <p className="text-[10px] text-text-muted">
            Library menyimpan metadata demo di browser. File asli tidak diunggah atau disimpan.
          </p>
        </div>
      </Card>

      <SectionHeader
        className="mt-4"
        title="Tips organisasi"
        description="Agar library tetap mudah dicari saat produksi"
        action={<span className="text-[10px] text-text-muted">3 aturan</span>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { t: 'Nama file konsisten', d: 'Gunakan pola topik-format-versi, misal lofi-short-v3.mp4.' },
          { t: 'Tautkan ke konten', d: 'Aset yang terhubung memudahkan revisi dan reuse.' },
          { t: 'Arsipkan yang usang', d: 'Simpan versi final saja agar tidak bingung saat publish.' },
        ].map((x) => (
          <Card key={x.t} className="p-4">
            <p className="text-[11px] font-medium text-text-primary">{x.t}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{x.d}</p>
          </Card>
        ))}
      </div>

      <AssetModal open={open} onClose={() => setOpen(false)} format={format} />
    </div>
  )
}
