import * as React from 'react'
import { ArrowUpRight, Compass, Search, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { Progress, Skeleton } from '@/components/ui/progress'
import { useContentScope } from '@/features/content/components/content-flow'
import type { ContentFormat } from '@/types'

const trending: Record<ContentFormat, { name: string; growth: number; volume: string }[]> = {
  long: [
    { name: 'Agentic AI untuk UMKM', growth: 186, volume: '42.1 rb' },
    { name: 'AI video workflow', growth: 142, volume: '36.8 rb' },
    { name: 'Lofi productivity', growth: 64, volume: '88.3 rb' },
    { name: 'No-code automation', growth: 97, volume: '24.5 rb' },
    { name: 'Personal finance AI', growth: 73, volume: '19.7 rb' },
  ],
  short: [
    { name: 'Hook 3 detik: AI workflow', growth: 214, volume: '128 rb' },
    { name: 'POV: admin UMKM pakai agent', growth: 168, volume: '96.4 rb' },
    { name: 'Before-after otomasi', growth: 132, volume: '71.2 rb' },
    { name: 'Audio trending: lo-fi beat', growth: 118, volume: '54.9 rb' },
    { name: 'Checklist 5 detik', growth: 88, volume: '33.1 rb' },
  ],
}

interface ResearchResult {
  topic: string
  platform: string
  opportunity: number
  trends: { title: string; volume: string; growth: number }[]
  keywords: { term: string; score: number }[]
  gaps: { title: string; detail: string }[]
  audience: string[]
  formats: string[]
}

function buildResult(topic: string, platform: string, format: ContentFormat): ResearchResult {
  const seed = topic.length % 4
  const names = ['Cara mulai', 'Kesalahan umum', 'Studi kasus', 'Perbandingan tools', 'Template gratis', 'Di balik layar']
  return {
    topic,
    platform,
    opportunity: 68 + seed * 6,
    trends: [
      { title: `${topic}: ${names[seed]}`, volume: `${18 + seed * 7}.${seed + 2} rb`, growth: 124 + seed * 9 },
      { title: `${topic} untuk pemula`, volume: `${12 + seed * 4}.4 rb`, growth: 86 + seed * 7 },
      { title: `${topic} vs alternatif`, volume: `${9 + seed * 3}.1 rb`, growth: 64 + seed * 5 },
      { title: `Kesalahan ${topic.toLowerCase()}`, volume: `${7 + seed * 2}.8 rb`, growth: 52 + seed * 4 },
    ],
    keywords: [
      { term: topic.toLowerCase(), score: 92 - seed },
      { term: `${topic.toLowerCase()} indonesia`, score: 84 - seed },
      { term: `${topic.toLowerCase()} tutorial`, score: 79 - seed },
      { term: `${topic.toLowerCase()} gratis`, score: 71 - seed },
      { term: `${topic.toLowerCase()} 2026`, score: 66 - seed },
      { term: `tools ${topic.toLowerCase()}`, score: 61 - seed },
    ],
    gaps: [
      {
        title: 'Sedikit studi kasus lokal',
        detail: `Konten ${topic} masih didominasi contoh luar negeri. Peluang membuat studi kasus UMKM Indonesia.`,
      },
      {
        title: 'Belum ada breakdown biaya',
        detail: 'Audiens sering bertanya soal biaya nyata. Konten transparan biaya berpotensi tinggi disimpan.',
      },
      format === 'long'
        ? {
            title: 'Belum ada episode mendalam',
            detail: 'Topik ini masih dibahas sebagai tips singkat. Format 8–12 menit dengan bab jelas belum tergarap.',
          }
        : {
            title: 'Hook belum variatif',
            detail: 'Mayoritas konten memakai hook yang sama. Uji hook POV dan before-after untuk menahan 3 detik pertama.',
          },
    ],
    audience: [
      'Pemilik usaha kecil yang ingin hemat waktu operasional.',
      'Kreator yang mencari alur produksi konten lebih cepat.',
      'Profesional yang baru mulai memakai AI di pekerjaan harian.',
    ],
    formats:
      format === 'long'
        ? ['Deep-dive 10–14 menit', 'Studi kasus 8–12 menit', 'Tutorial bertahap + chapter', 'Lofi session panjang']
        : ['Tutorial vertikal 30–45 detik', 'POV 15–20 detik', 'Before-after 20 detik', 'Carousel checklist 5 slide'],
  }
}

export function ContentResearchPage() {
  const { format, meta, ideas, stagePath } = useContentScope()
  const [topic, setTopic] = React.useState('Agentic AI untuk UMKM')
  const [platform, setPlatform] = React.useState<string>(meta.platforms[0])
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<ResearchResult | null>(null)
  const isLong = format === 'long'

  const run = () => {
    if (!topic.trim()) return
    setLoading(true)
    setResult(null)
    window.setTimeout(() => {
      setResult(buildResult(topic.trim(), platform, format))
      setLoading(false)
    }, 900)
  }

  return (
    <div>
      <PageHeader
        title={isLong ? 'Riset konten panjang' : 'Riset tren pendek'}
        description={
          isLong
            ? 'Temukan peluang topik, keyword, dan sudut pandang untuk video YouTube berdurasi panjang.'
            : 'Pantau tren audio, format, dan hook yang sedang naik untuk TikTok dan Instagram.'
        }
        actions={
          <Button variant="secondary" onClick={() => window.location.assign('/app/monitor')}>
            <Sparkles /> Buka Agent Monitor
          </Button>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-text-secondary">Topik atau niche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && run()}
                placeholder={isLong ? 'Contoh: AI untuk produktivitas UMKM' : 'Contoh: hook AI agent untuk UMKM'}
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="w-full lg:w-44">
            <label className="mb-1.5 block text-[11px] font-medium text-text-secondary">Platform</label>
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-10">
              {meta.platforms.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </Select>
          </div>
          <Button onClick={run} loading={loading} className="h-10">
            <Compass /> {isLong ? 'Riset sekarang' : 'Cek tren'}
          </Button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
          {isLong
            ? 'Hasil riset di halaman ini adalah simulasi demo berbasis pola contoh. Gunakan sebagai kerangka episode, verifikasi angka sebelum dipublikasikan.'
            : 'Hasil tren di halaman ini adalah simulasi demo. Pola audio dan hook bukan data live dari platform, verifikasi sebelum produksi batch.'}
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {loading ? (
            <Card className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ) : result ? (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-primary">Riset demo</p>
                    <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-text-primary">{result.topic}</h2>
                    <p className="mt-0.5 text-[11px] text-text-muted">{result.platform} · 4 peluang teratas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Opportunity score</p>
                    <p className="num text-[24px] font-semibold text-primary">{result.opportunity}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {result.trends.map((t) => (
                    <div key={t.title} className="rounded-xl border border-line bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-medium text-text-primary">{t.title}</p>
                          <p className="mt-0.5 text-[10px] text-text-muted">Estimasi volume {t.volume}</p>
                        </div>
                        <Badge tone="primary"><TrendingUp /> +{t.growth}%</Badge>
                      </div>
                      <Progress value={Math.min(100, t.growth)} size="sm" className="mt-2.5" />
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="p-5">
                  <SectionHeader title="Keyword peluang" description="Skor relevansi relatif" />
                  <div className="space-y-2.5">
                    {result.keywords.map((k) => (
                      <div key={k.term}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-secondary">{k.term}</span>
                          <span className="num text-text-primary">{k.score}</span>
                        </div>
                        <Progress value={k.score} size="sm" className="mt-1" />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <SectionHeader title="Content gap" description="Sudut yang belum tergarap" />
                  <div className="space-y-2.5">
                    {result.gaps.map((g) => (
                      <div key={g.title} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                        <p className="text-[11px] font-medium text-text-primary">{g.title}</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted">{g.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="p-5">
                  <SectionHeader title="Audiens" description="Siapa yang paling relevan" />
                  <ul className="space-y-2">
                    {result.audience.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-[11px] leading-relaxed text-text-secondary">
                        <Users className="mt-0.5 size-3.5 shrink-0 text-primary" /> {a}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-5">
                  <SectionHeader title="Format disarankan" description={isLong ? 'Berdasarkan struktur long-form' : 'Berdasarkan perilaku scroll'} />
                  <div className="flex flex-wrap gap-2">
                    {result.formats.map((f) => (
                      <Badge key={f} tone="outline" className="py-1">{f}</Badge>
                    ))}
                  </div>
                  <Button variant="soft" size="sm" className="mt-4" onClick={() => window.location.assign(stagePath('ideas'))}>
                    <Sparkles /> Kembangkan jadi ide
                  </Button>
                </Card>
              </div>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
                <Compass className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-text-primary">{isLong ? 'Mulai riset episode' : 'Mulai riset tren'}</h3>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-text-muted">
                {isLong
                  ? 'Masukkan topik di atas untuk melihat peluang, keyword, dan struktur episode. Semua hasil adalah simulasi demo.'
                  : 'Masukkan topik di atas untuk melihat tren audio, hook, dan sudut pendek. Semua hasil adalah simulasi demo.'}
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Sedang naik" description={isLong ? 'Niche contoh minggu ini' : 'Tren pendek minggu ini'} />
            <div className="space-y-2.5">
              {trending[format].map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setTopic(t.name)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] p-2.5 text-left transition-colors hover:border-primary/30"
                >
                  <span className="num grid size-5 shrink-0 place-items-center rounded-md border border-line text-[9px] text-text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-text-primary">{t.name}</p>
                    <p className="text-[9px] text-text-muted">{t.volume} views</p>
                  </div>
                  <Badge tone="primary">+{t.growth}%</Badge>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Cara membaca hasil" description="Transparansi metodologi" />
            <ul className="space-y-2 text-[10px] leading-relaxed text-text-muted">
              <li>• Opportunity score menggabungkan pertumbuhan, volume, dan tingkat persaingan contoh.</li>
              <li>• Angka volume adalah estimasi tampilan, bukan statistik resmi platform.</li>
              <li>• Content gap berasal dari pola contoh, bukan audit kompetitor langsung.</li>
              <li>• Selalu cek tren terbaru sebelum memproduksi konten.</li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <Target className="size-3.5 text-primary" /> Target mingguan
            </div>
            <p className="mt-2 text-[12px] text-text-primary">
              {ideas.filter((idea) => idea.approved).length} ide disetujui · {ideas.length} ide di flow ini
            </p>
            <Progress value={ideas.length ? Math.min(100, (ideas.filter((idea) => idea.approved).length / ideas.length) * 100) : 0} className="mt-2" size="sm" />
            <button onClick={() => window.location.assign('/app/monitor')} className="mt-3 flex items-center gap-1 text-[10px] text-primary">
              Buka Agent Monitor <ArrowUpRight className="size-3" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
