import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCircle2, Clapperboard, Sparkles } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { PlatformChip, platformColor } from '@/features/content/components/content-ui'
import { useContentScope } from '@/features/content/components/content-flow'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import type { ContentFormat, Platform } from '@/types'
import { cn } from '@/lib/utils'

const templatesByFormat: Record<ContentFormat, { name: string; format: string; desc: string }[]> = {
  long: [
    { name: 'Deep-dive episode', format: 'Long-form', desc: 'Pembahasan mendalam + chapter dan timestamp.' },
    { name: 'Documentary', format: 'Documentary', desc: 'Narasi cerita panjang dengan studi kasus.' },
    { name: 'Tutorial bertahap', format: 'Tutorial bertahap', desc: 'Langkah demi langkah untuk topik kompleks.' },
    { name: 'Lofi session', format: 'Lofi session', desc: 'Sesi panjang untuk fokus dan relaksasi.' },
  ],
  short: [
    { name: 'Short-form tutorial', format: 'Short-form tutorial', desc: 'Hook cepat, 3 poin, CTA.' },
    { name: 'Carousel edukasi', format: 'Carousel', desc: 'Slide ringkas yang mudah disimpan.' },
    { name: 'Reels behind the scenes', format: 'Reels', desc: 'Proses nyata dan human side.' },
    { name: 'Before-after', format: 'Before-after', desc: 'Transformasi cepat dalam 20 detik.' },
  ],
}

const statuses = ['Draft', 'Script Ready', 'Production', 'Editing', 'Review', 'Ready to Publish'] as const

