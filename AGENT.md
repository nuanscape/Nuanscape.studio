# AGENT.md — Aturan Kerja Repo Nuanscape.studio

## Peran kita: BACKEND ONLY

Repo ini berisi frontend demo (`FRONTEND`) dan PRD kontrak. Tugas tim ini adalah **membangun backend** yang melayani kontrak data frontend. Frontend adalah area tim lain.

## Aturan keras

1. **Jangan mengubah file frontend.** Area terlarang:
   - `src/**`
   - `index.html`
   - `vite.config.ts`, `tsconfig*.json`
   - `public/**`
   - `package.json` / `package-lock.json` root
   - `dist/**`
2. **Jangan mengubah `PRD.md`.** PRD adalah kontrak; backend menyesuaikan ke PRD, bukan sebaliknya. Perubahan kontrak harus lewat kesepakatan dengan pemilik PRD.
3. **Semua kode backend berada di `backend/`** dan harus bisa dijalankan tanpa menyentuh frontend.
4. **Jangan membuat commit yang mencampur perubahan backend dan frontend.** Satu commit = satu lingkup.
5. Jangan menghapus atau menimpa perubahan lokal orang lain di working tree.
6. **Agen AI bersifat read-only.** PicoClaw hanya boleh membaca snapshot dan menghasilkan temuan. Jangan memberi tool `exec`, `write_file`, `edit_file`, atau akses jaringan; semua aksi tulis dieksekusi backend setelah approval.
7. **Provider agent: kie.ai primary + NVIDIA NIM fallback.** Jangan hardcode API key di config/repo; gunakan `KIE_API_KEY` dan `NVIDIA_API_KEY`, lalu generate `agents/picoclaw/.security.yml` dengan `npm run agent:security`.

## Sumber kebenaran

- `PRD.md` — kontrak fitur, rute, entitas, enum, dan kunci persistensi (§7).
- `src/types/index.ts` — bentuk tipe data aktual frontend. Baca sebagai referensi; jangan diedit.
- `src/stores/*.ts` — perilaku aksi tulis dan kunci `localStorage` yang nantinya digantikan API.

## Target backend

Backend menggantikan persistensi `localStorage` demo dengan API nyata, sesuai roadmap Fase 2 PRD:

- Autentikasi nyata (register/login/session), menggantikan `nuanscape-auth`.
- CRUD untuk entitas: `Transaction`, `Budget`, `Goal`, `AssetItem`, `LiabilityItem`, `ContentItem`, `ContentIdea`, `LibraryAsset`, `PlatformAccount`, `Product`, `InventoryMovement`, `Order`, `MarketplaceConnection`, `AppNotification`, `Automation`, `AIInsight`.
- Preferensi Settings dan Automation yang persisten.
- Ringkasan lintas modul untuk Agent Monitor konsisten dengan data Seller, Content, Finance.
- Ekspor data workspace (JSON/CSV) yang saat ini dilakukan di sisi klien.

Di luar cakupan sampai ada keputusan baru: upload file fisik, integrasi marketplace live, AI generation yang menulis/mengeksekusi aksi, billing, email/push. Agent analisis read-only (PicoClaw sidecar) sudah disetujui dan dibatasi oleh aturan keras nomor 6.

## Struktur yang disepakati

```
backend/
  README.md        # cara jalan, env, dan ringkasan API
  ...
```

Stack, skema database, dan detail endpoint ditentukan di dalam `backend/` dan didokumentasikan di `backend/README.md`. Frontend tidak boleh dijadikan alasan untuk mengubah file di luar `backend/`.

## Alur kerja

1. Ambil tugas dari selisih antara `PRD.md` dan kebutuhan data frontend.
2. Implementasi hanya di `backend/`.
3. Uji end-to-end di sisi backend (unit/integration + curl).
4. Laporkan perubahan beserta bukti eksekusi. Jangan menyentuh atau merapikan frontend.

## Definition of Done (backend)

- Endpoint berjalan dan terverifikasi dengan request nyata (bukan asumsi).
- Kontrak request/response terdokumentasi di `backend/README.md`.
- Tidak ada file frontend yang berubah di diff.
- Migrasi/skema database dapat dijalankan ulang dari kondisi kosong.
- Build/lint backend lolos.
