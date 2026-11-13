# PRD Kontrak — Nuanscape.studio (Frontend)

Versi: 1.0  
Tanggal: 12 November 2026  
Status: Kontrak berjalan untuk branch `FRONTEND`  
Repo: `nuanscape/Nuanscape.studio`  
Stack: Vite 8, React 19, TypeScript, Tailwind v4, Zustand (persist), React Router

Dokumen ini adalah **kontrak fitur**: apa yang sudah dijanjikan, di rute mana, bagaimana perilakunya, dan apa yang belum termasuk. Gunakan tabel fitur sebagai checklist rilis dan bahan uji terima.

---

## 1. Ringkasan Produk

Nuanscape.studio adalah **agentic command center** untuk mengelola empat unit kerja dalam satu dashboard:

| Unit | Peran | Accent |
| --- | --- | --- |
| Agent Monitor | Nuanscape AI sebagai head agent memantau seluruh aktivitas | Kuning `#F5D64B` |
| Seller Center | Seller Agent mengelola marketplace, stok, pesanan, profit | Oranye `#F0512B` |
| Content Production | Content Agent mengelola riset sampai distribusi konten | Teal `#24C7C4` |
| Finance | Finance Agent mengelola arus kas, budget, aset, goal | Pink `#F58FD9` |

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
3. Tampilan responsif pada 360 px, 768 px, dan 1280 px.
4. Navigasi keyboard berfungsi; fokus terlihat; `Ctrl K` membuka pencarian.
5. `npx tsc -b`, `npm run build`, dan `npm run lint` lolos (lint tanpa error baru).

---

## 3. Persona & Akses

| Persona | Kebutuhan utama | Akses |
| --- | --- | --- |
| Owner / operator | Melihat semua unit kerja dan mengambil keputusan | Semua workspace |
| Seller operator | Memantau stok, pesanan, profit | Seller Center |
| Content operator | Riset, produksi, jadwal, analitik konten | Content Production |
| Finance operator | Transaksi, budget, aset, goal | Finance |
| Admin demo | Masuk cepat tanpa akun | PIN Admin |

Autentikasi bersifat **demo lokal**: akun disimpan di `localStorage`, sesi admin di `sessionStorage`. PIN admin demo: `1234`.

---

## 4. Peta Navigasi & Rute

### 4.1 Publik

| Rute | Halaman |
| --- | --- |
| `/` | Landing |
| `/login` | Masuk / Daftar / PIN Admin |

### 4.2 Dashboard (`/app/*`, wajib sesi)

| Rute | Halaman |
| --- | --- |
| `/app/monitor` | Agent Monitor |
| `/app/automations` | Automations |
| `/app/notifications` | Notifications |
| `/app/settings` | Settings |
| `/app/profile` | Profile |
| `/app/seller/overview` | Seller Overview |
| `/app/seller/marketplaces` | Marketplace connections |
| `/app/seller/products` | Produk |
| `/app/seller/inventory` | Inventory |
| `/app/seller/orders` | Pesanan |
| `/app/seller/finance` | Finance & profit |
| `/app/seller/seo` | SEO & GEO |
| `/app/seller/intelligence` | Product intelligence |
| `/app/content/overview` | Content command center |
| `/app/content/accounts` | Akun konten |
| `/app/content/accounts/:accountId` | Detail akun |
| `/app/content/long-form` | Hub long-form |
| `/app/content/short-form` | Hub short-form |
| `/app/content/{long,short}-form/research` | Research |
| `/app/content/{long,short}-form/ideas` | Ideas |
| `/app/content/{long,short}-form/scripts` | Scripts |
| `/app/content/{long,short}-form/studio` | Studio |
| `/app/content/{long,short}-form/drafts` | Production / Batch board |
| `/app/content/{long,short}-form/calendar` | Calendar |
| `/app/content/{long,short}-form/library` | Library |
| `/app/content/{long,short}-form/analytics` | Analytics |
| `/app/finance/overview` | Financial intelligence |
| `/app/finance/transactions` | Transaksi |
| `/app/finance/income` | Pemasukan |
| `/app/finance/expenses` | Pengeluaran |
| `/app/finance/budgets` | Budget |
| `/app/finance/assets` | Aset & net worth |
| `/app/finance/goals` | Goals |
| `/app/finance/reports` | Laporan keuangan |