export function ContentStudioPage() {
  const { format, meta, accounts, accountId, stagePath } = useContentScope()
  const templates = templatesByFormat[format]
  const isLong = format === 'long'
  const { addContent } = useContentStore()
  const { push } = useToastStore()
    const navigate = useNavigate()
  const [title, setTitle] = React.useState('')
  const [platform, setPlatform] = React.useState<Platform>(meta.platforms[0])
  const [account, setAccount] = React.useState(accountId ?? accounts[0]?.id ?? '')
  const [niche, setNiche] = React.useState('Agentic AI')
  const [formatName, setFormatName] = React.useState(templates[0].format)
  const [status, setStatus] = React.useState<(typeof statuses)[number]>('Draft')
  const [schedule, setSchedule] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    d.setHours(19, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [caption, setCaption] = React.useState('')
  const [hashtags, setHashtags] = React.useState('')
  const [error, setError] = React.useState('')

  const pickPlatform = (value: Platform) => {
    setPlatform(value)
    const next = accounts.find((entry) => entry.platform === value)
    if (next) setAccount(next.id)
  }

  const pickAccount = (id: string) => {
    setAccount(id)
    const next = accounts.find((entry) => entry.id === id)
    if (next) setPlatform(next.platform)
  }

  const submit = () => {
    if (title.trim().length < 4) {
      setError('Judul minimal 4 karakter.')
      return
    }
    if (!schedule) {
      setError('Tentukan jadwal publish.')
      return
    }
    addContent({
      title: title.trim(),
      platform,
      accountId: account || undefined,
      niche,
      format: formatName,
      status,
      scheduledAt: new Date(schedule).toISOString(),
      views: 0,
      engagement: 0,
      caption: caption.trim() || undefined,
      hashtags: hashtags.split(',').map((h) => h.trim().replace(/^#/, '')).filter(Boolean),
    })
    push({ title: 'Konten dibuat', description: `${title.trim()} masuk pipeline ${isLong ? 'long-form' : 'short-form'} sebagai ${status}.`, tone: 'success' })
    navigate(stagePath('drafts'))
  }

  return (
    <div>
      <PageHeader
        title={isLong ? 'Studio long-form' : 'Studio short-form'}
        description={
          isLong
            ? 'Susun brief episode YouTube: template panjang, akun, jadwal, dan checklist produksi.'
            : 'Susun brief vertikal: template pendek, akun, batch, dan checklist produksi.'
        }
        actions={
          <Button variant="secondary" onClick={() => window.location.assign('/app/monitor')}>
            <Sparkles /> Bantu tulis brief
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Pilih template" description={isLong ? 'Struktur episode panjang yang terbukti' : 'Struktur vertikal yang siap batch'} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.format}
                  onClick={() => setFormatName(t.format)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    formatName === t.format
                      ? 'border-primary/35 bg-primary/[0.06]'
                      : 'border-line bg-white/[0.02] hover:border-line-strong',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-text-primary">{t.name}</p>
                    {formatName === t.format ? <CheckCircle2 className="size-3.5 text-primary" /> : null}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{t.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Brief konten" description="Detail yang dibutuhkan untuk produksi" />
            <div className="space-y-4">
              <Field label="Judul konten" error={error && title.trim().length < 4 ? error : undefined}>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setError('')
                  }}
                  placeholder="Contoh: 3 cara AI menghemat 10 jam per minggu"
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Platform">
                  <Select value={platform} onChange={(e) => pickPlatform(e.target.value as Platform)}>
                    {meta.platforms.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Akun tujuan">
                  <Select value={account} onChange={(e) => pickAccount(e.target.value)}>
                    {accounts.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.handle} · {entry.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Niche">
                  <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Agentic AI" />
                </Field>
                <Field label="Format">
                  <Select value={formatName} onChange={(e) => setFormatName(e.target.value)}>
                    {templates.map((t) => (
                      <option key={t.format} value={t.format}>{t.format}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status awal">
                  <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Jadwal publish" error={error && !schedule ? error : undefined}>
                <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </Field>
              <Field label="Caption (opsional)">
                <Textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption singkat yang relevan dengan isi konten…"
                />
              </Field>
              <Field label="Hashtag (pisahkan dengan koma)">
                <Input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="ai, umkm, produktivitas"
                />
              </Field>
            </div>
            {error ? <p className="mt-3 text-[11px] text-danger">{error}</p> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <p className="text-[10px] text-text-muted">Konten masuk pipeline lokal, bukan publish otomatis.</p>
              <Button onClick={submit}>
                <Clapperboard /> Buat konten <ArrowRight />
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div
              className={cn(
                'relative flex items-end p-4',
                isLong ? 'aspect-video max-h-[320px]' : 'aspect-[9/12] max-h-[320px]',
              )}
              style={{
                background: `radial-gradient(120% 90% at 80% 0%, ${platformColor[platform]}33 0%, transparent 55%), linear-gradient(160deg, #1A1A1A 0%, #0B0B0B 100%)`,
              }}
            >
              <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/20 px-2 py-1 backdrop-blur">
                <PlatformChip platform={platform} />
              </div>
              <div>
                <Badge tone="outline" className="mb-2 border-white/15 text-white/70">{formatName}</Badge>
                <p className="text-[15px] font-semibold leading-snug text-white">
                  {title || 'Judul konten akan tampil di sini'}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/55">
                  {caption || 'Caption dan hashtag membantu audiens memahami konteks konten.'}
                </p>
                <p className="mt-2 text-[9px] text-white/40">
                  {accounts.find((entry) => entry.id === account)?.handle ?? 'Pilih akun'}
                </p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <PlatformChip platform={platform} />
                <Badge tone="outline">{status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted">
                <CalendarDays className="size-3" />
                {schedule ? new Date(schedule).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum dijadwalkan'}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hashtags.split(',').map((h) => h.trim()).filter(Boolean).map((h) => (
                  <Badge key={h} tone="outline">#{h.replace(/^#/, '')}</Badge>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Checklist produksi" description="Sebelum konten dianggap siap" />
            <div className="space-y-2">
              {[
                { label: 'Judul dan hook jelas', done: title.trim().length >= 4 },
                { label: isLong ? 'Platform & akun YouTube dipilih' : 'Platform & akun short dipilih', done: true },
                { label: isLong ? 'Jadwal upload ditentukan' : 'Jadwal posting ditentukan', done: Boolean(schedule) },
                { label: isLong ? 'Deskripsi & chapter disiapkan' : 'Caption disiapkan', done: caption.trim().length > 0 },
                { label: 'Hashtag relevan', done: hashtags.trim().length > 0 },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-[11px]">
                  <span className={cn('grid size-4 place-items-center rounded-full border', c.done ? 'border-primary/40 bg-primary/10 text-primary' : 'border-line text-transparent')}>
                    <CheckCircle2 className="size-2.5" />
                  </span>
                  <span className={c.done ? 'text-text-secondary' : 'text-text-muted'}>{c.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[12px] font-medium text-text-primary">AI bisa menyusun brief</p>
                <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
                  Minta AI membuat hook, struktur, dan caption. Semua hasil adalah draf yang perlu
                  kamu review.
                </p>
                <Button variant="soft" size="sm" className="mt-2.5" onClick={() => window.location.assign('/app/monitor')}>
                  Buka Agent Monitor
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
