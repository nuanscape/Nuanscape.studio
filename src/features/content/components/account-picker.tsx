import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ContentFormatBadge } from '@/features/content/components/content-flow'
import { PlatformLogo, platformColor } from '@/features/content/components/content-ui'
import { MAX_ACCOUNTS_PER_PLATFORM, platformAccounts } from '@/data/mock'
import { cn, formatNumber } from '@/lib/utils'
import type { Platform, PlatformAccount } from '@/types'

const platformOrder: Platform[] = ['YouTube', 'TikTok', 'Instagram']

const statusTone: Record<PlatformAccount['status'], string> = {
  Active: '#24C7C4',
  Growing: '#F5D64B',
  Paused: '#62798A',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AccountPicker({
  activeId,
  onSelect,
}: {
  activeId?: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      {platformOrder.map((platform) => {
        const accounts = platformAccounts.filter((account) => account.platform === platform)
        return (
          <section key={platform}>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl border"
                style={{
                  backgroundColor: `${platformColor[platform]}1a`,
                  borderColor: `${platformColor[platform]}40`,
                }}
              >
                <span style={{ color: platformColor[platform] }} className="inline-flex">
                  <PlatformLogo platform={platform} className="size-4" />
                </span>
              </span>
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-white">{platform}</h2>
              <Badge tone="outline">
                {accounts.length}/{MAX_ACCOUNTS_PER_PLATFORM} akun
              </Badge>
              <span className="text-[10px] text-text-muted">Pilih akun untuk memulai flow</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => {
                const active = activeId === account.id
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => onSelect(account.id)}
                    aria-pressed={active}
                    className={cn(
                      'group flex flex-col rounded-2xl border bg-surface/50 p-4 text-left transition-colors',
                      active ? 'border-teal/45 bg-teal/[0.06]' : 'border-line hover:border-white/15 hover:bg-surface',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-xl border text-[11px] font-bold"
                          style={{
                            backgroundColor: `${platformColor[account.platform]}1a`,
                            borderColor: `${platformColor[account.platform]}40`,
                            color: platformColor[account.platform],
                          }}
                        >
                          {initials(account.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-text-primary">{account.name}</p>
                          <p className="truncate text-[10px] text-text-muted">
                            {account.handle} · {account.niche}
                          </p>
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
                        style={{
                          color: statusTone[account.status],
                          backgroundColor: `${statusTone[account.status]}18`,
                        }}
                      >
                        {account.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <ContentFormatBadge format={account.format} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Followers</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">
                          {formatNumber(account.followers, true)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-line bg-white/[0.02] p-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-text-muted">Views 30h</p>
                        <p className="num mt-0.5 text-[12px] font-medium text-text-primary">
                          {formatNumber(account.views30d, true)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
                      <span className="text-[10px] text-text-muted">Flow akun ini</span>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium"
                        style={{ color: platformColor[account.platform] }}
                      >
                        {active ? (
                          <>
                            <CheckCircle2 className="size-3" /> Dipilih
                          </>
                        ) : (
                          <>
                            Mulai
                            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
