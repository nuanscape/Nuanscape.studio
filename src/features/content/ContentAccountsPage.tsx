import { Link2, Link2Off, Settings2 } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlatformLogo, platformColor } from '@/features/content/components/content-ui'
import { platformAccounts } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils'
import type { Platform } from '@/types'

const platforms: Platform[] = ['YouTube', 'TikTok', 'Instagram']

export function ContentAccountsPage() {
  const linkedAccounts = useContentStore((s) => s.linkedAccounts)
  const linkAccount = useContentStore((s) => s.linkAccount)
  const unlinkAccount = useContentStore((s) => s.unlinkAccount)
  const isLinked = (id: string) => linkedAccounts[id] !== false

  return (
    <div>
      <PageHeader
        title="Account"
        description="Kelola akun YouTube, Instagram, dan TikTok. Tautkan atau putuskan akun."
      />

      <div className="space-y-5">
        {platforms.map((platform) => {
          const accounts = platformAccounts.filter((a) => a.platform === platform)
          return (
            <Card key={platform} className="p-5">
              <SectionHeader
                title={platform}
                description={`${accounts.length} akun terdaftar`}
                action={
                  <Badge tone="outline" style={{ borderColor: `${platformColor[platform]}55`, color: platformColor[platform] }}>
                    {accounts.filter((a) => isLinked(a.id)).length} tertaut
                  </Badge>
                }
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => {
                  const linked = isLinked(account.id)
                  return (
                    <div key={account.id} className="rounded-xl border border-line bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ color: platformColor[platform] }} className="inline-flex">
                              <PlatformLogo platform={platform} className="size-3.5" />
                            </span>
                            <p className="truncate text-[13px] font-semibold text-text-primary">{account.name}</p>
                          </div>
                          <p className="mt-0.5 text-[10px] text-text-muted">{account.handle} · {account.niche}</p>
                        </div>
                        <Badge tone={linked ? 'success' : 'outline'}>{linked ? 'Tertaut' : 'Terputus'}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <p className="text-[9px] text-text-muted">Followers</p>
                          <p className="num mt-0.5 text-[11px] font-medium text-text-primary">{formatNumber(account.followers, true)}</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <p className="text-[9px] text-text-muted">Views</p>
                          <p className="num mt-0.5 text-[11px] font-medium text-text-primary">{formatNumber(account.views30d, true)}</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] p-2">
                          <p className="text-[9px] text-text-muted">Eng.</p>
                          <p className="num mt-0.5 text-[11px] font-medium text-text-primary">{formatPercent(account.engagement)}</p>
                        </div>
                      </div>

                      <p className="mt-2 text-[9px] text-text-muted">Sinkron: {formatDate(account.lastSync, 'd MMM yyyy HH:mm')}</p>

                      <div className="mt-3 flex gap-2">
                        {linked ? (
                          <Button variant="secondary" size="sm" className="flex-1" onClick={() => unlinkAccount(account.id)}>
                            <Link2Off /> Putuskan
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1" onClick={() => linkAccount(account.id)}>
                            <Link2 /> Tautkan
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" aria-label="Kelola">
                          <Settings2 />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
