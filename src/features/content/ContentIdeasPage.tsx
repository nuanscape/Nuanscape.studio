import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Lightbulb, Plus, Search, Sparkles, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Progress } from '@/components/ui/progress'
import { PlatformChip } from '@/features/content/components/content-ui'
import { resolveAccount, useContentScope } from '@/features/content/components/content-flow'
import { IdeaModal } from '@/features/content/components/idea-modal'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import { formatNumber } from '@/lib/utils'

const generatedIdeas = [
  {
    title: 'AI agent yang jawab chat pelanggan 24 jam',
    hook: '"Tim kamu masih balas chat manual tengah malam? Ini cara agent AI kerja nonstop."',
    platform: 'TikTok' as const,
    niche: 'Agentic AI',
    angle: 'Demo langsung + metrik respons',
    format: 'Short-form tutorial',
    score: 91,
  },
  {
    title: 'Biaya sebenarnya bikin agent AI: breakdown lengkap',
    hook: '"Jangan mulai sebelum tahu 4 komponen biaya ini. Nomor 3 paling sering keliru."',
    platform: 'YouTube' as const,
    niche: 'Agentic AI',
    angle: 'Transparansi biaya',
    format: 'Long-form',
    score: 87,
  },
  {
    title: 'Checklist otomasi admin UMKM dengan AI',
    hook: '"Simpan checklist ini sebelum otomasi. Banyak yang lupa langkah 2."',
    platform: 'Instagram' as const,
    niche: 'No-code automation',
    angle: 'Checklist yang bisa disimpan',
    format: 'Carousel',
    score: 84,
  },
]

export function ContentIdeasPage() {
  const { ideas: allIdeas, approveIdea, promoteIdea } = useContentStore()
  const { format, meta, ideas, stagePath } = useContentScope()
  const isLong = format === 'long'
  const { push } = useToastStore()
    const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [platform, setPlatform] = React.useState('all')
  const [filter, setFilter] = React.useState<'all' | 'approved' | 'pending'>('all')

  const filtered = ideas
    .filter((i) => platform === 'all' || i.platform === platform)
    .filter((i) => filter === 'all' || (filter === 'approved' ? i.approved : !i.approved))
    .filter((i) => !query.trim() || `${i.title} ${i.niche} ${i.hook}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.score - a.score)

  const pool = generatedIdeas.filter((idea) => meta.platforms.includes(idea.platform))
  const generate = () => {
    pool.forEach((idea) => {
      if (!allIdeas.some((i) => i.title === idea.title)) useContentStore.getState().addIdea(idea)
    })
    push({ title: `${pool.length} ide baru ditambahkan`, description: 'Simulasi AI berdasarkan niche populer. Review sebelum dipakai.', tone: 'success' })
  }

  const promote = (id: string, title: string) => {
    promoteIdea(id)
    push({ title: 'Ide dipromosikan', description: `${title} masuk pipeline sebagai Approved.`, tone: 'success' })
    navigate(stagePath('drafts'))
  }

  return (
    <div>
      <PageHeader
        title={isLong ? 'Ide konten panjang' : 'Ide short-form'}
        description={
          isLong
            ? 'Kumpulan ide deep-dive untuk YouTube. Setujui yang terbaik, lalu promosikan ke pipeline produksi panjang.'
            : 'Kumpulan ide hook cepat untuk TikTok dan Instagram. Setujui, lalu masuk ke batch produksi pendek.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={generate}>
              <Wand2 /> Generate ide
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus /> Ide manual
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total ide', value: ideas.length },
          { label: 'Disetujui', value: ideas.filter((i) => i.approved).length },
          { label: 'Rata-rata skor', value: ideas.length ? Math.round(ideas.reduce((a, i) => a + i.score, 0) / ideas.length) : 0 },
          { label: 'Siap dipromosikan', value: ideas.filter((i) => i.approved && i.score >= 80).length },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">{s.label}</p>
            <p className="num mt-1.5 text-[17px] font-semibold text-text-primary">{formatNumber(s.value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { label: 'Semua', value: 'all' },
              { label: 'Disetujui', value: 'approved' },
              { label: 'Menunggu', value: 'pending' },
            ]}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ide, niche, hook…"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-9 w-auto min-w-[130px] text-xs">
            <option value="all">Semua platform</option>
            {meta.platforms.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((idea) => (
            <div key={idea.id} className="flex flex-col rounded-xl border border-line bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <PlatformChip platform={idea.platform} />
                  <p className="mt-0.5 text-[9px] text-text-muted">{resolveAccount(idea)?.handle ?? 'Belum ada akun'}</p>
                </div>
                <Badge tone={idea.score >= 88 ? 'primary' : idea.score >= 76 ? 'info' : 'outline'}>
                  Skor {idea.score}
                </Badge>
              </div>
              <h3 className="mt-2.5 text-[13px] font-medium leading-snug text-text-primary">{idea.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-text-muted">{idea.hook}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="outline">{idea.niche}</Badge>
                <Badge tone="outline">{idea.format}</Badge>
              </div>
              <Progress value={idea.score} size="sm" className="mt-3" tone={idea.score >= 88 ? 'primary' : 'info'} />
              <div className="mt-1 flex items-center justify-between text-[9px] text-text-muted">
                <span>{idea.angle}</span>
                {idea.approved ? <span className="text-primary">Disetujui</span> : <span>Menunggu</span>}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                {idea.approved ? (
                  <Button size="sm" className="flex-1" onClick={() => promote(idea.id, idea.title)}>
                    <Sparkles /> {isLong ? 'Buat naskah' : 'Buat hook'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="soft"
                    className="flex-1"
                    onClick={() => {
                      approveIdea(idea.id)
                      push({ title: 'Ide disetujui', description: idea.title, tone: 'success' })
                    }}
                  >
                    <Check /> Setujui
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" aria-label="Buka Agent Monitor" onClick={() => window.location.assign('/app/monitor')}>
                  <Lightbulb />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-text-primary">Tidak ada ide yang cocok.</p>
            <p className="mt-1 text-[11px] text-text-muted">Ubah filter atau tambahkan ide baru.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <p className="text-[10px] text-text-muted">
            {filtered.length} ide ditampilkan · skor adalah perkiraan awal, bukan jaminan performa.
          </p>
          <Button variant="ghost" size="sm" onClick={() => window.location.assign('/app/monitor')}>
            <Sparkles /> Buka Agent Monitor
          </Button>
        </div>
      </Card>

      <IdeaModal open={open} onClose={() => setOpen(false)} format={format} />
    </div>
  )
}