Rute lama `content/research`, `content/ideas`, dst. dialihkan permanen ke `content/long-form/*` agar tautan lama tidak rusak.

---

## 5. Kontrak Fitur

### 5.1 Publik & Autentikasi

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| AUTH-01 | Landing | Hero video, daftar antarmuka agent, CTA masuk ke Monitor, tautan sosial | `/` | Selesai |
| AUTH-02 | Masuk | Email + password divalidasi terhadap akun lokal; sukses mengarah ke `next` atau Monitor | `/login` | Selesai |
| AUTH-03 | Daftar | Nama, email, password; akun baru disimpan lokal dan langsung masuk | `/login` | Selesai |
| AUTH-04 | PIN Admin | PIN `1234` membuka dashboard tanpa akun; sesi bertahan selama tab | `/login` | Selesai |
| AUTH-05 | Proteksi rute | Tanpa sesi, semua `/app/*` dialihkan ke login dengan `?next=` | global | Selesai |
| AUTH-06 | Logout | Sesi dihapus, kembali ke login, notifikasi toast | sidebar | Selesai |

**Kriteria terima**

- Login dengan kredensial salah menampilkan pesan error dan tidak membuat sesi.
- Akses `/app/...` tanpa sesi tidak pernah merender konten dashboard.
- Setelah login, reload tetap dalam sesi.

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

**Kriteria terima**

- `Ctrl K` tidak memicu pencarian browser.
- Semua item navigasi dapat dicapai dengan Tab dan Enter.
- Drawer mobile menutup setelah navigasi.

---

### 5.3 Agent Monitor

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| MON-01 | Command Center | Ringkasan lintas unit: net finance, order aktif, stok kritis, pipeline konten, unit kerja, antrean kerja | `/app/monitor` | Selesai |
| MON-02 | Automations | Daftar alur, filter status, metrik, buat automation, aktif/pause, run now, approval massal | `/app/automations` | Sebagian (state sesi) |
| MON-03 | Notifications | Inbox, filter semua/belum dibaca dan tipe, tandai satu/semua dibaca, ringkasan sumber & preferensi | `/app/notifications` | Selesai |
| MON-04 | Profile | Ringkasan kontribusi lintas modul, edit nama/peran, aktivitas terbaru | `/app/profile` | Selesai |

**Kriteria terima**

- Angka Monitor konsisten dengan data Seller, Content, dan Finance.
- Notifikasi yang ditandai dibaca tetap terbaca setelah reload.
- Automation baru muncul di daftar; perubahan status berlaku sampai reload.

---

### 5.4 Content Production

#### Struktur

Content dipisah menjadi dua flow dengan pipeline dan bahasa yang berbeda:

| Flow | Platform | Basis rute | Penekanan |
| --- | --- | --- | --- |
| Long-form | YouTube | `/app/content/long-form/*` | Watch time, struktur episode, produksi |
| Short-form | TikTok, Instagram | `/app/content/short-form/*` | Hook, batch, completion rate |

Setiap flow memiliki 8 tahap: Research, Ideas, Scripts, Studio, Drafts, Calendar, Library, Analytics. Scope akun dapat dipilih lewat `?account=<id>` dan tetap terbawa saat berpindah tahap.

