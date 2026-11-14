import * as React from 'react'
import { Play } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { platformColor } from '@/features/content/components/content-ui'
import { platformAccounts } from '@/data/mock'
import { useContentStore } from '@/stores/content-store'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Platform } from '@/types'

const platforms: Platform[] = ['YouTube', 'TikTok', 'Instagram']

function Thumb({ title, url, platform }: { title: string; url?: string; platform: Platform }) {
  const [err, setErr] = React.useState(false)
  if (url && !err) {
    return <img src={url} alt={title} className="h-full w-full object-cover" loading="lazy" onError={() => setErr(true)} />
  }
  const initials = title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${platformColor[platform]}33, #111)` }}>
      <span className="text-[22px] font-bold text-white/80">{initials || 'VD'}</span>
    </div>
  )
}

export function ContentDraftsPage() {
  const items = useContentStore((s) => s.items)
  const drafts = items.filter((i) => i.generated || i.previewUrl || i.videoUrl)

  return (
    <div>
      <PageHeader
        title="Draft"
        description="Seluruh hasil generate konten dari 3 platform dan 3 akun masing-masing platform."
      />

      <div className="space-y-6">
        {platforms.map((platform) => {
          const accounts = platformAccounts.filter((a) => a.platform === platform)
          const platformDrafts = drafts.filter((d) => d.platform === platform)
          return (
            <Card key={platform} className="p-5">
              <SectionHeader
                title={platform}
                description={`${platformDrafts.length} hasil generate · ${accounts.length} akun`}
                action={<Badge tone="outline" style={{ borderColor: `${platformColor[platform]}55`, color: platformColor[platform] }}>{platform}</Badge>}
              />
              <div className="space-y-5">
                {accounts.map((account) => {
                  const accDrafts = drafts.filter((d) => d.accountId === account.id)
                  return (
                    <div key={account.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: platformColor[platform] }} />
                        <p className="text-[12px] font-semibold text-text-primary">{account.name}</p>
                        <span className="text-[10px] text-text-muted">{account.handle}</span>
                        <Badge tone="outline" className="ml-auto text-[9px]">{accDrafts.length} video</Badge>
                      </div>
                      {accDrafts.length ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {accDrafts.map((item) => (
                            <div key={item.id} className="group overflow-hidden rounded-xl border border-line bg-white/[0.02]">
                              <div className="relative aspect-video w-full bg-[#111]">
                                <Thumb title={item.title} url={item.previewUrl || item.thumbnail} platform={item.platform} />
                                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">Video</span>
                                <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                                  <span className="grid size-10 place-items-center rounded-full bg-white/90 text-black"><Play className="ml-0.5 size-4" /></span>
                                </span>
                              </div>
                              <div className="p-3">
                                <p className="line-clamp-2 text-[12px] font-medium leading-snug text-text-primary" title={item.title}>{item.title}</p>
                                <p className="mt-1 text-[10px] text-text-muted">{account.handle} · {formatDate(item.createdAt, 'd MMM yyyy')}</p>
                                {item.thumbnailStyle || item.animationStyle || item.musicStyle ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {item.thumbnailStyle ? <Badge tone="outline" className="text-[8px]">{item.thumbnailStyle}</Badge> : null}
                                    {item.animationStyle ? <Badge tone="outline" className="text-[8px]">{item.animationStyle}</Badge> : null}
                                    {item.musicStyle ? <Badge tone="outline" className="text-[8px]">{item.musicStyle}</Badge> : null}
                                  </div>
                                ) : null}
                                <div className="mt-1.5 flex items-center gap-2 text-[9px] text-text-muted">
                                  <span>{formatNumber(item.views)} views</span>
                                  <span>·</span>
                                  <Badge tone={item.status === 'Published' ? 'success' : 'info'} className="text-[8px]">{item.status}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11px] text-text-muted">
                          Belum ada hasil generate untuk akun ini.
                        </div>
                      )}
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
