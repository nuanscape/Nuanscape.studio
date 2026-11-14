# PRD Kontrak — Nuanscape.studio (Frontend)

Versi: 2.0  
Tanggal: 14 November 2026  
Status: Kontrak berjalan untuk branch `FRONTEND`  
Repo: `nuanscape/Nuanscape.studio`  
Stack: Vite 8, React 19, TypeScript, Tailwind v4, Zustand (persist), React Router 7

Dokumen ini adalah **kontrak fitur**: apa yang sudah dijanjikan, di rute mana, bagaimana perilakunya, dan apa yang belum termasuk. Gunakan tabel fitur sebagai checklist rilis dan bahan uji terima.

---

## 1. Ringkasan Produk

Nuanscape.studio adalah **agentic command center** untuk mengelola empat unit kerja dalam satu dashboard:

| Unit | Peran | Accent |
| --- | --- | --- |
| Agent Monitor | Nuanscape AI sebagai head agent memantau seluruh aktivitas | Kuning `#F5D64B` |
| Seller Center | Seller Agent (Ucup) mengelola marketplace, stok, pesanan, profit | Oranye `#F0512B` |
| Content Production | Content Agent (Bambang) mengelola riset sampai distribusi konten | Teal `#24C7C4` |
| Finance | Finance Agent (Asep) mengelola arus kas, budget, aset, goal | Pink `#F58FD9` |

**Tujuan rilis FRONTEND:** menyediakan seluruh alur kerja di atas sebagai aplikasi demo yang dapat dipakai end-to-end di browser, dengan data lokal yang persisten.

---

## 2. Definisi Kontrak

Status yang dipakai di dokumen ini:

| Status | Arti |
| --- | --- |
| **Selesai** | Fitur ada, dapat dioperasikan, dan data bertahan setelah reload |
| **Sebagian** | Fitur ada dan dapat dioperasikan, tetapi data hanya di memori sesi |
| **Read-only** | Hanya menampilkan data/insight, tanpa aksi tulis |
| **Di luar cakupan** | Tidak dikerjakan pada rilis ini |

**Definition of Done global**

1. Rute dapat diakses tanpa error dan judul tab mengikuti halaman.
2. Aksi tulis memberi umpan balik (toast/status) dan tampil konsisten setelah reload, kecuali ditandai **Sebagian**.
3. Tampilan responsif pada 320 px, 360 px, 768 px, dan 1280 px tanpa overflow horizontal.
4. Navigasi keyboard berfungsi; fokus terlihat; `Ctrl K` membuka pencarian.
5. `npx tsc -b`, `npm run build`, dan `npx oxlint` lolos (lint tanpa error baru).

---

## 3. Persona & Akses

| Persona | Kebutuhan utama | Akses |
| --- | --- | --- |
| Owner / operator | Melihat semua unit kerja dan mengambil keputusan | Semua workspace |
| Seller operator | Memantau stok, pesanan, profit | Seller Center |
| Content operator | Riset, produksi, jadwal, analitik konten | Content Production |
| Finance operator | Transaksi, budget, aset, goal | Finance |

Autentikasi bersifat **demo lokal**: akun dan sesi disimpan di `localStorage`. Tidak ada PIN admin. Pengguna masuk dengan email/password atau mendaftar akun baru; password disimpan apa adanya (lihat 8.2).

Landing menampilkan tiga kartu unit kerja (Seller Center, Content Production, Finance). Agent Monitor diakses setelah login dan menjadi halaman default dashboard.

---

## 4. Peta Navigasi & Rute

### 4.1 Publik

| Rute | Halaman |
| --- | --- |
| `/` | Landing |
| `/login` | Masuk / Daftar |

### 4.2 Dashboard (`/app/*`, wajib sesi)

