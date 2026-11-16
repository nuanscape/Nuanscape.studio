import * as React from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Compass,
  ExternalLink,
  FlaskConical,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { Progress, Skeleton } from '@/components/ui/progress'
import { useContentScope } from '@/features/content/components/content-flow'
import { api, type YouTubeResearchResult, type YouTubeResearchVideo } from '@/lib/api-client'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils'
import { useToastStore } from '@/stores/app-store'

function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function ageLabel(days: number): string {
  if (days < 1) return '<1 hari'
  if (days < 30) return `${Math.round(days)} hari`
  return `${(days / 30).toFixed(1)} bln`
}

function ResearchMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">{label}</p>
      <p className="num mt-1.5 text-[20px] font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{hint}</p>
    </div>
  )
}

function VideoRow({ video }: { video: YouTubeResearchVideo }) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-3 py-3">
        <div className="flex items-start gap-3">
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            className="mt-0.5 aspect-video w-20 shrink-0 rounded-md border border-line bg-[#171717] object-cover"
          />
          <div className="min-w-0">
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 text-[12px] font-medium leading-snug text-text-primary hover:text-primary"
            >
              {video.title}
              <ExternalLink className="ml-1 inline size-3 align-[-1px]" />
            </a>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {video.breakout ? <Badge tone="success" className="text-[9px]">Breakout</Badge> : null}
              {video.smallChannel ? <Badge tone="info" className="text-[9px]">Small channel</Badge> : null}
              <Badge tone={video.outlierBasis === 'channel' ? 'primary' : 'outline'} className="text-[9px]">
                {video.outlierBasis === 'channel' ? 'Channel baseline' : 'Sample baseline'}
              </Badge>
              <span className="text-[9px] text-text-muted">{video.channelTitle}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-text-muted">{ageLabel(video.ageDays)}</td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-text-secondary">{formatDuration(video.durationSeconds)}</td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-text-primary">{formatNumber(video.views, true)}</td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-text-secondary">{formatNumber(video.viewsPerDay, true)}</td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-primary">{video.outlierRatio.toFixed(2)}x</td>
      <td className="num whitespace-nowrap px-3 py-3 text-right text-[11px] text-text-secondary">{formatNumber(video.subscriberCount, true)}</td>
    </tr>
  )
}