| ID | Fitur | Perilaku kontrak | Status |
| --- | --- | --- | --- |
| CONTENT-01 | Overview | Board per format: metrik, progres pipeline, grid tahap, akun + jumlah konten, pipeline terdekat, views per format, format mix, insight, next best action | Selesai |
| CONTENT-02 | Accounts | 6 akun platform (YouTube/TikTok/Instagram), metrik followers/views/engagement, status Active/Growing/Paused | Selesai |
| CONTENT-03 | Account detail | Filter konten per akun, metrik akun, pipeline, jadwal terdekat, daftar konten | Selesai |
| CONTENT-04 | Format hub | Metrik flow, akun pada flow, alur produksi, jadwal terdekat, top performing | Selesai |
| CONTENT-05 | Research | Keyword peluang, content gap, audiens, format disarankan, tren; hasil berbeda per flow | Read-only |
| CONTENT-06 | Ideas | Daftar ide dengan skor, filter, tambah ide, approve, promote jadi konten | Selesai |
| CONTENT-07 | Scripts | Daftar naskah, tambah/ubah script, status `Script Ready` | Selesai |
| CONTENT-08 | Studio | Template per flow, form brief (judul, platform, akun, niche, format, status awal, jadwal, caption, hashtag), simpan ke pipeline | Selesai |
| CONTENT-09 | Drafts | Board status (long: Ide/Naskah/Produksi/Siap tayang/Tayang; short: Ide/Hook/Shoot/Edit/Siap posting/Tayang), pindah status, hapus dengan konfirmasi | Selesai |
| CONTENT-10 | Calendar | Kalender bulanan, navigasi bulan, ringkasan per akun, kartu jadwal dengan status | Selesai |
| CONTENT-11 | Library | Aset per format (Video/Image/Thumbnail/Script/Caption), metrik tipe, tambah aset, detail aset | Selesai |
| CONTENT-12 | Analytics | Views, engagement, jam terbaik, kontribusi per akun (donut), tabel performa, best time to post | Selesai |
| CONTENT-13 | Account scoping | Pilihan "Semua akun · N" atau akun tertentu; filter berlaku di seluruh tahap | Selesai |
| CONTENT-14 | Format badge | Badge & warna flow konsisten di header dan kartu | Selesai |

**Kriteria terima**

1. Ide yang di-promote muncul sebagai konten di Drafts dengan `accountId` yang sama.
2. Konten baru dari Studio langsung terlihat di Drafts, Calendar, Library (jika relevan), dan Analytics.
3. Mengubah status di board mengubah data di Calendar dan ringkasan Overview.
4. Pindah tahap saat scope akun aktif mempertahankan filter akun.
5. Dataset long dan short tidak tercampur pada metrik maupun daftar.
6. Hapus konten meminta konfirmasi dan menghilangkan item dari semua tampilan.

---

### 5.5 Seller Center

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| SELLER-01 | Overview | Revenue 30D, net profit, pesanan, nilai inventory, revenue per marketplace, profit waterfall, pesanan terbaru, stok kritis | `/app/seller/overview` | Selesai |
| SELLER-02 | Marketplaces | Koneksi TikTok Shop & Shopee, status, izin, sinkronisasi, performa & revenue share | `/app/seller/marketplaces` | Sebagian (sync simulasi) |
| SELLER-03 | Products | CRUD produk, pencarian/filter, status, SEO/GEO score, hapus dengan konfirmasi | `/app/seller/products` | Selesai |
| SELLER-04 | Inventory | Nilai inventory, unit, stok rendah/habis, level stok, pergerakan, catat restock | `/app/seller/inventory` | Selesai |
| SELLER-05 | Orders | Filter status/pencarian, detail pesanan, ubah status, ekspor CSV | `/app/seller/orders` | Selesai |
| SELLER-06 | Finance | Net sales, gross/net profit, fee, revenue 7 hari, alokasi biaya, konfigurasi fee, waterfall, profit per produk | `/app/seller/finance` | Selesai |
| SELLER-07 | SEO & GEO | Skor rata-rata, prioritas perbaikan, detail skor produk, metodologi | `/app/seller/seo` | Read-only |
| SELLER-08 | Intelligence | Kontribusi profit, sinyal keputusan, matriks produk, stok berisiko | `/app/seller/intelligence` | Read-only |