| Rute | Halaman | Navigasi utama |
| --- | --- | --- |
| `/app` | Redirect ke `/app/monitor` | — |
| `/app/monitor` | Agent Monitor — Office | Agent Monitor / Office |
| `/app/monitor/team` | Agent Monitor — Agent Team | Agent Monitor / Agent Team |
| `/app/monitor/automation` | Agent Monitor — Automation | Agent Monitor / Automation |
| `/app/monitor/report` | Agent Monitor — Report | Agent Monitor / Report |
| `/app/monitor/notifications` | Agent Monitor — Notifications | Agent Monitor / Notifications |
| `/app/monitor/settings` | Agent Monitor — API Settings | Agent Monitor / API Settings |
| `/app/automations` | Automations (halaman penuh) | Tidak di sidebar |
| `/app/notifications` | Notifications (halaman penuh) | Tidak di sidebar |
| `/app/settings` | Settings | Menu profil |
| `/app/profile` | Profile | Menu profil / extra navigation |
| `/app/seller/overview` | Seller Overview | Seller Center |
| `/app/seller/marketplaces` | Marketplace connections | Seller Center |
| `/app/seller/products` | Produk | Seller Center |
| `/app/seller/inventory` | Inventory | Seller Center |
| `/app/seller/orders` | Pesanan | Seller Center |
| `/app/seller/finance` | Finance & profit | Seller Center |
| `/app/seller/promotions` | Promosi & iklan | Seller Center |
| `/app/seller/seo` | SEO & GEO | Seller Center |
| `/app/seller/intelligence` | Product intelligence | Seller Center |
| `/app/seller/agent-report` | Agent Report | Seller Center |
| `/app/content/overview` | Content command center | Content Production |
| `/app/content/flow` | Flow Konten | Content Production |
| `/app/content/drafts` | Draft | Content Production |
| `/app/content/account` | Account | Content Production |
| `/app/content/analytic` | Analytic | Content Production |
| `/app/content/agent-report` | Agent Report | Content Production |
| `/app/finance/overview` | Financial intelligence | Finance |
| `/app/finance/transactions` | Transaksi | Finance |
| `/app/finance/income` | Pemasukan | Finance |
| `/app/finance/expenses` | Pengeluaran | Finance |
| `/app/finance/budgets` | Budget | Finance |
| `/app/finance/assets` | Aset & net worth | Finance |
| `/app/finance/goals` | Goals | Finance |
| `/app/finance/reports` | Laporan keuangan | Finance |

### 4.3 Redirect yang dipertahankan

| Rute lama | Tujuan |
| --- | --- |
| `/app/overview` | `/app/monitor` |
| `/app/assistant` | `/app/monitor` |
| `/app/shop/*` | `/app/seller/overview` |
| `/app/content` | `/app/content/overview` |
| `/app/content/accounts` | `/app/content/account` |
| `/app/content/accounts/:accountId` | `/app/content/analytic` |
| `/app/content/analytics` | `/app/content/analytic` |
| `/app/content/workspace` | `/app/content/flow` |
| `/app/content/workspace/:accountId` | `/app/content/flow?account=:accountId` |
| `/app/content/long-form/*` | `/app/content/flow` |
| `/app/content/short-form/*` | `/app/content/flow` |
| `/app/content/research`, `ideas`, `scripts`, `studio`, `calendar`, `library` | `/app/content/flow` |

---

## 5. Kontrak Fitur

### 5.1 Publik & Autentikasi

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| AUTH-01 | Landing | Hero `PrismaHero`, tiga kartu antarmuka agent (Seller Center, Content Production, Finance), CTA "Masuk ke {title}" | `/` | Selesai |
| AUTH-02 | Masuk | Email + password divalidasi terhadap akun lokal; sukses mengarah ke `next` atau `/app/monitor` | `/login` | Selesai |
| AUTH-03 | Daftar | Nama (min 2 karakter), email valid, password (min 6 karakter); akun baru langsung masuk | `/login` | Selesai |
| AUTH-04 | Sesi | Sesi dan akun bertahan setelah reload melalui `nuanscape-auth` | global | Selesai |
| AUTH-05 | Proteksi rute | Tanpa sesi, semua `/app/*` dialihkan ke login dengan `?next=` | global | Selesai |
| AUTH-06 | Logout | Sesi dihapus, kembali ke login, notifikasi toast | sidebar | Selesai |

**Kriteria terima**