function LiveResults({ result }: { result: YouTubeResearchResult }) {
  const patterns = result.patterns
  const maxBucket = Math.max(1, ...patterns.durationBuckets.map((bucket) => bucket.count))
  const maxKeyword = Math.max(1, ...patterns.topKeywords.map((keyword) => keyword.count))

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-primary">Riset live YouTube</p>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-text-primary">
              {result.queries.length > 1 ? result.queries.join(' · ') : result.query ?? '-'}
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {patterns.queryCount} query · {result.windowDays} hari terakhir · region {result.regionCode} · bahasa {result.language} ·
              diambil {formatDate(result.sampledAt, 'd MMM HH:mm')}
            </p>
          </div>
          <Badge tone="success">YouTube Data API v3</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ResearchMetric
            label="Median views"
            value={formatNumber(patterns.medianViews, true)}
            hint={`dari ${patterns.sampleSize} video sampel`}
          />
          <ResearchMetric
            label="Median views/hari"
            value={formatNumber(patterns.medianViewsPerDay, true)}
            hint="kecepatan tayang sampel"
          />
          <ResearchMetric
            label="Shorts share"
            value={formatPercent(patterns.shortsShare)}
            hint="video vertikal <= 60 detik"
          />
          <ResearchMetric
            label="Breakout channel"
            value={String(patterns.breakoutCount)}
            hint={`${patterns.channelBaselineCount} channel baseline · ${result.videos.length} video`}
          />
        </div>
      </Card>

      {result.videos.length ? (
        <Card className="mt-4 p-5">
          <SectionHeader
            title="Video dengan sinyal terkuat"
            description="Diurutkan dari breakout channel, lalu kecepatan views/hari; baseline = median 10 video terakhir channel, maksimal 2 video per channel"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.1em] text-text-muted">
                  <th className="px-3 py-2.5 font-medium">Video</th>
                  <th className="px-3 py-2.5 text-right font-medium">Umur</th>
                  <th className="px-3 py-2.5 text-right font-medium">Durasi</th>
                  <th className="px-3 py-2.5 text-right font-medium">Views</th>
                  <th className="px-3 py-2.5 text-right font-medium">Views/hari</th>
                  <th className="px-3 py-2.5 text-right font-medium">Outlier</th>
                  <th className="px-3 py-2.5 text-right font-medium">Subscriber</th>
                </tr>
              </thead>
              <tbody>
                {result.videos.map((video) => <VideoRow key={video.videoId} video={video} />)}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="mt-4 flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-text-muted">
            <Compass className="size-5" />
          </span>
          <h3 className="mt-4 text-[15px] font-semibold text-text-primary">Tidak ada video pada jendela ini</h3>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-text-muted">
            YouTube tidak mengembalikan video untuk query dan rentang waktu tersebut. Coba kata kunci yang lebih
            spesifik atau perluas jendela waktu.
          </p>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Kata kunci & tag" description="Pola judul dan metadata video sampel" />
          {patterns.topKeywords.length ? (
            <div className="space-y-2.5">
              {patterns.topKeywords.slice(0, 8).map((keyword) => (
                <div key={keyword.term}>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="truncate text-text-secondary">{keyword.term}</span>
                    <span className="num text-text-primary">{keyword.count}</span>
                  </div>
                  <Progress value={(keyword.count / maxKeyword) * 100} size="sm" className="mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">Belum ada kata kunci yang menonjol.</p>
          )}
          {patterns.topTags.length ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-text-muted">Tag teratas</p>
              <div className="flex flex-wrap gap-1.5">
                {patterns.topTags.slice(0, 10).map((tag) => (
                  <Badge key={tag.tag} tone="outline" className="text-[9px]">{tag.tag} · {tag.count}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <SectionHeader title="Sebaran durasi" description="Format yang paling banyak dipakai" />
          {patterns.durationBuckets.length ? (
            <div className="space-y-3">
              {patterns.durationBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-text-secondary">{bucket.label}</span>
                    <span className="num text-text-muted">
                      {bucket.count} video · {formatNumber(bucket.medianViews, true)} views
                    </span>
                  </div>
                  <Progress value={(bucket.count / maxBucket) * 100} size="sm" className="mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">Belum ada data durasi.</p>
          )}
        </Card>
      </div>
    </>
  )
}

function ResearchSidebar({
  result,
  ideas,
  stagePath,
}: {
  result: YouTubeResearchResult | null
  ideas: { approved?: boolean }[]
  stagePath: (stage: string) => string
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title="Channel teratas" description="Kontributor views pada sampel" />
        {result?.patterns.topChannels.length ? (
          <div className="space-y-2">
            {result.patterns.topChannels.slice(0, 5).map((channel) => (
              <div key={channel.channelId} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white/[0.02] p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-text-primary">{channel.channelTitle}</p>
                  <p className="mt-0.5 text-[9px] text-text-muted">
                    {channel.videos} video · {formatNumber(channel.totalViews, true)} views
                  </p>
                </div>
                <span className="num shrink-0 text-[10px] text-text-secondary">{formatNumber(channel.subscriberCount, true)} subs</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-text-muted">Belum ada data channel.</p>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader title="Cara membaca" description="Metodologi riset live" />
        <ul className="space-y-2 text-[10px] leading-relaxed text-text-muted">
          <li>• Sumber: YouTube Data API v3, bukan data demo atau estimasi platform.</li>
          <li>• Outlier = views video dibagi median views sampel pada window yang sama.</li>
          <li>• Small channel = subscriber di bawah 20 rb; breakout = small channel dengan outlier minimal 2,5x.</li>
          <li>• Views/hari dihitung dari tanggal publikasi video, bukan proyeksi performa.</li>
          <li>• Backend menyimpan cache 1 jam; tombol riset memaksa pengambilan data terbaru.</li>
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <Target className="size-3.5 text-primary" /> Target mingguan
        </div>
        <p className="mt-2 text-[12px] text-text-primary">
          {ideas.filter((idea) => idea.approved).length} ide disetujui · {ideas.length} ide di flow ini
        </p>
        <Progress
          value={ideas.length ? Math.min(100, (ideas.filter((idea) => idea.approved).length / ideas.length) * 100) : 0}
          className="mt-2"
          size="sm"
        />
        <Button variant="soft" size="sm" className="mt-4" onClick={() => window.location.assign(stagePath('ideas'))}>
          <Sparkles /> Kembangkan jadi ide
        </Button>
      </Card>
    </div>
  )
}

export function ContentResearchPage() {
  const { format, account, ideas, stagePath } = useContentScope()
  const { push } = useToastStore()
  const isLong = format === 'long'
  const [topic, setTopic] = React.useState<string | null>(null)
  const [days, setDays] = React.useState(90)
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<YouTubeResearchResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const defaultTopic = account?.niche && account.niche !== 'General' ? account.niche : ''
  const topicValue = topic ?? defaultTopic

  const run = React.useCallback(async () => {
    const query = topicValue.trim()
    if (!query) {
      push({ title: 'Topik belum diisi', description: 'Masukkan topik atau niche yang ingin diriset.', tone: 'warning' })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await api.content.researchYouTube({ q: query, days, maxResults: 25, refresh: true })
      setResult(next)
      push({
        title: 'Riset YouTube selesai',
        description: `${next.videos.length} video live untuk "${next.query ?? query}".`,
        tone: 'success',
      })
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Riset YouTube gagal.')
    } finally {
      setLoading(false)
    }
  }, [days, push, topicValue])

  if (!isLong) {
    return (
      <div>
        <PageHeader
          title="Riset tren pendek"
          description="Riset live TikTok dan Instagram belum tersedia dari backend."
        />
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
            <Compass className="size-5" />
          </span>
          <h3 className="mt-4 text-[15px] font-semibold text-text-primary">Belum ada provider riset live</h3>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-text-muted">
            Halaman ini tidak lagi memakai data simulasi. Riset live saat ini tersedia untuk YouTube long-form
            melalui YouTube Data API v3.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => window.location.assign('/app/content/long-form/research')}
          >
            <ArrowUpRight /> Buka riset YouTube
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Riset YouTube"
        description="Temukan tren, kompetitor, dan peluang format dari data live YouTube untuk channel panjang."
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
                value={topicValue}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void run()}
                placeholder="Contoh: lofi music, sejarah Indonesia, produktivitas"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="w-full lg:w-40">
            <label className="mb-1.5 block text-[11px] font-medium text-text-secondary">Jendela waktu</label>
            <Select value={String(days)} onChange={(event) => setDays(Number(event.target.value))} className="h-10">
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="365">1 tahun</option>
            </Select>
          </div>
          <Button onClick={() => void run()} loading={loading} className="h-10">
            <Compass /> {loading ? 'Mengambil data' : 'Riset sekarang'}
          </Button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
          Data live YouTube Data API v3 · query awal mengikuti niche akun{account ? ` ${account.handle}` : ''} ·
          hasil di-cache backend 1 jam, tombol ini meminta data terbaru.
        </p>
      </Card>

      {error ? (
        <Card className="mt-4 border-danger/25 bg-danger/[0.04] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <p className="text-[12px] font-semibold text-text-primary">Riset YouTube gagal</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{error}</p>
              <p className="mt-1 text-[10px] text-text-muted">
                Pastikan channel YouTube sudah terhubung lewat OAuth atau isi YOUTUBE_API_KEY di backend.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Card className="mt-4 space-y-3 p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : result && !result.configured ? (
        <Card className="mt-4 p-5">
          <p className="text-[12px] font-semibold text-text-primary">Riset belum siap</p>
          <p className="mt-1 text-[11px] text-text-secondary">{result.reason}</p>
        </Card>
      ) : result ? (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
          <div className="min-w-0">
            <LiveResults result={result} />
          </div>
          <ResearchSidebar result={result} ideas={ideas} stagePath={stagePath} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
          <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.06] text-primary">
              <FlaskConical className="size-5" />
            </span>
            <h3 className="mt-4 text-[15px] font-semibold text-text-primary">Mulai riset live</h3>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-text-muted">
              Masukkan topik untuk melihat video kompetitor, views per hari, rasio outlier, kata kunci, dan
              sebaran durasi. Semua angka berasal dari YouTube Data API v3.
            </p>
          </Card>
          <ResearchSidebar result={null} ideas={ideas} stagePath={stagePath} />
        </div>
      )}
    </div>
  )
}
