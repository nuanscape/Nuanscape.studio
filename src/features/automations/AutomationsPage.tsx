import * as React from 'react'
import {
  Blocks,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { PageHeader, MetricCard, SectionHeader } from '@/components/shared/page-header'
import WorkflowBlueprint, { type WorkflowApp, type WorkflowGraph } from '@/components/ui/interactive-workflow-blueprint'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown'
import { useToastStore } from '@/stores/app-store'
import { useAutomationStore } from '@/stores/automation-store'
import type { Automation } from '@/types'
import { formatDate, formatRelative, uid } from '@/lib/utils'

const statusMeta: Record<Automation['status'], { label: string; tone: 'primary' | 'warning' | 'outline' }> = {
  active: { label: 'Aktif', tone: 'primary' },
  paused: { label: 'Paused', tone: 'outline' },
  needs_approval: { label: 'Butuh approval', tone: 'warning' },
}

const workflowGraph: WorkflowGraph = {
  nodes: [
    { id: 'signal', type: 'blueprint', position: { x: 20, y: 60 }, data: { label: 'Sinyal & jadwal', detail: 'Trigger harian, event marketplace, atau pesan pelanggan baru.', kind: 'trigger' } },
    { id: 'collect', type: 'blueprint', position: { x: 250, y: 160 }, data: { label: 'Kumpulkan data workspace', detail: 'Tarik pesanan, stok, dan transaksi terbaru.', kind: 'integration', tool: 'Shopee', logo: 'https://cdn.simpleicons.org/shopee/EE4E2F' } },
    { id: 'analyze', type: 'blueprint', position: { x: 480, y: 60 }, data: { label: 'Nuanscape AI menganalisis', detail: 'Agent menyusun insight, anomali, dan draft tindakan.', kind: 'agent', tool: 'Nuanscape AI' } },
    { id: 'approval', type: 'blueprint', position: { x: 710, y: 160 }, data: { label: 'Approval kamu', detail: 'Aksi sensitif berhenti di sini sampai kamu setujui.', kind: 'review' } },
    { id: 'deliver', type: 'blueprint', position: { x: 940, y: 60 }, data: { label: 'Kirim hasil', detail: 'Laporan ringkas ke kamu dan dashboard workspace.', kind: 'delivery', tool: 'WhatsApp', logo: 'https://cdn.simpleicons.org/whatsapp/25D366' } },
  ],
  edges: [
    { id: 'signal-collect', source: 'signal', target: 'collect' },
    { id: 'collect-analyze', source: 'collect', target: 'analyze' },
    { id: 'analyze-approval', source: 'analyze', target: 'approval' },
    { id: 'approval-deliver', source: 'approval', target: 'deliver' },
  ],
}

const workflowApps: WorkflowApp[] = [
  { id: 'nuanscape', name: 'Nuanscape AI', actions: [
    { label: 'Ringkas insight harian', detail: 'Agent merangkum metrik penting dari seluruh workspace.', kind: 'agent', tool: 'Nuanscape AI' },
  ] },
]

const agentTemplate = { label: 'Agent baru', detail: 'Jelaskan tugas agent ini di canvas.', kind: 'agent' as const, tool: 'Nuanscape AI' }

export function AutomationsPage() {
  const { push } = useToastStore()
  const items = useAutomationStore((s) => s.items)
  const storeApprove = useAutomationStore((s) => s.approve)
  const storePause = useAutomationStore((s) => s.pause)
  const storeSetStatus = useAutomationStore((s) => s.setStatus)
  const storeRunNow = useAutomationStore((s) => s.runNow)
  const addAutomation = useAutomationStore((s) => s.add)
  const [filter, setFilter] = React.useState<'all' | 'active' | 'paused' | 'needs_approval'>('all')
  const [moduleFilter, setModuleFilter] = React.useState('all')
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: '', module: 'Finance' as Automation['module'], trigger: 'Setiap hari - 08:00', description: '' })

  const filtered = items
    .filter((a) => filter === 'all' || a.status === filter)
    .filter((a) => moduleFilter === 'all' || a.module === moduleFilter)

  const activeCount = items.filter((a) => a.status === 'active').length
  const approvalCount = items.filter((a) => a.status === 'needs_approval').length
  const totalRuns = items.reduce((a, x) => a + x.runs, 0)
  const avgSuccess = items.length ? items.reduce((a, x) => a + x.successRate, 0) / items.length : 0

  const runNow = (a: Automation) => {
    storeRunNow(a.id)
    push({ title: 'Automation dijalankan', description: `${a.name} selesai (simulasi).`, tone: 'success' })
  }

  const create = () => {
    if (!draft.name.trim()) return
    const automation: Automation = {
      id: uid('au'),
      name: draft.name.trim(),
      module: draft.module,
      description: draft.description.trim() || 'Automation baru dari workspace.',
      status: 'paused',
      trigger: draft.trigger,
      lastRun: new Date().toISOString(),
      runs: 0,
      successRate: 0,
      steps: ['Trigger', 'Action', 'Log'],
    }
    addAutomation(automation)
    setOpen(false)
    setDraft({ name: '', module: 'Finance', trigger: 'Setiap hari - 08:00', description: '' })
    push({ title: 'Automation dibuat', description: 'Status awal paused - aktifkan setelah dicek.', tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Otomasi yang membaca workspace dan menyiapkan langkah berikutnya. Aksi sensitif selalu menunggu approval."
        actions={<Button onClick={() => setOpen(true)}><Plus /> Automation baru</Button>}
      />

      <WorkflowBlueprint title="Rancang alur automation" initialGraph={workflowGraph} apps={workflowApps} agentTemplate={agentTemplate} className="mt-2" />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Automation aktif" value={`${activeCount} alur`} deltaLabel={`dari ${items.length} total`} icon={<Zap />} accent="yellow" />
        <MetricCard label="Butuh approval" value={`${approvalCount} alur`} deltaLabel="menunggu keputusanmu" icon={<ShieldCheck />} tone={approvalCount ? 'warning' : 'positive'} accent="orange" />
        <MetricCard label="Total run" value={totalRuns.toLocaleString('id-ID')} deltaLabel="30 hari terakhir" icon={<Blocks />} accent="pink" />
        <MetricCard label="Success rate" value={`${Math.round(avgSuccess)}%`} deltaLabel="rata-rata semua alur" icon={<CheckCircle2 />} tone="positive" accent="teal" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented value={filter} onChange={setFilter} options={[{ label: 'Semua', value: 'all' }, { label: 'Aktif', value: 'active' }, { label: 'Paused', value: 'paused' }, { label: 'Approval', value: 'needs_approval' }]} />
        <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="h-9 w-auto min-w-[140px] text-xs">
          <option value="all">Semua modul</option><option value="Finance">Finance</option><option value="Content">Content</option><option value="Shop">Shop</option>
        </Select>
      </div>

      {approvalCount > 0 ? (
        <Card className="mt-4 border-warning/20 bg-warning/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 text-warning" />
              <div>
                <p className="text-[12px] font-medium text-text-primary">{approvalCount} automation menunggu persetujuan</p>
                <p className="text-[10px] text-text-muted">Alur berhenti sebelum aksi yang mengubah data atau mengirim konten.</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { items.filter((a) => a.status === 'needs_approval').forEach((a) => storeApprove(a.id)); push({ title: 'Semua disetujui', description: 'Automation diaktifkan dan berjalan.', tone: 'success' }) }}>Setujui semua</Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-text-primary">{a.name}</p>
                  <Badge tone={statusMeta[a.status].tone}>{statusMeta[a.status].label}</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{a.description}</p>
              </div>
              <DropdownMenu width="w-44" trigger={<Button variant="ghost" size="icon-sm" aria-label="Aksi automation"><MoreHorizontal /></Button>}>
                <DropdownItem icon={<Play />} onClick={() => runNow(a)}>Jalankan sekarang</DropdownItem>
                {a.status === 'active' ? (
                  <DropdownItem icon={<Pause />} onClick={() => { storePause(a.id); push({ title: 'Automation dipause', description: a.name, tone: 'info' }) }}>Pause</DropdownItem>
                ) : (
                  <DropdownItem icon={<Play />} onClick={() => { storeSetStatus(a.id, 'active'); push({ title: 'Automation diaktifkan', description: a.name, tone: 'success' }) }}>Aktifkan</DropdownItem>
                )}
              </DropdownMenu>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
              <div><p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Modul</p><p className="mt-0.5 text-[11px] text-text-secondary">{a.module}</p></div>
              <div><p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Run</p><p className="num mt-0.5 text-[11px] text-text-secondary">{a.runs} · {a.successRate}%</p></div>
              <div><p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Terakhir</p><p className="mt-0.5 text-[11px] text-text-secondary" title={formatDate(a.lastRun, 'd MMM yyyy HH:mm')}>{formatRelative(a.lastRun)}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-[9px] text-text-muted"><Clock className="size-2.5" /> {a.trigger}</p>
              {a.status === 'needs_approval' ? (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => { storePause(a.id); push({ title: 'Ditunda', description: a.name, tone: 'info' }) }}>Tunda</Button>
                  <Button size="sm" onClick={() => { storeApprove(a.id); push({ title: 'Disetujui', description: `${a.name} otomatis berjalan.`, tone: 'success' }) }}>Setujui & jalankan</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => runNow(a)}><Play /> Run now</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? <Card className="mt-4 p-8 text-center"><p className="text-[12px] text-text-muted">Tidak ada automation pada filter ini.</p></Card> : null}

      <Dialog open={open} onClose={() => setOpen(false)} title="Automation baru" description="Dibuat dalam status paused agar bisa dicek sebelum aktif." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={create} disabled={!draft.name.trim()}>Buat automation</Button></>}>
        <div className="space-y-4">
          <Field label="Nama automation"><Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Morning finance check" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Modul"><Select value={draft.module} onChange={(e) => setDraft((d) => ({ ...d, module: e.target.value as Automation['module'] }))}><option value="Finance">Finance</option><option value="Content">Content</option><option value="Shop">Shop</option></Select></Field>
            <Field label="Trigger"><Input value={draft.trigger} onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))} /></Field>
          </div>
          <Field label="Deskripsi"><Input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Deskripsi automation" /></Field>
        </div>
      </Dialog>
    </div>
  )
}