- Login dengan kredensial salah menampilkan pesan error dan tidak membuat sesi.
- Akses `/app/...` tanpa sesi tidak pernah merender konten dashboard.
- Setelah login, reload tetap dalam sesi.
- Tidak ada jalur login tanpa akun/PIN.

---

### 5.2 Shell Dashboard

| ID | Fitur | Perilaku kontrak | Status |
| --- | --- | --- | --- |
| SHELL-01 | Sidebar workspace | Empat workspace, item aktif, collapse/expand, indikator sesi | Selesai |
| SHELL-02 | Branding | Logo Nuanscape, subtitle `Nuanscape.studio`; collapsed memakai mark | Selesai |
| SHELL-03 | Topbar | Pencarian (desktop & mobile), notifikasi unread, menu profil | Selesai |
| SHELL-04 | Command palette | `Ctrl K` / klik cari; cari halaman; Enter membuka rute | Selesai |
| SHELL-05 | Mobile nav | Drawer dari kiri, tutup via overlay/tombol, akses Settings & Logout | Selesai |
| SHELL-06 | Toast | Notifikasi aksi sukses/info/error, auto-dismiss, bisa ditutup | Selesai |
| SHELL-07 | Judul tab | `Label halaman · Nuanscape.studio`; landing & login punya judul khusus | Selesai |
| SHELL-08 | Aksesibilitas dasar | Skip link ke `#main-content`, fokus global terlihat, landmark `main` | Selesai |
| SHELL-09 | Ketahanan rute | Lazy route dengan fallback loading dan error boundary + muat ulang | Selesai |
| SHELL-10 | Quick actions | Buka Monitor, tambah produk, generate ide konten, tambah transaksi | Selesai |

**Kriteria terima**

- `Ctrl K` tidak memicu pencarian browser.
- Semua item navigasi dapat dicapai dengan Tab dan Enter.
- Drawer mobile menutup setelah navigasi.
- Tidak ada overflow horizontal pada 320 px, 360 px, dan 390 px.

---

### 5.3 Agent Monitor

Agent Monitor adalah command center head agent **Muhe** dengan empat agent: Asep (Finance), Ucup (Seller), Bambang (Content), dan Muhe (orkestrasi).

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| MON-01 | Office | Ringkasan lintas unit: kondisi hari ini, omzet, order aktif, stok kritis, pipeline konten, budget, ringkas bisnis, antrean kerja | `/app/monitor` | Selesai |
| MON-02 | Agent Team | Kartu empat agent, beban kerja, energy, tautan ke workspace masing-masing | `/app/monitor/team` | Selesai |
| MON-03 | Automation | Kanvas alur, daftar automation, filter status/modul, metrik, buat, approve, pause, run now | `/app/monitor/automation` | Selesai |
| MON-04 | Report | Daily/weekly briefing dari data finance, seller, content, dan approval automation | `/app/monitor/report` | Selesai |
| MON-05 | Notifications | Inbox ringkas per tipe (finance/content/shop/AI/system), filter belum dibaca, tandai dibaca | `/app/monitor/notifications` | Selesai |
| MON-06 | API Settings | Konfigurasi head agent: provider, base URL, model, API key, temperature, max tokens, system prompt, tes koneksi | `/app/monitor/settings` | Selesai |
| MON-07 | Automations penuh | Halaman standalone dengan metrik, workflow blueprint, filter, pembuatan automation | `/app/automations` | Selesai |
| MON-08 | Notifications penuh | Halaman standalone dengan metrik, filter semua/belum dibaca dan tipe, tandai semua | `/app/notifications` | Selesai |

**Kriteria terima**

- Angka Monitor konsisten dengan data Seller, Content, dan Finance.
- Notifikasi yang ditandai dibaca tetap terbaca setelah reload.
- Automation baru muncul di daftar dan statusnya bertahan setelah reload.
- Aksi sensitif pada automation berhenti di status `needs_approval` sampai disetujui.
- API Settings menyimpan provider, model, dan prompt; tombol tes koneksi memberi status `connected`/`error` secara simulasi.

---

### 5.4 Content Production

#### Struktur

Content Production tidak lagi memisahkan long-form dan short-form. Seluruh alur berada pada satu flow bertahap dengan pemilihan platform dan akun di awal. Tipe `storytelling` dan `konspirasi` memakai 8 tahap, sedangkan `music` memakai 7 tahap (tanpa langkah scenes).

