import * as React from 'react'
import { Link2, Link2Off, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { PlatformLogo, platformColor } from '@/features/content/components/content-ui'
import { useContentStore } from '@/stores/content-store'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { useToastStore } from '@/stores/app-store'
import type { Platform } from '@/types'

const platforms: Platform[] = ['YouTube', 'TikTok', 'Instagram']

export function ContentAccountsPage() {
  const platformAccounts = useContentStore((s) => s.accounts)
  const linkedAccounts = useContentStore((s) => s.linkedAccounts)
  const linkAccount = useContentStore((s) => s.linkAccount)
  const unlinkAccount = useContentStore((s) => s.unlinkAccount)
  const refresh = useContentStore((s) => s.refresh)
  const accountsFromBackend = useContentStore((s) => s.accountsFromBackend)
  const { push } = useToastStore()
  const [syncingId, setSyncingId] = React.useState<string | null>(null)
  const [connectOpen, setConnectOpen] = React.useState(false)
  const [handleInput, setHandleInput] = React.useState('')
  const [connectFormat, setConnectFormat] = React.useState<'long' | 'short'>('long')
  const [connectNiche, setConnectNiche] = React.useState('')
  const [connecting, setConnecting] = React.useState(false)
  const [oauthBusy, setOauthBusy] = React.useState(false)
  const oauthHandled = React.useRef(false)
  const isLinked = (id: string) => linkedAccounts[id] !== false

  React.useEffect(() => {
    if (oauthHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('youtube')
    if (!status) return
    oauthHandled.current = true
    if (status === 'connected') {
      push({
        title: 'Channel YouTube terhubung',
        description: `${params.get('channel') ?? 'Channel'} tersinkron via Google OAuth.`,
        tone: 'success',
      })
      void refresh()
    } else {
      push({
        title: 'Gagal menghubungkan Google',
        description: params.get('reason') ?? 'OAuth YouTube gagal.',
        tone: 'danger',
      })
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [push, refresh])

  const connectWithGoogle = async () => {
    setOauthBusy(true)
    try {
      const { url } = await api.content.oauthUrl({
        format: connectFormat,
        niche: connectNiche.trim() || undefined,
      })
      window.location.assign(url)
    } catch (error) {
      push({
        title: 'OAuth belum siap',
        description:
          error instanceof Error ? error.message : 'GOOGLE_CLIENT_ID belum dikonfigurasi.',
        tone: 'danger',
      })
      setOauthBusy(false)
    }
  }

  const connectYouTube = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const handleValue = handleInput.trim()
    if (!handleValue) return
    setConnecting(true)
    try {
      const result = await api.content.createAccount({
        handle: handleValue,
        format: connectFormat,
        niche: connectNiche.trim() || undefined,
      })
      await refresh()
      setConnectOpen(false)
      setHandleInput('')
      setConnectNiche('')
      setConnectFormat('long')
      push({
        title: 'Channel terhubung',
        description: `${result.channel.title} — ${result.stats.followers.toLocaleString('id-ID')} subscriber, ${result.stats.posts30d} video 30 hari terakhir.`,
        tone: 'success',
      })
    } catch (error) {
      push({
        title: 'Gagal menghubungkan',
        description:
          error instanceof Error ? error.message : 'YouTube Data API tidak dapat dihubungi.',
        tone: 'danger',
      })
    } finally {
      setConnecting(false)
    }
  }

  const syncYouTube = async (id: string, name: string) => {
    setSyncingId(id)
    try {
      const result = await api.content.syncAccount(id)
      await refresh()
      push({
        title: `${name} tersinkron`,
        description: `${result.stats.followers.toLocaleString('id-ID')} subscriber · ${result.stats.posts30d} video 30 hari terakhir.`,
        tone: 'success',
      })
    } catch (error) {
      push({
        title: 'Sinkronisasi gagal',
        description: error instanceof Error ? error.message : 'YouTube Data API tidak dapat dihubungi.',
        tone: 'danger',
      })
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="Kelola akun YouTube, Instagram, dan TikTok. Hubungkan channel YouTube lewat Data API v3."
        actions={
          <Button onClick={() => setConnectOpen(true)}>
            <Plus /> Hubungkan YouTube
          </Button>
        }
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
                        {platform === 'YouTube' && accountsFromBackend ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Sinkron YouTube"
                            loading={syncingId === account.id}
                            onClick={() => syncYouTube(account.id, account.name)}
                          >
                            <RefreshCw />
                          </Button>
                        ) : null}
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

      <Dialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Hubungkan channel YouTube"
        description="Masukkan handle, URL channel, atau ID UC.... Statistik publik ditarik langsung dari YouTube Data API v3."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConnectOpen(false)}>
              Batal
            </Button>
            <Button variant="outline" onClick={connectWithGoogle} loading={oauthBusy}>
              Login Google
            </Button>
            <Button type="submit" form="connect-youtube" loading={connecting}>
              Hubungkan
            </Button>
          </>
        }
      >
        <form id="connect-youtube" onSubmit={connectYouTube} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="yt-handle" className="text-[11px] font-medium text-text-muted">
              Handle / URL channel
            </label>
            <Input
              id="yt-handle"
              autoFocus
              placeholder="@muhestudio atau https://youtube.com/@muhestudio"
              value={handleInput}
              onChange={(event) => setHandleInput(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="yt-format" className="text-[11px] font-medium text-text-muted">
                Format utama
              </label>
              <Select
                id="yt-format"
                value={connectFormat}
                onChange={(event) => setConnectFormat(event.target.value as 'long' | 'short')}
              >
                <option value="long">Video panjang</option>
                <option value="short">Shorts</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="yt-niche" className="text-[11px] font-medium text-text-muted">
                Niche (opsional)
              </label>
              <Input
                id="yt-niche"
                placeholder="Lofi, edukasi, gaming, ..."
                value={connectNiche}
                onChange={(event) => setConnectNiche(event.target.value)}
              />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-text-muted">
            <strong className="text-text-secondary">Login Google</strong> memberi akses watch time
            dan analytics penonton lewat OAuth 2.0. Tanpa OAuth, backend hanya menarik data publik
            dan memerlukan <code className="text-text-secondary">YOUTUBE_API_KEY</code>.
          </p>
        </form>
      </Dialog>
    </div>
  )
}
