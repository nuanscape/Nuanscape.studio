import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, Clapperboard, Crown, Store, Wallet, X, Activity, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { IosIcon, toneFromAccent } from '@/components/ui/ios-icon'

export type AgentMember = {
  id: string
  name: string
  role: string
  reportsTo?: string
  status: 'Aktif' | 'Siaga' | 'Monitoring'
  description: string
  href?: string
  metrics: { label: string; value: string }[]
  activities: string[]
  accent: string
}

function agentGlyph(id: string) {
  return id === 'nuanscape' ? Crown : id === 'finance' ? Wallet : id === 'seller' ? Store : id === 'content' ? Clapperboard : Bot
}

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function TeamGrid({ members, className }: { members: AgentMember[]; className?: string }) {
  const [selected, setSelected] = React.useState<AgentMember | null>(null)

  React.useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <div className={cn('relative', className)}>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {members.map((member, idx) => (
          <article
            key={member.id}
            className="group relative isolate overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,23,32,0.95),rgba(7,12,17,0.95))] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-all duration-500 hover:-translate-y-1.5 hover:border-white/[0.14] hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="relative h-[128px] overflow-hidden border-b border-white/[0.06]">
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${member.accent}33 0%, ${member.accent}08 42%, transparent 100%)` }} />
              <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
              <div className="absolute -right-8 -top-10 size-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125" style={{ backgroundColor: `${member.accent}2b` }} />
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <Badge tone={member.status === 'Aktif' ? 'success' : member.status === 'Siaga' ? 'primary' : 'info'} className="border-white/10 bg-black/20 backdrop-blur">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: member.status === 'Aktif' ? '#F5D64B' : member.accent }} /> {member.status}
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                {idAvatar(member.id) ? (
                  <IosIcon icon={agentGlyph(member.id)} tone={toneFromAccent(member.accent)} size="xl" />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-white/12 bg-card/80 text-[15px] font-semibold tracking-wide text-text-primary shadow-[0_10px_30px_-16px_rgba(0,0,0,1)] backdrop-blur">
                    {initials(member.name)}
                  </div>
                )}
                <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-text-secondary backdrop-blur">
                  {member.reportsTo ? `→ ${member.reportsTo}` : 'Head'}
                </div>
              </div>
            </div>

            <div className="p-4 pt-4">
              <div className="min-h-[64px]">
                <h3 className="text-[16px] font-semibold leading-tight tracking-[-0.02em] text-text-primary">{member.name}</h3>
                <p className="mt-1 text-[12px]" style={{ color: member.accent }}>{member.role}</p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-text-muted transition-colors group-hover:text-text-secondary">{member.description}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 overflow-hidden">
                {member.metrics.slice(0, 2).map((m) => (
                  <div key={m.label} className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                    <div className="truncate text-[9px] uppercase tracking-[0.1em] text-text-muted">{m.label}</div>
                    <div className="mt-0.5 truncate text-[12px] font-medium text-text-primary">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted">
                  <Activity className="size-3.5 shrink-0" style={{ color: member.accent }} />
                  <span className="truncate">{member.activities[0]}</span>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                <div className="bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/96 to-transparent px-4 pb-4 pt-10">
                  <button
                    type="button"
                    onClick={() => setSelected(member)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-medium text-[#0B0B0B] transition-transform active:scale-[0.99]"
                    style={{ backgroundColor: member.accent, borderColor: `${member.accent}aa`, boxShadow: `0 10px 30px -14px ${member.accent}88` }}
                  >
                    <Sparkles className="size-3.5" /> Quick view & aktivitas <ArrowUpRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`Detail ${selected.name}`}>
          <div className="absolute inset-0 bg-[#000000]/55 backdrop-blur-[2px]" onClick={() => setSelected(null)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-white/[0.08] bg-[linear-gradient(180deg,#121212,#0D0D0D)] shadow-[-30px_0_120px_-30px_rgba(0,0,0,0.95)] animate-in fade-in duration-200">
            <div className="relative overflow-hidden border-b border-white/[0.07] p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 90% at 0% 0%, ${selected.accent}1f, transparent 55%)` }} />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <IosIcon icon={agentGlyph(selected.id)} tone={toneFromAccent(selected.accent)} size="xl" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight text-text-primary">{selected.name}</h3>
                      <Badge tone={selected.status === 'Aktif' ? 'success' : selected.status === 'Siaga' ? 'primary' : 'info'}>{selected.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: selected.accent }}>{selected.role}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{selected.reportsTo ? `Melapor ke ${selected.reportsTo}` : 'Head Agent NUANSCAPE.STUDIO'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-text-muted hover:text-text-primary" aria-label="Tutup"><X className="size-4" /></button>
              </div>
              <p className="relative mt-4 text-[13px] leading-relaxed text-text-secondary">{selected.description}</p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <section>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">Metrik</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selected.metrics.map((m) => (
                    <div key={m.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <div className="text-[10px] text-text-muted">{m.label}</div>
                      <div className="mt-1 text-[13px] font-medium text-text-primary">{m.value}</div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">Aktivitas Terbaru</p>
                <div className="mt-3 space-y-2">
                  {selected.activities.map((activity, i) => (
                    <div key={i} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
                      <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: selected.accent }} />
                      </span>
                      <span className="text-[12px] leading-relaxed text-text-secondary">{activity}</span>
                    </div>
                  ))}
                </div>
              </section>
              {selected.href ? (
                <Link to={selected.href} onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-primary/25 hover:text-primary">
                  Buka domain {selected.name} <ArrowUpRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function idAvatar(id: string) {
  return ['nuanscape', 'finance', 'seller', 'content'].includes(id)
}