| Tahap | Isi |
| --- | --- |
| Pilih akun | Pilih platform (YouTube/TikTok/Instagram) dan akun |
| Pilih tipe | `music`, `storytelling`, atau `konspirasi` |
| Riset | Ide, angle, audiens, keyword, tren sesuai niche |
| Script / brief | Naskah bertahap; brief audio untuk tipe music |
| Scenes | Daftar scene, narasi, visual, durasi; hanya untuk storytelling/konspirasi |
| Produksi | Checklist, gaya thumbnail/animasi/musik, disclaimer |
| Generate | Membuat poster/preview lokal; memakai energy |
| Result | Ringkasan paket produksi dan simpan sebagai draft |

| ID | Fitur | Perilaku kontrak | Status |
| --- | --- | --- | --- |
| CONTENT-01 | Overview | Agregasi per platform (followers, views 30D, posts 30D, engagement), tren area/bar, ringkasan pipeline | Selesai |
| CONTENT-02 | Flow Konten | Flow bertahap di atas, tipe konten, claim `Fakta`/`Dugaan`/`Spekulasi` untuk konspirasi, energy Bambang | Selesai |
| CONTENT-03 | Draft | Daftar konten yang punya hasil generate/preview/video, dikelompokkan per platform dan akun | Selesai |
| CONTENT-04 | Account | 9 akun platform (3 per platform), status link/unlink, metrik followers/views/engagement | Selesai |
| CONTENT-05 | Analytic | Filter scope semua/platform/akun, metrik dan tabel performa | Selesai |
| CONTENT-06 | Agent Report | Laporan Bambang: konten dikelola, published, in progress, sisa generate, approval automation, aktivitas | Selesai |
| CONTENT-07 | Energy | `aiEnergy` awal 100/100; setiap generate memotong 10; habis menampilkan peringatan | Selesai |
| CONTENT-08 | API key konten | Menyimpan API key Bambang; key baru mengisi ulang energy ke maksimum | Selesai |

**Niche yang tersedia pada flow:** `agentic-ai`, `produktivitas`, `bisnis-umkm`, dan niche lain di `production-data.ts`, masing-masing dengan platform, audiens, angle, keyword, dan tren.

**Kriteria terima**

- Generate tidak berjalan bila energy kurang dari 10.
- Hasil generate muncul di Draft dengan `accountId` yang sama.
- Mengganti API key mengisi ulang energy.
- Scope akun pada Analytic tidak mencampur data antar platform.
- Redirect lama long-form/short-form tetap membuka `/app/content/flow` tanpa error.

---

### 5.5 Seller Center

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| SELLER-01 | Overview | Pemasukan, saldo bersih, pesanan, inventory value, revenue per marketplace, marketplace mix, waterfall, order terbaru, stok kritis, AI shop intelligence | `/app/seller/overview` | Selesai |
| SELLER-02 | Marketplaces | Kelola hingga 3 akun TikTok Shop dan 3 akun Shopee; tautkan/putuskan, status, izin, performa, revenue share | `/app/seller/marketplaces` | Sebagian (sync simulasi) |
| SELLER-03 | Products | CRUD produk, pencarian/filter, status, harga, HPP, margin, SEO/GEO score, hapus dengan konfirmasi | `/app/seller/products` | Selesai |
| SELLER-04 | Inventory | Nilai inventory, unit, stok rendah/habis, level stok, pergerakan, catat restock | `/app/seller/inventory` | Selesai |
| SELLER-05 | Orders | Filter status/pencarian, detail pesanan, ubah status, ekspor CSV | `/app/seller/orders` | Selesai |
| SELLER-06 | Finance | Pemasukan, diskon, refund, HPP, fee platform, affiliate, ongkir, iklan, opex, saldo bersih, buku kas, konfigurasi fee | `/app/seller/finance` | Selesai |
| SELLER-07 | Promosi & Iklan | Voucher (percent/fixed/shipping), flash sale, diskon produk, kampanye iklan; status active/paused/scheduled/ended; scope akun | `/app/seller/promotions` | Selesai |
| SELLER-08 | SEO & GEO | Skor rata-rata, prioritas perbaikan, detail skor produk, metodologi | `/app/seller/seo` | Read-only |
| SELLER-09 | Intelligence | Kontribusi profit, sinyal keputusan, matriks produk, stok berisiko | `/app/seller/intelligence` | Read-only |
| SELLER-10 | Agent Report | Laporan Ucup: kinerja marketplace, kesehatan inventori, command & approval, rekomendasi | `/app/seller/agent-report` | Selesai |
| SELLER-11 | Account scope | Filter `Semua akun` atau akun marketplace tertentu pada overview, inventory, orders, finance, promosi | global Seller | Selesai |

