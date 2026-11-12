import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Bot,
  CreditCard,
  Database,
  Download,
  Globe2,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select, Switch } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuthStore, useToastStore } from '@/stores/app-store'
import { useFinanceStore } from '@/stores/finance-store'
import { useContentStore } from '@/stores/content-store'
import { useSellerStore } from '@/stores/seller-store'
import { downloadText } from '@/lib/utils'

const tabs = [
  { value: 'profile', label: 'Profil', icon: <User /> },
  { value: 'workspace', label: 'Workspace', icon: <Globe2 /> },
  { value: 'notifications', label: 'Notifikasi', icon: <Bell /> },
  { value: 'ai', label: 'AI', icon: <Bot /> },
  { value: 'billing', label: 'Billing', icon: <CreditCard /> },
  { value: 'data', label: 'Data', icon: <Database /> },
]

export function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { push } = useToastStore()
  const [tab, setTab] = React.useState('profile')
  const [profile, setProfile] = React.useState({ name: user.name, email: user.email, role: user.role, timezone: user.timezone })
  const [workspace, setWorkspace] = React.useState({ currency: 'IDR', language: 'Bahasa Indonesia', weekStart: 'Senin', compact: true })
  const [notif, setNotif] = React.useState({ daily: true, stock: true, budget: true, content: false, email: false })
  const [ai, setAi] = React.useState({ tone: 'Ringkas dan langsung', citations: true, estimates: true, approval: true })
  const [resetOpen, setResetOpen] = React.useState(false)

  const saveProfile = () => {
    updateProfile(profile)
    push({ title: 'Profil disimpan', description: profile.name, tone: 'success' })
  }

  const saveWorkspace = () => push({ title: 'Preferensi workspace disimpan', tone: 'success' })
  const saveNotif = () => push({ title: 'Preferensi notifikasi disimpan', tone: 'success' })
  const saveAi = () => push({ title: 'Preferensi AI disimpan', tone: 'success' })

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      finance: {
        transactions: useFinanceStore.getState().transactions,
        assets: useFinanceStore.getState().assets,
        liabilities: useFinanceStore.getState().liabilities,
        budgets: useFinanceStore.getState().budgets,
        goals: useFinanceStore.getState().goals,
      },
      content: {
        items: useContentStore.getState().items,
        ideas: useContentStore.getState().ideas,
        library: useContentStore.getState().library,
      },
      shop: {
        products: useSellerStore.getState().products,
        orders: useSellerStore.getState().orders,
        fees: useSellerStore.getState().fees,
      },
    }
    downloadText(`nuanscape-studio-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2))
    push({ title: 'Data diekspor', description: 'File JSON berisi data workspace lokal.', tone: 'success' })
  }

  const resetData = () => {
    ;['nuanscape-auth', 'nuanscape-app', 'muhe-finance', 'muhe-content', 'nuanscape-seller'].forEach((key) => localStorage.removeItem(key))
    window.location.href = '/'
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Kelola profil, preferensi workspace, AI, dan data lokal. Perubahan tersimpan di browser."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="no-scrollbar w-full justify-start overflow-x-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="[&_svg]:size-3.5">
              {t.icon}{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <SectionHeader title="Profil" description="Dipakai pada sapaan AI dan laporan" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama lengkap">
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                </Field>
                <Field label="Peran">
                  <Input value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} />
                </Field>
                <Field label="Zona waktu">
                  <Select value={profile.timezone} onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}>
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                  </Select>
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveProfile}><Save /> Simpan profil</Button>
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Akun demo" description="Status sesi saat ini" />
              <div className="space-y-2.5">
                <Row label="Plan" value={<Badge tone="primary">Pro</Badge>} />
                <Row label="Workspace" value="Personal" />
                <Row label="Data" value="localStorage" />
                <Row label="Mode" value="Demo — tanpa autentikasi" />
              </div>
              <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-3">
                <p className="text-[10px] leading-relaxed text-text-muted">
                  Aplikasi ini demo frontend. Tidak ada server autentikasi dan tidak ada data yang
                  dikirim keluar browser.
                </p>
              </div>
              <Link to="/app/profile" className="mt-3 inline-flex text-[11px] text-primary">Lihat profile lengkap →</Link>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workspace">
          <Card className="p-5">
            <SectionHeader title="Preferensi workspace" description="Format angka, bahasa, dan tampilan" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Mata uang">
                <Select value={workspace.currency} onChange={(e) => setWorkspace((w) => ({ ...w, currency: e.target.value }))}>
                  <option value="IDR">IDR — Rupiah</option>
                  <option value="USD">USD — Dollar</option>
                </Select>
              </Field>
              <Field label="Bahasa">
                <Select value={workspace.language} onChange={(e) => setWorkspace((w) => ({ ...w, language: e.target.value }))}>
                  <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                  <option value="English">English</option>
                </Select>
              </Field>
              <Field label="Awal minggu">
                <Select value={workspace.weekStart} onChange={(e) => setWorkspace((w) => ({ ...w, weekStart: e.target.value }))}>
                  <option value="Senin">Senin</option>
                  <option value="Minggu">Minggu</option>
                </Select>
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[11px] text-text-secondary">Mode angka ringkas</p>
                  <p className="text-[9px] text-text-muted">Tampilkan Rp1,2 jt alih-alih angka penuh</p>
                </div>
                <Switch checked={workspace.compact} onCheckedChange={(v) => setWorkspace((w) => ({ ...w, compact: v }))} label="Mode angka ringkas" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveWorkspace}><Save /> Simpan</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-5">
            <SectionHeader title="Notifikasi" description="Pilih sinyal yang ingin dilihat" />
            <div className="space-y-2">
              {[
                { key: 'daily' as const, t: 'Ringkasan harian', d: 'Satu ringkasan setiap pagi' },
                { key: 'stock' as const, t: 'Alert stok kritis', d: 'Saat stok di bawah minimum' },
                { key: 'budget' as const, t: 'Pengingat budget', d: 'Saat pemakaian melewati 80%' },
                { key: 'content' as const, t: 'Jadwal konten', d: 'Saat slot publish tiba' },
                { key: 'email' as const, t: 'Email digest', d: 'Belum tersedia pada demo' },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                  <div>
                    <p className="text-[11px] text-text-secondary">{n.t}</p>
                    <p className="text-[9px] text-text-muted">{n.d}</p>
                  </div>
                  <Switch checked={notif[n.key]} onCheckedChange={(v) => setNotif((s) => ({ ...s, [n.key]: v }))} label={n.t} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveNotif}><Save /> Simpan</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <SectionHeader title="Preferensi AI" description="Cara asisten menjawab" />
              <div className="space-y-4">
                <Field label="Gaya jawaban">
                  <Select value={ai.tone} onChange={(e) => setAi((s) => ({ ...s, tone: e.target.value }))}>
                    <option value="Ringkas dan langsung">Ringkas dan langsung</option>
                    <option value="Detail dengan alasan">Detail dengan alasan</option>
                    <option value="Santai dan kolaboratif">Santai dan kolaboratif</option>
                  </Select>
                </Field>
                {[
                  { key: 'citations' as const, t: 'Selalu sebutkan sumber data', d: 'AI menjelaskan angka berasal dari mana' },
                  { key: 'estimates' as const, t: 'Tandai estimasi', d: 'Beri label pada proyeksi dan asumsi' },
                  { key: 'approval' as const, t: 'Approval sebelum aksi', d: 'Aksi yang mengubah data harus disetujui' },
                ].map((x) => (
                  <div key={x.key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                    <div>
                      <p className="text-[11px] text-text-secondary">{x.t}</p>
                      <p className="text-[9px] text-text-muted">{x.d}</p>
                    </div>
                    <Switch checked={ai[x.key]} onCheckedChange={(v) => setAi((s) => ({ ...s, [x.key]: v }))} label={x.t} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveAi}><Save /> Simpan</Button>
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Batas asisten" description="Agar ekspektasi jelas" />
              <div className="space-y-2.5 text-[11px] leading-relaxed text-text-secondary">
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> Tidak mengirim data ke layanan eksternal pada demo.</p>
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> Tidak menjalankan transaksi atau publish konten otomatis.</p>
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> Angka adalah estimasi dari data lokal, bukan laporan terverifikasi.</p>
                <p className="flex gap-2"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" /> Respons disusun dari aturan sederhana, bukan model AI nyata.</p>
              </div>
              <Link to="/app/assistant" className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-primary">
                Buka AI Assistant <Wallet className="size-3" />
              </Link>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <SectionHeader title="Plan saat ini" description="Pro · demo" action={<Badge tone="primary">Aktif</Badge>} />
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                <p className="text-[20px] font-semibold text-text-primary">Pro</p>
                <p className="mt-0.5 text-[11px] text-text-muted">Semua workspace, analisis lintas data, ekspor lokal.</p>
                <p className="num mt-3 text-[22px] font-semibold text-primary">Rp149.000<span className="text-[11px] font-normal text-text-muted"> / bulan</span></p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Row label="Metode" value="Demo — tidak ada tagihan" />
                <Row label="Periode" value="Aktif selamanya (demo)" />
              </div>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => push({ title: 'Demo billing', description: 'Tidak ada pembayaran pada demo ini.', tone: 'info' })}>
                Kelola billing
              </Button>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Yang termasuk" description="Di semua plan demo" />
              <ul className="space-y-2 text-[11px] text-text-secondary">
                {['Finance & budget tracking', 'Content studio dan kalender', 'Seller intelligence & SEO', 'AI assistant dengan konteks', 'Ekspor CSV dan JSON', 'Data lokal tanpa server'].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-primary">·</span>{f}</li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
                Harga dan fitur adalah ilustrasi produk, bukan penawaran komersial.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionHeader title="Ekspor data" description="Unduh seluruh workspace sebagai JSON" />
              <p className="text-[11px] leading-relaxed text-text-muted">
                File berisi transaksi, budget, goals, konten, produk, pesanan, dan konfigurasi fee.
                Berguna untuk backup sebelum mengubah data.
              </p>
              <Button variant="secondary" className="mt-4" onClick={exportData}><Download /> Ekspor JSON</Button>
            </Card>
            <Card className="border-danger/20 p-5">
              <SectionHeader title="Reset data lokal" description="Tindakan tidak dapat dibatalkan" />
              <p className="text-[11px] leading-relaxed text-text-muted">
                Menghapus semua data tersimpan di browser dan mengembalikan aplikasi ke kondisi awal.
                Ekspor dulu jika ingin menyimpan salinan.
              </p>
              <Button variant="danger" className="mt-4" onClick={() => setResetOpen(true)}>
                <Trash2 /> Reset semua data
              </Button>
            </Card>
          </div>
          <Card className="mt-4 p-5">
            <SectionHeader title="Privasi" description="Cara data disimpan" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { t: 'Lokal', d: 'Data tersimpan di localStorage browser ini.' },
                { t: 'Tanpa server', d: 'Tidak ada API backend pada demo.' },
                { t: 'Bisa dihapus', d: 'Reset kapan saja dari halaman ini.' },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                  <p className="text-[11px] font-medium text-text-primary">{x.t}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{x.d}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetData}
        title="Reset semua data?"
        description="Semua data local workspace akan dihapus dan halaman dimuat ulang."
        confirmLabel="Ya, reset data"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span className="text-[11px] text-text-secondary">{value}</span>
    </div>
  )
}