**Kriteria terima**

- Restock menambah stok, mencatat pergerakan, dan memperbarui metrik inventory.
- Perubahan status pesanan tampil di detail dan ringkasan.
- Fee yang diubah langsung mengubah estimasi profit.
- Produk baru/hapus tercermin di SEO, Inventory, Intelligence, dan Overview.

---

### 5.6 Finance

| ID | Fitur | Perilaku kontrak | Rute | Status |
| --- | --- | --- | --- | --- |
| FIN-01 | Overview | Balance, income, expense, savings rate, health score, distribusi pengeluaran, insight | `/app/finance/overview` | Selesai |
| FIN-02 | Transactions | Daftar, filter tipe/kategori/akun, tambah, hapus | `/app/finance/transactions` | Selesai |
| FIN-03 | Income | Total, rata-rata, berulang, tren, komposisi sumber, riwayat | `/app/finance/income` | Selesai |
| FIN-04 | Expenses | Total, rata-rata, kategori terbesar, biaya berulang, donut, pengeluaran tidak biasa | `/app/finance/expenses` | Selesai |
| FIN-05 | Budgets | Limit/terpakai/tersisa, kategori terlampaui, ringkasan pemakaian, tambah & ubah budget | `/app/finance/budgets` | Selesai |
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
| SET-01 | Profil | Ubah nama, email, peran, timezone; tersimpan dan dipakai sapaan | Selesai |
| SET-02 | Workspace | Preferensi angka ringkas, bahasa, awal minggu; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-03 | Notifikasi | Pilihan sinyal notifikasi; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-04 | Preferensi AI | Nada jawaban, sitasi, estimasi, approval; simpan memberi konfirmasi | Sebagian (tidak persisten) |
| SET-05 | Billing | Status plan Pro demo; aksi billing bersifat informasi | Read-only |
| SET-06 | Ekspor data | Unduh seluruh workspace sebagai JSON | Selesai |
| SET-07 | Reset data | Konfirmasi lalu hapus data lokal dan kembali ke landing | Sebagian (lihat 8.2) |

---

## 6. Alur End-to-End yang Dijanjikan

1. **Content:** Research → pilih ide → approve → promote → Scripts → Studio → Drafts → Calendar → Published → Analytics.
2. **Seller:** tambah produk → restock → pesanan masuk → ubah status → fee dihitung → profit dan intelligence diperbarui.
3. **Finance:** catat transaksi → budget terpakai → goal terkumpul → laporan dan health score diperbarui.
4. **Monitor:** perubahan dari tiga modul di atas tampil pada ringkasan dan antrean kerja.

---

## 7. Data & Persistensi

### 7.1 Entitas inti

`Transaction`, `Budget`, `Goal`, `AssetItem`, `LiabilityItem`, `ContentItem`, `ContentIdea`, `LibraryAsset`, `PlatformAccount`, `Product`, `InventoryMovement`, `Order`, `MarketplaceConnection`, `AppNotification`, `Automation`, `AIInsight`.

### 7.2 Enum kunci

| Enum | Nilai |
| --- | --- |
| `Platform` | YouTube, TikTok, Instagram |
| `ContentFormat` | long, short |
| `ContentStatus` | Researching, Idea, Approved, Script Ready, Production, Editing, Review, Draft, Ready to Publish, Published, Failed |
| `Order.status` | Pending, Processing, Shipped, Completed, Cancelled, Returned |
| `Automation.status` | active, paused, needs_approval |
| `Product.status` | Active, Paused, Out of Stock |

### 7.3 Kunci localStorage

| Kunci | Isi |
| --- | --- |
| `nuanscape-auth` | User, akun terdaftar, sesi |
| `nuanscape-app` | Profil aplikasi, notifikasi, preferensi sidebar |
| `nuanscape-content` | Konten, ide, library |
| `nuanscape-finance` | Transaksi, budget, goal, aset, liabilitas |
| `nuanscape-seller` | Produk, pesanan, koneksi, fee, pergerakan |