**Kriteria terima**

- Restock menambah stok, mencatat pergerakan, dan memperbarui metrik inventory.
- Perubahan status pesanan tampil di detail dan ringkasan.
- Fee yang diubah langsung mengubah estimasi profit dan saldo bersih.
- Produk baru/hapus tercermin di SEO, Inventory, Intelligence, dan Overview.
- Voucher/flash sale/diskon masuk sebagai biaya promo pada buku kas.
- Akun aktif tidak dipersistensi setelah reload; scope kembali ke `Semua akun`.

---

### 5.6 Finance

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| FIN-01 | Overview | Balance, income, expense, savings rate, health score, distribusi pengeluaran, budget health, aset/liabilitas, sumber pemasukan | `/app/finance/overview` | Selesai |
| FIN-02 | Transactions | Daftar, filter tipe/kategori/akun, pencarian, tambah, hapus, ekspor | `/app/finance/transactions` | Selesai |
| FIN-03 | Income | Total, rata-rata, pemasukan berulang, tren, komposisi sumber, riwayat | `/app/finance/income` | Selesai |
| FIN-04 | Expenses | Total, rata-rata, kategori terbesar, budget usage, pengeluaran tidak biasa, riwayat | `/app/finance/expenses` | Selesai |
| FIN-05 | Budgets | Limit/terpakai/tersisa, kategori terlampaui, tambah & ubah budget, AI budget advisor | `/app/finance/budgets` | Selesai |
| FIN-06 | Assets | Net worth, aset, liabilitas, likuiditas, alokasi, tambah aset & liabilitas | `/app/finance/assets` | Selesai |
| FIN-07 | Goals | Target, terkumpul, sisa, kebutuhan per bulan, tambah goal, kontribusi dana | `/app/finance/goals` | Selesai |
| FIN-08 | Reports | Income vs expense, cash flow, komposisi pengeluaran, monthly breakdown, ekspor CSV | `/app/finance/reports` | Selesai |

**Kriteria terima**

- Transaksi baru mengubah income/expense, budget terpakai, dan laporan.
- Kontribusi goal menambah `saved` dan tidak melebihi target secara diam-diam.
- Semua nominal memakai format Rupiah (`formatIDR`).
- Ekspor laporan menghasilkan file CSV yang dapat dibuka.

---

### 5.7 Settings

| ID | Fitur | Perilaku kontrak | Status |
| --- | --- | --- | --- |
| SET-01 | Profil | Ubah nama, email, peran, timezone; tersimpan melalui auth store | Selesai |
| SET-02 | Workspace | Mata uang, bahasa, awal minggu, mode angka ringkas; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-03 | Notifikasi | Pilihan sinyal harian/stok/budget/konten/email; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-04 | AI | Gaya jawaban, sitasi, estimasi, approval; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-05 | Data — ekspor | Unduh user, finance, content, dan shop sebagai JSON | Selesai |
| SET-06 | Data — reset | Konfirmasi lalu hapus data lokal dan kembali ke landing | Sebagian (lihat 8.2) |

**Catatan:** tautan "Buka AI Assistant" mengarah ke `/app/assistant`, yang saat ini redirect ke `/app/monitor`.

---

## 6. Alur End-to-End yang Dijanjikan

