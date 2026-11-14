import { Bot, CalendarDays, CheckCircle2, Lightbulb, Play, ShieldCheck, Zap } from 'lucide-react'
import { PageHeader, SectionHeader, MetricCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { contentInsights } from '@/data/mock'
import { useAutomationStore } from '@/stores/automation-store'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import { agentProfiles } from '@/features/monitor/components/agents'
import { formatDate } from '@/lib/utils'

const ENERGY_COST = 10

export function ContentAgentReportPage() {
  const items = useContentStore((s) => s.items)
  const aiEnergy = useContentStore((s) => s.aiEnergy)
  const aiEnergyMax = useContentStore((s) => s.aiEnergyMax)
  const { push } = useToastStore()

  const automations = useAutomationStore((s) => s.items)
  const approve = useAutomationStore((s) => s.approve)

  const bambang = agentProfiles.bambang
  const generated = items.filter((i) => i.generated).length
  const published = items.filter((i) => i.status === 'Published').length
  const inProgress = items.filter((i) => ['Production', 'Editing', 'Review', 'Ready to Publish', 'Script Ready'].includes(i.status)).length
  const remainingGenerates = Math.floor(aiEnergy / ENERGY_COST)
  const approvals = automations.filter((a) => a.status === 'needs_approval')

  const activities = [
    { id: 'a1', title: 'Riset ide konten selesai', detail: '3 ide baru untuk niche music & storytelling', time: '10 menit lalu' },
    { id: 'a2', title: 'Optimasi judul & thumbnail', detail: '2 konten diperbarui dengan CTR lebih tinggi', time: '1 jam lalu' },
    { id: 'a3', title: 'Generate video selesai', detail: '1 video siap diunduh dan diposting', time: '2 jam lalu' },
    { id: 'a4', title: 'Analitik mingguan diproses', detail: 'Laporan performa 3 platform diperbarui', time: 'Hari ini' },
  ]

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const generatedItems = items.filter((i) => i.generated)
  const postedItems = items.filter((i) => i.status === 'Published')
  const postsThisWeek = postedItems.filter((i) => new Date(i.scheduledAt || i.createdAt) >= startOfWeek).length
  const generatesThisWeek = generatedItems.filter((i) => new Date(i.createdAt) >= startOfWeek).length
  const month = today.getMonth()
  const year = today.getFullYear()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay.getDay()
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const genByDay = new Map<string, number>()
  const postByDay = new Map<string, number>()
  generatedItems.forEach((i) => {
    const d = new Date(i.createdAt)
    const k = dayKey(d)
    genByDay.set(k, (genByDay.get(k) || 0) + 1)
  })
  postedItems.forEach((i) => {
    const d = new Date(i.scheduledAt || i.createdAt)
    const k = dayKey(d)
    postByDay.set(k, (postByDay.get(k) || 0) + 1)
  })
  const calendarCells = Array.from({ length: offset + daysInMonth }, (_, idx) => {
    if (idx < offset) return null
    const day = idx - offset + 1
    const date = new Date(year, month, day)
    const k = dayKey(date)
    return { day, gen: genByDay.get(k) || 0, post: postByDay.get(k) || 0, isToday: dayKey(date) === dayKey(today) }
  })

  return (
    <div>
      <PageHeader
        title="Agent Report"
        description="Laporan Bambang, agent content production: kinerja, command & approval, serta energy generate AI."
      />

      <div className="grid grid-cols-1 gap-4">
        <Card className="relative overflow-hidden p-5">
          <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.05]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <img
                src={bambang.photo}
                alt={`Avatar ${bambang.name}, ${bambang.role}`}
                className="size-20 rounded-full bg-[#262626] object-cover"
                style={{ boxShadow: `0 0 0 3px #0b0b0b, 0 0 0 4px ${bambang.accent}66` }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-card bg-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold tracking-[-0.02em] text-white">{bambang.name}</h2>
                <Badge tone="success">Aktif</Badge>
                <Badge tone="info">{bambang.role}</Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-white/45">{bambang.duty}</p>
              <p className="mt-3 text-[12px] leading-relaxed text-white/65">
                Laporan Bambang: pipeline content production berjalan. {generated} konten telah digenerate, {inProgress} masih dalam proses, dan {published} sudah dipublikasikan. Command dan approval yang menunggu ditampilkan di bawah.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Riset & ide</span>
                <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Optimasi konten</span>
                <span className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-text-secondary">Generate & publish</span>
              </div>
              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-text-muted">Energy generate</span>
                  <span className="num text-text-secondary">
                    {aiEnergy}/{aiEnergyMax} · {remainingGenerates}x
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-teal transition-all"
                    style={{ width: `${(aiEnergy / aiEnergyMax) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Konten digenerate" value={`${generated}`} deltaLabel="oleh Bambang" icon={<Zap />} accent="teal" />
        <MetricCard label="Dipublikasikan" value={`${published}`} deltaLabel="total tayang" icon={<CheckCircle2 />} accent="yellow" tone="positive" />
        <MetricCard label="Dalam proses" value={`${inProgress}`} deltaLabel="sedang dikerjakan" icon={<Bot />} accent="orange" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Kinerja & aktivitas Bambang" description="Aktivitas terbaru content production agent" />
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3 rounded-xl border border-line bg-white/[0.02] p-3">
                <img
                  src={bambang.photo}
                  alt={`Avatar ${bambang.name}`}
                  className="mt-0.5 size-8 shrink-0 rounded-lg bg-[#262626] object-cover"
                  style={{ boxShadow: `0 0 0 1px ${bambang.accent}33` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-medium text-text-primary">{a.title}</p>
                    <Badge tone="outline" className="text-[9px]">{a.time}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Command & approval" description="Semua perintah/approval yang menunggu persetujuan" />
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-xl border border-yellow/[0.18] bg-yellow/[0.04] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-semibold text-text-primary">{a.name}</p>
                  <Badge tone="warning">Perlu approval</Badge>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">{a.description}</p>
                <p className="mt-1.5 text-[10px] text-text-muted">Modul: {a.module} · Trigger: {a.trigger}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">Terakhir: {formatDate(a.lastRun, 'd MMM, HH:mm')} · Runs: {a.runs}</p>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      approve(a.id)
                      push({ title: 'Disetujui & berjalan', description: `${a.name} otomatis aktif kembali.`, tone: 'success' })
                    }}
                  >
                    <Play className="size-3.5" /> Setujui & jalankan
                  </Button>
                </div>
              </div>
            ))}
            {!approvals.length ? (
              <div className="flex items-center gap-2 rounded-xl border border-teal/[0.18] bg-teal/[0.04] p-3 text-[11px] text-teal">
                <ShieldCheck className="size-4" /> Tidak ada command/approval tertunda.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader
          title="Kalender aktivitas Bambang"
          description={`Generate & posting video bulan ini · ${postsThisWeek} posting, ${generatesThisWeek} generate minggu ini`}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-text-muted">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((c, i) => c ? (
                <div key={i} className={`min-h-[56px] rounded-lg border p-1.5 ${c.isToday ? 'border-teal/50 bg-teal/[0.06]' : 'border-line bg-white/[0.02]'}`}>
                  <div className="text-[10px] text-text-secondary">{c.day}</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {c.gen > 0 ? <span className="inline-flex w-fit rounded bg-primary/15 px-1 text-[9px] text-primary">Gen {c.gen}</span> : null}
                    {c.post > 0 ? <span className="inline-flex w-fit rounded bg-teal/15 px-1 text-[9px] text-teal">Post {c.post}</span> : null}
                  </div>
                </div>
              ) : <div key={i} />)}
            </div>
          </div>
          <div className="min-w-[220px] space-y-3 rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-[12px] font-medium text-text-primary"><CalendarDays className="size-4 text-teal" /> Ringkasan minggu ini</div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between"><span className="text-text-muted">Posting video</span><span className="num font-semibold text-teal">{postsThisWeek}x</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Generate konten</span><span className="num font-semibold text-primary">{generatesThisWeek}x</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Total generate</span><span className="num text-text-primary">{generatedItems.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Total posting</span><span className="num text-text-primary">{postedItems.length}</span></div>
            </div>
            <div className="border-t border-line pt-2 text-[10px] text-text-muted">
              <p className="mb-1 font-medium text-text-secondary">Tanggal generate:</p>
              <div className="max-h-28 space-y-0.5 overflow-auto">
                {generatedItems.slice(0, 12).map((i) => (
                  <div key={i.id} className="flex justify-between gap-2"><span className="truncate">{formatDate(i.createdAt, 'd MMM')}</span><span className="truncate text-text-secondary">{i.platform}</span></div>
                ))}
                {!generatedItems.length ? <span>Belum ada data generate.</span> : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <SectionHeader title="Saran dari Bambang" description="Rekomendasi untuk meningkatkan performa konten" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contentInsights.map((insight) => (
            <div key={insight.id} className="rounded-xl border border-line bg-white/[0.02] p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[12px] font-semibold text-text-primary">{insight.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{insight.detail}</p>
                  <p className="mt-2 text-[10px] text-text-muted">Alasan: {insight.why}</p>
                  {insight.action ? <Badge tone="info" className="mt-2 text-[9px]">{insight.action}</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
