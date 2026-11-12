import * as React from 'react'
import { Check, FileText, Sparkles, Wand2 } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { ContentStatusBadge, PlatformChip } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import { cn, formatDate } from '@/lib/utils'
import type { ContentFormat } from '@/types'

function generateScript(title: string, platform: string, itemFormat: string, format: ContentFormat) {
  if (format === 'long') {
    return `JUDUL: ${title}
TARGET DURASI: 8–12 menit · ${platform}

COLD OPEN (0:00–0:30)
Buka dengan hasil nyata atau pertanyaan besar. Sebut apa yang akan penonton dapat di akhir video.

CHAPTER 1 — MASALAH (0:30–2:30)
- Jelaskan konteks dan siapa yang paling terdampak.
- Tunjukkan biaya atau waktu yang hilang dengan contoh konkret.

CHAPTER 2 — KERANGKA SOLUSI (2:30–6:00)
1. Langkah pertama — alasan + demo singkat.
2. Langkah kedua — implementasi dan angka pendukung.
3. Langkah ketiga — kesalahan umum dan cara menghindarinya.

CHAPTER 3 — STUDI KASUS (6:00–9:00)
Tampilkan studi kasus lokal, sebelum-sesudah, dan pelajaran yang bisa dipakai ulang.

PENUTUP + CTA (9:00–10:00)
Ringkas 3 poin utama, lalu arahkan ke playlist atau episode lanjutan.

CATATAN PRODUKSI
- Format: ${itemFormat}
- Visual: layar demo, B-roll, chapter card tiap bab
- Thumbnail: wajah + 3 kata besar + angka hasil
- Deskripsi: ringkasan 3 bab + timestamp otomatis
- Klaim angka harus disertai sumber. Script ini kerangka demo, bukan naskah final.`
  }

  return `HOOK (0–3 detik)
"${title}" — kalimat pertama harus menghentikan scroll dan langsung memberi janji.

KONTEKS (3–8 detik)
Tunjukkan situasi nyata yang relatable. Visual cepat, teks di layar 3–5 kata.

BEAT 1 (8–20 detik)
Poin utama + demo singkat. Jangan jelaskan semuanya, sisakan rasa penasaran.

BEAT 2 (20–35 detik)
Kesalahan umum atau before-after. Tambahkan teks overlay untuk penonton tanpa audio.

CTA (35–45 detik)
Minta simpan atau komentar dengan kata kunci. Arahkan ke konten lanjutan.

CAPTION
2 baris ringkas + 3–5 hashtag relevan. Sertakan CTA yang sama dengan video.

CATATAN PRODUKSI
- Platform: ${platform}
- Format: ${itemFormat}
- Rasio: 9:16, teks aman di area tengah
- B-roll: screen recording vertikal, close-up ekspresi
- Uji 2–3 variasi hook sebelum batch final
- Klaim angka harus disertai sumber. Script ini kerangka demo, bukan naskah final.`
}