1. **Content:** pilih akun → pilih tipe → riset → script/brief → scenes → produksi → generate → result → Draft → Analytic.
2. **Seller:** tautkan marketplace → tambah produk → restock → pesanan masuk → ubah status → fee dihitung → promosi memengaruhi saldo → profit/intelligence diperbarui.
3. **Finance:** catat transaksi → budget terpakai → goal terkumpul → laporan dan health score diperbarui.
4. **Monitor:** perubahan dari tiga modul di atas tampil pada Office, Report, Agent Team, dan notifikasi.
5. **Automation:** alur dibuat/diubah → approval → run → hasil tercatat pada laporan dan notifikasi.

---

## 7. Data & Persistensi

### 7.1 Entitas inti

`Transaction`, `Budget`, `Goal`, `AssetItem`, `LiabilityItem`, `ContentItem`, `ContentIdea`, `LibraryAsset`, `PlatformAccount`, `Product`, `InventoryMovement`, `Order`, `MarketplaceConnection`, `Voucher`, `FlashSale`, `AdCampaign`, `LedgerEntry`, `AppNotification`, `Automation`, `AIInsight`.

### 7.2 Enum kunci

| Enum | Nilai |
| --- | --- |
| `Platform` | YouTube, TikTok, Instagram |
| `ContentFormat` | long, short |
| `ContentStatus` | Researching, Idea, Approved, Script Ready, Production, Editing, Review, Draft, Ready to Publish, Published, Failed |
| `ContentType` (flow) | music, storytelling, konspirasi |
| `ClaimType` | Fakta, Dugaan, Spekulasi |
| `Order.status` | Pending, Processing, Shipped, Completed, Cancelled, Returned |
| `Automation.status` | active, paused, needs_approval |
| `Product.status` | Active, Paused, Out of Stock |
| `PromoStatus` | active, paused, scheduled, ended |
| `Voucher.kind` | percent, fixed, shipping |
| `LedgerType` | income, discount, refund, platform_fee, affiliate_fee, shipping, cogs, ads, opex |
| `MarketplaceConnection.status` | connected, disconnected, syncing, error |

### 7.3 Kunci localStorage

| Kunci | Isi |
| --- | --- |
| `nuanscape-auth` | User, akun terdaftar, sesi |
| `nuanscape-app` | Notifikasi, preferensi sidebar |
| `nuanscape-content` | Konten, ide, library, energy, API key, status link akun |
| `nuanscape-finance` | Transaksi, budget, goal, aset, liabilitas |
| `nuanscape-seller-v4` | Produk, pesanan, koneksi, fee, pergerakan, voucher, flash sale, iklan |
| `nuanscape-automations` | Daftar automation |
| `nuanscape-api-settings` | Konfigurasi head agent |

`activeAccountId` Seller dikecualikan dari persistensi. Toast tidak dipersistensi.

### 7.4 Seed akun konten

| ID | Handle | Platform | Format | Followers | Status |
| --- | --- | --- | --- | --- | --- |
| `yt-muhe` | @muhestudio | YouTube | long | 128.400 | Active |
| `yt-chill` | @muhechill | YouTube | long | 64.200 | Growing |
| `yt-labs` | @muhelabs | YouTube | long | 41.800 | Growing |
| `tt-muhe` | @muhe.id | TikTok | short | 214.000 | Active |
| `tt-clips` | @muhe.clips | TikTok | short | 38.600 | Growing |
| `tt-notes` | @muhe.notes | TikTok | short | 92.700 | Active |
| `ig-muhe` | @muhe.co | Instagram | short | 52.400 | Active |
| `ig-lab` | @muhe.lab | Instagram | short | 12.800 | Paused |
| `ig-reels` | @muhe.reels | Instagram | short | 27.900 | Growing |

---

## 8. Batasan & Risiko yang Diakui

### 8.1 Bukan bagian dari kontrak rilis ini

- Backend, database server, multi-user, dan RBAC nyata.
- Upload file/video nyata; library hanya metadata.
- Integrasi marketplace, pembayaran, dan sinkronisasi data live.
- AI generation nyata; poster/preview dibuat lokal dan insight bersifat demo.
- Email/push notification dan billing.
- PIN admin / login tanpa akun.

### 8.2 Keterbatasan yang diketahui