### 7.4 Seed akun konten

| ID | Handle | Platform | Format | Followers | Status |
| --- | --- | --- | --- | --- | --- |
| `yt-muhe` | @muhestudio | YouTube | long | 128.400 | Active |
| `yt-chill` | @muhechill | YouTube | long | 64.200 | Growing |
| `tt-muhe` | @muhe.id | TikTok | short | 214.000 | Active |
| `tt-clips` | @muhe.clips | TikTok | short | 38.600 | Growing |
| `ig-muhe` | @muhe.co | Instagram | short | 52.400 | Active |
| `ig-lab` | @muhe.lab | Instagram | short | 12.800 | Paused |

---

## 8. Batasan & Risiko yang Diakui

### 8.1 Bukan bagian dari kontrak rilis ini

- Backend, database server, multi-user, dan RBAC nyata.
- Upload file/video nyata; library hanya metadata.
- Integrasi marketplace, pembayaran, dan sinkronisasi data live.
- AI generation nyata; insight dan skor bersifat demo.
- Email/push notification dan billing.

### 8.2 Keterbatasan yang diketahui

| Area | Keterbatasan | Dampak |
| --- | --- | --- |
| Settings | Preferensi workspace/notifikasi/AI tidak disimpan ke store | Kembali default setelah reload |
| Automations | Data automation hanya di state komponen | Hilang setelah reload |
| Reset data | Daftar kunci reset belum memuat `nuanscape-finance` dan `nuanscape-content` | Sebagian data finance/content tetap ada |
| Marketplace | Sinkronisasi hanya simulasi status | Tidak ada data eksternal nyata |
| Library | "Tambah aset" mencatat metadata, tanpa unggah file | Tidak ada file fisik |
| Video hero | Bergantung pada CDN eksternal | Gagal muat jika CDN diblokir |

---

## 9. Kontrak Non-Fungsional

| Aspek | Target |
| --- | --- |
| Tema | Dark-only, brand kuning `#F5D64B`, token desain di `globals.css` |
| Tipografi | Geist (UI), Geist Mono (angka/kode), Anton (display) |
| Responsif | 360 px, 768 px, 1280 px tanpa overflow horizontal |
| Aksesibilitas | Skip link, fokus terlihat, label pada tombol ikon, kontras teks minimal AA untuk teks kecil |
| Performa | Rute di-lazy-load; chart dan motion dimuat hanya saat dibutuhkan |
| Ketahanan | Error boundary untuk kegagalan chunk; fallback loading per rute |
| Kualitas | TypeScript strict build, build produksi, lint tanpa error |

---

## 10. Roadmap Fase 2

1. Backend API + database dan autentikasi nyata (email/OAuth, RBAC).
2. Persistensi preferensi Settings dan automation.
3. Upload media dan storage aset konten.
4. Integrasi marketplace dan sinkronisasi pesanan/stok live.
5. AI agent nyata: riset, generate ide/script, analitik prediktif.
6. Notifikasi realtime dan email digest.
7. Multi-workspace dan kolaborasi tim.

---

## 11. Referensi Implementasi

| Sumber | Fungsi |
| --- | --- |
| `src/app/router.tsx` | Daftar rute final, redirect legacy, guard, judul halaman |
| `src/components/navigation/nav-config.ts` | Struktur workspace, item navigasi, quick actions |
| `src/features/content/components/content-flow.tsx` | Flow long/short, stage, scoping akun |
| `src/types/index.ts` | Kontrak tipe data |
| `src/stores/*.ts` | Aksi tulis dan persistensi localStorage |
| `src/data/mock.ts` | Seed data demo |

---

## 12. Riwayat Versi

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 1.0 | 12 Nov 2026 | Kontrak awal seluruh fitur frontend |