export function ContentScriptsPage() {
  const { updateScript, updateStatus } = useContentStore()
  const { format, items, account } = useContentScope()
  const { push } = useToastStore()
  const isLong = format === 'long'
  const [selectedId, setSelectedId] = React.useState(items[0]?.id)
  const selected = items.find((i) => i.id === selectedId) ?? items[0]
  const [draft, setDraft] = React.useState(selected?.script ?? '')

  React.useEffect(() => {
    setDraft(selected?.script ?? '')
  }, [selected?.id, selected?.script])

  if (!selected) {
    return (
      <div>
        <PageHeader
          title={isLong ? 'Naskah long-form' : 'Hook & naskah pendek'}
          description={`Belum ada konten ${isLong ? 'long-form' : 'short-form'} untuk ditulis${account ? ` di ${account.handle}` : ''}.`}
        />
        <Card className="p-10 text-center text-sm text-text-muted">Tambahkan konten dari halaman Ide atau Studio.</Card>
      </div>
    )
  }

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / 140))
  const seconds = Math.max(15, Math.round(words / 2.5))
  const scripted = items.filter((i) => i.script)

  const save = () => {
    updateScript(selected.id, draft)
    if (draft.trim() && selected.status !== 'Published') updateStatus(selected.id, 'Script Ready')
    push({ title: 'Script disimpan', description: `${selected.title} · ${words} kata`, tone: 'success' })
  }

  const generate = () => {
    setDraft(generateScript(selected.title, selected.platform, selected.format, format))
    push({ title: isLong ? 'Kerangka naskah dibuat' : 'Kerangka hook dibuat', description: 'Kerangka demo. Edit sebelum produksi.', tone: 'info' })
  }

  return (
    <div>
      <PageHeader
        title={isLong ? 'Naskah long-form' : 'Hook & naskah pendek'}
        description={
          isLong
            ? 'Susun naskah episode dengan chapter, timestamp, dan alur yang konsisten.'
            : 'Tulis hook, beat cepat, dan caption untuk produksi batch vertikal.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={generate}>
              <Wand2 /> Buat kerangka
            </Button>
            <Button onClick={save}>
              <Check /> Simpan script
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <Card className="p-3">
          <div className="px-2 pb-2 pt-1">
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted">Konten</p>
            <p className="mt-0.5 text-[11px] text-text-secondary">{scripted.length} sudah punya script</p>
          </div>
          <div className="max-h-[560px] space-y-1 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'w-full rounded-lg border p-2.5 text-left transition-colors',
                  selected.id === item.id
                    ? 'border-primary/30 bg-primary/[0.06]'
                    : 'border-transparent hover:border-line hover:bg-white/[0.03]',
                )}
              >
                <p className="line-clamp-2 text-[11px] font-medium leading-snug text-text-primary">{item.title}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <PlatformChip platform={item.platform} />
                  <span className="truncate text-[9px] text-text-muted">{resolveAccount(item)?.handle}</span>
                  {item.script ? <FileText className="size-3 shrink-0 text-primary" /> : <span className="shrink-0 text-[9px] text-text-muted">Belum ada</span>}
                </div>
                <div className="mt-1.5">
                  <ContentStatusBadge status={item.status} className="text-[9px]" />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <PlatformChip platform={selected.platform} />
                  <ContentStatusBadge status={selected.status} />
                  <Badge tone="outline">{selected.format}</Badge>
                </div>
                <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-text-primary">{selected.title}</h2>
                <p className="mt-1 text-[10px] text-text-muted">
                  {resolveAccount(selected)?.handle} · niche {selected.niche} · jadwal {formatDate(selected.scheduledAt, 'd MMM yyyy HH:mm')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-right">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Kata</p>
                  <p className="num mt-0.5 text-[14px] text-text-primary">{words}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Estimasi</p>
                  <p className="num mt-0.5 text-[14px] text-primary">
                    {isLong ? `${minutes} mnt` : `${seconds} dtk`}
                  </p>
                </div>
              </div>
            </div>
            {selected.caption ? (
              <div className="mt-3 rounded-lg border border-line bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Caption tersimpan</p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{selected.caption}</p>
                {selected.hashtags?.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.hashtags.map((h) => <Badge key={h} tone="outline">#{h}</Badge>)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader
                title={isLong ? 'Naskah episode' : 'Hook & beat'}
                description={isLong ? 'Struktur cold open → chapter → CTA' : 'Struktur hook → beat → CTA + caption'}
                className="mb-0"
              />
              <span className="text-[10px] text-text-muted">Tersimpan lokal</span>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={16}
              placeholder="Tulis script di sini, atau klik Buat kerangka untuk mulai dari template…"
              className="font-sans text-[12px] leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-text-muted">
                Script bukan jaminan performa. Cek klaim dan sumber sebelum publish.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDraft('')}>
                  Kosongkan
                </Button>
                <Button size="sm" onClick={save}>
                  <Check /> Simpan
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-[12px] font-medium text-text-primary">{isLong ? 'Butuh variasi pembuka?' : 'Butuh variasi hook?'}</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(isLong
                ? [
                    'Buka dengan hasil akhir, lalu jelaskan prosesnya.',
                    'Angka konkret + transformasi sebelum-sesudah.',
                    'Pertanyaan besar yang dijawab di chapter 2.',
                  ]
                : [
                    'Pertanyaan mengejutkan tentang topik ini.',
                    'Angka konkret + hasil yang bisa dibayangkan.',
                    'Kesalahan yang sering dilakukan pemula.',
                  ]
              ).map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setDraft((d) => `${isLong ? 'COLD OPEN ALTERNATIF' : 'HOOK ALTERNATIF'}\n${h}\n\n${d}`)
                    push({ title: isLong ? 'Pembuka ditambahkan' : 'Hook ditambahkan', description: 'Ditempatkan di bagian atas script.', tone: 'info' })
                  }}
                  className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-left text-[10px] leading-relaxed text-text-secondary transition-colors hover:border-primary/30 hover:text-text-primary"
                >
                  {h}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