| Area | Keterbatasan | Dampak |
| --- | --- | --- |
| Settings | Preferensi workspace/notifikasi/AI hanya di state komponen | Kembali default setelah reload |
| Reset data | Menghapus key lama `muhe-finance`, `muhe-content`, `nuanscape-seller`; tidak menghapus `nuanscape-seller-v4`, `nuanscape-automations`, `nuanscape-api-settings` | Sebagian data lama tetap ada |
| Autentikasi | Password akun lokal disimpan apa adanya di `localStorage` | Tidak layak untuk data nyata |
| Marketplace | Sinkronisasi hanya simulasi status | Tidak ada data eksternal nyata |
| API Settings | Konfigurasi tersimpan tetapi belum dipakai untuk panggilan model nyata | Tes koneksi bersifat simulasi |
| Content generate | Preview/poster adalah SVG lokal; tidak ada render video | Hasil bukan media final |
| AI Assistant | Tautan Settings mengarah ke redirect Monitor | Tidak ada halaman asisten terpisah |
| Landing | Hanya tiga unit; Agent Monitor tidak memiliki kartu | Monitor hanya bisa diakses setelah login |
| Library | "Tambah aset" mencatat metadata, tanpa unggah file | Tidak ada file fisik |
| Video hero | Bergantung pada CDN eksternal | Gagal muat jika CDN diblokir |

---

## 9. Kontrak Non-Fungsional

| Aspek | Target |
| --- | --- |
| Tema | Dark-only, brand kuning `#F5D64B`, token desain di `globals.css` |
| Tipografi | Geist (UI), Geist Mono (angka/kode), Anton (display) |
| Responsif | 320 px, 360 px, 768 px, 1280 px tanpa overflow horizontal |
| Aksesibilitas | Skip link, fokus terlihat, label pada tombol ikon, kontras teks minimal AA untuk teks kecil |
| Performa | Rute di-lazy-load; chart dan motion dimuat hanya saat dibutuhkan |
| Ketahanan | Error boundary untuk kegagalan chunk; fallback loading per rute |
| Kualitas | TypeScript strict build, build produksi, lint tanpa error |

---

## 10. Roadmap Fase 2

1. Backend API + database dan autentikasi nyata (email/OAuth, RBAC, hashing password).
2. Persistensi preferensi Settings dan perbaikan reset data.
3. Upload media dan storage aset konten.
4. Integrasi marketplace dan sinkronisasi pesanan/stok live.
5. AI agent nyata: riset, generate ide/script, dan render media melalui API Settings.
6. Notifikasi realtime dan email digest.
7. Multi-workspace dan kolaborasi tim.

---

## 11. Referensi Implementasi

| Sumber | Fungsi |
| --- | --- |
| `src/app/router.tsx` | Daftar rute final, redirect legacy, guard, judul halaman |
| `src/components/navigation/nav-config.ts` | Struktur workspace, item navigasi, quick actions |
| `src/features/monitor/AgentMonitorPage.tsx` | Section Office, Team, Automation, Report, Notifications, API Settings |
| `src/features/content/ContentProductionPage.tsx` | Flow bertahap per tipe, scenes, generate, energy |
| `src/features/content/components/production-data.ts` | Niche, platform, audiens, angle, keyword, tren |
| `src/features/seller/SellerPromotionsPage.tsx` | Voucher, flash sale, iklan, diskon produk |
| `src/lib/seller-ledger.ts` | Perhitungan buku kas seller dan saldo bersih |
| `src/types/index.ts` | Kontrak tipe data |
| `src/stores/*.ts` | Aksi tulis dan persistensi localStorage |
| `src/data/mock.ts` | Seed data demo, termasuk 9 akun platform |

---

## 12. Riwayat Versi

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 1.0 | 12 Nov 2026 | Kontrak awal seluruh fitur frontend |
| 2.0 | 14 Nov 2026 | Menyesuaikan implementasi terbaru: login tanpa PIN, landing 3 unit, Monitor ber-section, Content flow bertahap (7–8 tahap per tipe) tanpa long/short, 9 akun platform, promosi seller, automation & API settings persisten, audit mobile 320 px, dan batasan reset data |
