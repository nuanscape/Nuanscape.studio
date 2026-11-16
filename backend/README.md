# Nuanscape.studio — Backend

API backend untuk Nuanscape.studio. Frontend (`src/**`) tidak diubah oleh tim backend; kontrak mengikuti `PRD.md` dan `src/types/index.ts`.

Status: **M0 selesai** (fondasi) + **M1 Auth & Profil** selesai + **M2 Finance** selesai + **M3 Seller** selesai + **Content Production** (M4 awal) selesai + **Agent runtime PicoClaw** (adapter + konfigurasi provider KIE.ai/NVIDIA NIM) selesai + **konfigurasi API key provider terenkripsi** selesai. Lihat roadmap di bawah.

## Stack

| Komponen | Versi |
| --- | --- |
| Node.js | 22 LTS (>= 22.12) |
| Fastify | 5 |
| TypeScript | strict, NodeNext |
| Prisma / PostgreSQL | Prisma 6.19, Postgres 16 |
| Validasi & OpenAPI | Zod 4 + fastify-type-provider-zod |
| Test | Vitest + `app.inject` |
| Lint | oxlint |

## Struktur

```
backend/
  prisma/schema.prisma        # skema database + migrasi
  prisma/seed.ts              # seed owner demo (tanpa data dummy)
  src/app.ts                  # buildApp(): plugin, error handler, OpenAPI
  src/server.ts               # entrypoint HTTP + graceful shutdown
  src/config.ts               # validasi environment (Zod)
  src/lib/prisma.ts           # PrismaClient singleton
  src/lib/errors.ts           # AppError + helper error
  src/lib/auth.ts             # verifikasi JWT + cek sesi (auth guard)
  src/lib/password.ts         # hash/verifikasi password scrypt
  src/lib/owner.ts            # resolver owner (Bearer token / demo fallback dev)
  src/routes/health.ts        # /health, /ready
  src/routes/auth.ts          # /auth/*
  src/routes/content.ts       # /content/*
  src/routes/finance.ts       # /finance/*
  src/routes/seller.ts        # /seller/*
  src/services/content.ts     # query, mutasi, dan agregat content
  src/services/finance.ts     # transaksi, budget, goal, aset, laporan
  src/services/seller.ts      # produk, order, inventory, marketplace, profit
  src/agent/contracts.ts      # kontrak hasil agent (Zod)
  src/agent/parser.ts         # ekstraksi sentinel + validasi output
  src/agent/picoclaw.ts       # runtime sidecar PicoClaw (read-only)
  src/agent/deterministic.ts  # fallback tanpa LLM
  src/agent/factory.ts        # pemilih runtime dari environment
  agents/picoclaw/            # config, AGENT.md Muhe/Asep/Ucup/Bambang
  scripts/picoclaw-spike.sh   # gate multi-agent + subagent
  scripts/picoclaw-security.sh # generate .security.yml dari env (tidak di-commit)
  scripts/agent-smoke.ts      # smoke test adapter TypeScript
  tests/                      # test integrasi
  docker-compose.yml          # Postgres dev (+ api profile full)
  Dockerfile                  # image produksi
```

## Setup

Prasyarat: Node 22 dan Docker.

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d db
npx prisma migrate deploy     # atau `npm run db:migrate` saat mengembangkan skema
npm run db:seed               # buat owner demo + preferensi awal (opsional, idempoten)
npm run dev                   # http://localhost:8790
```

Cek:

```bash
curl -s http://localhost:8790/api/v1/health
curl -s http://localhost:8790/api/v1/ready
open http://localhost:8790/docs
```

## Environment

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `HOST` | `0.0.0.0` | bind address |
| `PORT` | `8790` | port HTTP |
| `DATABASE_URL` | Postgres lokal port 5434 | koneksi database |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | origin FE yang diizinkan, pisahkan dengan koma |
| `LOG_LEVEL` | `info` | level Pino |
| `SWAGGER_ENABLED` | `true` | matikan di produksi bila perlu |
| `DEMO_OWNER_EMAIL` | `demo@nuanscape.studio` | owner demo untuk seed dan login PIN admin |
| `DEMO_OWNER_PASSWORD` | `nuanscape-demo` | password owner demo (di-hash ulang setiap seed) |
| `DEMO_ADMIN_PIN` | `1234` | PIN admin demo (kompatibilitas FE), opsional |
| `JWT_SECRET` | secret dev bawaan | **wajib di production**, minimal 32 karakter |
| `JWT_ACCESS_TTL` | `900` | umur access token (detik) |
| `JWT_REFRESH_TTL` | `2592000` | umur refresh token (detik, 30 hari) |
| `AGENT_RUNTIME` | `picoclaw` | `picoclaw` (LLM KIE/NVIDIA) atau `deterministic` |
| `PICOCLAW_BIN` | `./agents/picoclaw/bin/picoclaw` | executable PicoClaw di dalam repo (lihat catatan engine di bawah) |
| `PICOCLAW_CONFIG` | `./agents/picoclaw/config.json` | config agent + model |
| `PICOCLAW_HOME` | `./agents/picoclaw/.runtime` | state runtime PicoClaw (di-ignore git) |
| `PICOCLAW_WORKDIR` | `./agents/picoclaw` | root workspace agent |
| `PICOCLAW_MODEL` | kosong | override model, mis. `kie-gemini` |
| `PICOCLAW_TIMEOUT_MS` | `240000` | batas waktu satu run |
| `KIE_API_KEY` | kosong | API key kie.ai untuk model agent dan riset/naskah konten |
| `NVIDIA_API_KEY` | kosong | API key NVIDIA NIM untuk fallback agent dan riset/naskah |
| `KIE_CONTENT_MODEL` | `gemini-3.1-pro` | model KIE untuk riset ide dan naskah |
| `NVIDIA_CONTENT_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` | model fallback NVIDIA NIM |
| `PROVIDER_ENCRYPTION_KEY` | kosong | **wajib** untuk menyimpan API key dari UI; base64 dari 32 byte (`openssl rand -base64 32`) |
| `PROVIDER_ENCRYPTION_KEY_VERSION` | `1` | versi master key, disimpan bersama ciphertext untuk rotasi |
| `MEDIA_RENDER_MAX_SECONDS` | `60` | batas durasi video non-musik hasil render (detik) |
| `MEDIA_MUSIC_MAX_SECONDS` | `7200` | batas durasi musik; thumbnail dianimasikan AI (image-to-video) lalu audio + video diulang sampai durasi ini |
| `FFMPEG_BIN` / `FFPROBE_BIN` | `ffmpeg` / `ffprobe` | path binary media |
| `MUSIC_PROVIDER` | `suno` | `suno` (musik via KIE) atau `procedural` (sintesis lokal untuk test/offline) |
| `SUNO_MODEL` | `V6_MINI` | model Suno di KIE; `SUNO_TIMEOUT_MS` default 300000 |
| `TTS_PROVIDER` | `heygen` | `heygen` (narasi) atau `edge` (fallback lokal) |
| `HEYGEN_API_KEY` | kosong | **wajib** untuk narasi HeyGen; voice otomatis `HEYGEN_LANGUAGE` atau set `HEYGEN_VOICE_ID` (default `.env.example`: Breezy Bagus, Indonesia) |
| `HEYGEN_MODEL` | `heygen-voice-1-turbo-free` | model TTS HeyGen |
| `HEYGEN_LANGUAGE` / `HEYGEN_GENDER` | `id` / kosong | filter pemilihan voice publik |
| `HEYGEN_TIMEOUT_MS` | `180000` | batas waktu satu request TTS |
| `IMAGE_PROVIDER` | `gpt-image-2` | `gpt-image-2` (gambar latar via KIE) atau `none` (poster SVG saja) |
| `GPT_IMAGE_MODEL` | `gpt-image-2-text-to-image` | model image KIE; `IMAGE_TIMEOUT_MS` default 240000 |
| `IMAGE_POLL_INTERVAL_MS` | `3000` | interval polling hasil GPT Image 2 |
| `AI_VIDEO_PROVIDER` | `kie` | `kie` (animasi image-to-video via KIE, wajib untuk konten musik; tanpa fallback loop lokal). Hanya dipakai untuk konten musik dengan `IMAGE_PROVIDER=gpt-image-2`. |
| `KIE_VIDEO_MODEL` | `grok-imagine-video-1-5-preview` | model image-to-video KIE; 6 detik 720p ≈ 27 kredit |
| `KIE_VIDEO_DURATION` / `KIE_VIDEO_RESOLUTION` | `6` / `720p` | durasi klip AI (1–15 detik) dan resolusi output |
| `KIE_VIDEO_TIMEOUT_MS` / `KIE_VIDEO_POLL_INTERVAL_MS` | `600000` / `5000` | batas tunggu dan interval polling task animasi |
| `EDGE_TTS_BIN` / `EDGE_TTS_VOICE` | `edge-tts` / `id-ID-ArdiNeural` | fallback TTS lokal bila `TTS_PROVIDER=edge` |
| `YOUTUBE_API_KEY` | kosong | API key YouTube Data API v3 untuk sinkronisasi statistik channel dan riset tren/kompetitor; tanpa key, riset memakai access token channel OAuth yang terhubung |
| `YOUTUBE_RESEARCH_ENABLED` | `true` | aktifkan injeksi `content.youtubeResearch` ke snapshot agen |
| `YOUTUBE_RESEARCH_QUERY` | kosong | query riset; kosong = turunkan dari niche akun YouTube |
| `YOUTUBE_RESEARCH_DAYS` / `YOUTUBE_RESEARCH_MAX_RESULTS` | `90` / `25` | jendela waktu dan jumlah video sampel |
| `YOUTUBE_RESEARCH_CACHE_MS` | `3600000` | cache hasil riset (1 jam) untuk menghemat kuota |
| `YOUTUBE_REGION_CODE` / `YOUTUBE_RELEVANCE_LANGUAGE` | `ID` / `id` | lokalisasi pencarian YouTube |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | kosong | OAuth 2.0 Google untuk login/registrasi + menghubungkan channel & watch time analytics |
| `GOOGLE_OAUTH_REDIRECT_URL` | kosong | Callback OAuth bersama login dan YouTube, default `http://localhost:8790/api/v1/content/youtube/oauth/callback` |
| `FRONTEND_URL` | kosong | Redirect setelah OAuth, default origin CORS pertama |

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | server dengan watch (tsx) |
| `npm run build` | kompilasi TypeScript ke `dist/` |
| `npm start` | jalankan hasil build |
| `npm run typecheck` | `tsc --noEmit` untuk src dan tests |
| `npm run lint` | oxlint |
| `npm test` | Vitest |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:seed` | seed owner demo + preferensi awal (tanpa data dummy) |
| `npm run db:studio` | Prisma Studio |
| `npm run agent:spike` | gate PicoClaw: 4 agent terdaftar, findings >= 3 |
| `npm run agent:smoke` | jalankan adapter PicoClaw dengan snapshot contoh |
| `npm run agent:security` | tulis `agents/picoclaw/.security.yml` dari `KIE_API_KEY` + `NVIDIA_API_KEY` |
| `npm run agent:providers` | cek saldo/kredensial KIE dan NVIDIA NIM |

## Endpoint M0

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/ready` | readiness + cek database |
| GET | `/docs` | Swagger UI |
| GET | `/docs/json` | OpenAPI 3.1 JSON |

Format error standar:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Rute GET /api/v1/x tidak ditemukan."
  }
}
```

`VALIDATION_ERROR` menambahkan `details` berisi daftar masalah validasi.

## Endpoint Auth

Semua endpoint memakai prefix `/api/v1`. Endpoint bertanda Bearer memerlukan header `Authorization: Bearer <accessToken>`. Access token berumur 15 menit; refresh token dirotasi setiap kali dipakai dan disimpan sebagai hash SHA-256.

| Method | Path | Auth | Keterangan |
| --- | --- | --- | --- |
| POST | `/auth/register` | - | daftar akun, langsung membuat sesi |
| POST | `/auth/login` | - | email + password |
| GET | `/auth/google/url` | - | URL consent Google untuk login/registrasi (`next`) |
| POST | `/auth/google/exchange` | - | tukar tiket callback Google menjadi sesi |
| POST | `/auth/refresh` | - | tukar refresh token (rotasi) |
| POST | `/auth/logout` | Bearer | cabut sesi saat ini |
| GET | `/auth/me` | Bearer | profil + preferensi |
| PATCH | `/auth/me` | Bearer | ubah nama/email/role/timezone |
| POST | `/auth/change-password` | Bearer | ganti password + cabut sesi lain |
| GET | `/auth/preferences` | Bearer | preferensi workspace/notifikasi/AI |
| PATCH | `/auth/preferences` | Bearer | ubah preferensi (nested) |
| GET | `/auth/sessions` | Bearer | daftar sesi aktif |
| DELETE | `/auth/sessions/:id` | Bearer | cabut sesi lain |
| POST | `/auth/admin` | PIN | login cepat admin demo |

Contoh:

```bash
curl -s -X POST http://localhost:8790/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@nuanscape.studio","password":"nuanscape-demo"}'
```

Password disimpan dengan `scrypt` (N=16384, r=8, p=1) dan salt acak. Respons login: `{ user, accessToken, refreshToken, tokenType, expiresIn, refreshExpiresIn }`. Error khas: `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `INVALID_REFRESH_TOKEN`, `INVALID_ADMIN_PIN`.

## Endpoint Provider LLM

API key provider disimpan per owner dalam bentuk ciphertext AES-256-GCM (`ai_provider_configs`). Plaintext hanya ada di memori server saat key dipakai untuk request LLM; GET tidak pernah mengembalikan key penuh.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/providers` | daftar KIE.ai + NVIDIA NIM, status key, `keyHint` tersamar, hasil tes terakhir, serta katalog `models` dengan penanda `active`/`default`/`recommended` |
| POST | `/providers` | simpan/rotasi key + base URL + model; tanpa `apiKey` mempertahankan ciphertext lama |
| POST | `/providers/:provider/test` | uji koneksi memakai key tersimpan (atau `apiKey` sementara), catat hasil |
| DELETE | `/providers/:provider` | hapus konfigurasi dan ciphertext; fallback ke env server bila ada |

Contoh:

```bash
curl -s -X POST http://localhost:8790/api/v1/providers \
  -H 'authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  -d '{"provider":"nvidia","model":"nvidia/nemotron-3.5-lightning-30b-a3b","apiKey":"..."}'
```

Key dari UI diprioritaskan di atas `KIE_API_KEY`/`NVIDIA_API_KEY`; env tetap menjadi fallback. `GET /providers` mengembalikan `keySource: database | environment | none` dan `maskedKey`, bukan plaintext. Key KIE dari UI juga dipakai untuk Suno, GPT Image 2, dan tes provider di Monitor, bukan hanya model teks.

## Endpoint Content

Semua endpoint content memakai prefix `/api/v1`. Kirim `Authorization: Bearer <accessToken>` agar data terisolasi per user. Di luar production, fallback `x-owner-id` dan user demo tetap tersedia untuk test; di production keduanya ditolak.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/content/overview` | ringkasan pipeline long/short + totals |
| GET | `/content/accounts?format=` | daftar akun konten |
| GET | `/content/youtube/research?q=&days=&maxResults=&refresh=` | riset tren/kompetitor YouTube (search, statistik video, subscriber channel, pola judul/tag/durasi) |
| GET | `/content/accounts/:id` | detail akun + stats + items + ideas |
| GET | `/content/items?format=&accountId=&status=&platform=&from=&to=&q=&hasScript=` | daftar konten |
| POST | `/content/items` | buat konten |
| GET | `/content/items/:id` | detail konten |
| PATCH | `/content/items/:id` | ubah status/script/jadwal/caption/dll. |
| DELETE | `/content/items/:id` | hapus konten |
| GET | `/content/ideas?format=&accountId=&platform=&approved=&q=` | daftar ide |
| POST | `/content/ideas` | tambah ide |
| PATCH | `/content/ideas/:id` | approve/unapprove ide |
| POST | `/content/ideas/:id/approve` | setujui ide |
| POST | `/content/ideas/:id/promote` | jadikan ide sebagai konten |
| POST | `/content/ideas/research` | riset YouTube live (opsional) lalu 3 rekomendasi AI berisi judul, thumbnail, angle, dan acuan video; disimpan sebagai draft |
| POST | `/content/ideas/:id/script` | buat naskah + scene dari ide via AI |
| POST | `/content/generate-production` | render poster PNG + video MP4 nyata. `designTheme`: `cinematic`/`pixel`/`anime`/`clay`/`3d` untuk prompt gambar + animasi. `musicTrackCount` (1-5, default 5): Suno membuat beberapa lagu dengan genre/tipe sama, aransemen berbeda, lalu digabung menjadi playlist dan di-loop sesuai durasi. Musik: thumbnail GPT Image 2 murni tanpa overlay, animasi AI image-to-video (KIE wajib, tanpa fallback loop lokal); lokal hanya mengulang klip AI dan menggabungkan audio, lalu dipotong sesuai durasi `audioLength` (maks `MEDIA_MUSIC_MAX_SECONDS`). Non-musik: scene + narasi HeyGen. Simpan konten + aset, -10 energy |
| GET | `/media/:file` | sajikan file media hasil render (`mp4`/`png`, mendukung Range) |
| GET | `/content/library?format=&accountId=&type=&contentId=&q=` | daftar aset |
| POST | `/content/library` | tambah metadata aset |
| GET | `/content/analytics?format=&accountId=` | ringkasan, seri 7 hari, kontribusi akun, best time |
| GET | `/content/calendar?format=&month=YYYY-MM&accountId=` | kalender per hari dalam bulan |

Format `long` = YouTube; `short` = TikTok + Instagram. Nominal views integer, engagement float (persen).

## Endpoint Finance

Semua endpoint finance memakai prefix `/api/v1` dan Bearer token (fallback demo hanya non-production). Nominal uang integer Rupiah.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/finance/overview?range=7d\|30d\|3m\|6m\|1y` | ringkasan, health score, budget, distribusi, insight, seri |
| GET | `/finance/transactions?type=&category=&account=&q=&from=&to=&limit=&offset=` | daftar transaksi + total terfilter |
| POST | `/finance/transactions` | catat transaksi |
| DELETE | `/finance/transactions/:id` | hapus transaksi |
| GET | `/finance/income` | total, rata-rata, recurring, per kategori, seri bulanan |
| GET | `/finance/expenses` | total, rata-rata, top kategori, transaksi tidak biasa |
| GET | `/finance/budgets` | budget bulan berjalan + terpakai dari transaksi |
| POST | `/finance/budgets` | buat budget (kategori unik) |
| PATCH | `/finance/budgets/:id` | ubah kategori/limit |
| DELETE | `/finance/budgets/:id` | hapus budget |
| GET | `/finance/goals` | goal + progress, sisa, kebutuhan bulanan |
| POST | `/finance/goals` | buat goal |
| POST | `/finance/goals/:id/contribute` | tambah dana, dibatasi target (`capped: true`) |
| GET | `/finance/assets` | aset, liabilitas, net worth, likuiditas, alokasi |
| POST | `/finance/assets` | tambah aset |
| DELETE | `/finance/assets/:id` | hapus aset |
| POST | `/finance/liabilities` | tambah liabilitas |
| DELETE | `/finance/liabilities/:id` | hapus liabilitas |
| GET | `/finance/reports?period=3m\|6m\|12m` | laporan bulanan, margin, runway, kategori |
| GET | `/finance/reports/export?period=3m\|6m\|12m` | ekspor CSV |

Budget terpakai dihitung dari transaksi pengeluaran pada bulan berjalan (zona Asia/Jakarta), bukan angka statis. Goal yang dikontribusikan melebihi sisa target akan dibatasi dan mengembalikan `applied` + `capped`; kontribusi setelah target tercapai ditolak `GOAL_COMPLETED`. Laporan memakai transaksi aktual untuk bulan yang punya transaksi dan snapshot historis untuk bulan kosong.

## Endpoint Seller

Semua endpoint seller memakai prefix `/api/v1` dan Bearer token (fallback demo hanya non-production). Nominal uang integer Rupiah; enum mengikuti `src/types/index.ts` (`TikTok Shop`, `Shopee`, `Both`, `Out of Stock`, dst.).

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/seller/overview` | metrik 30D, waterfall, seri 7 hari, marketplace, order terbaru, stok kritis, insight |
| GET | `/seller/products?q=&status=&category=&marketplace=&stock=low\|out\|active` | daftar produk + ringkasan inventory |
| POST | `/seller/products` | tambah produk; stok awal dicatat sebagai pergerakan `in` |
| GET | `/seller/products/:id` | detail produk |
| PATCH | `/seller/products/:id` | ubah produk/harga/HPP/stok (selisih stok dicatat) |
| DELETE | `/seller/products/:id` | hapus produk; order lama tetap menyimpan nama produk |
| GET | `/seller/inventory?movementLimit=` | nilai/unit stok, stok rendah/habis, pergerakan terbaru |
| POST | `/seller/inventory/:id/restock` | restock atomik + pergerakan `in`, produk habis kembali `Active` |
| GET | `/seller/orders?status=&marketplace=&q=&limit=&offset=` | daftar pesanan + ringkasan status/revenue |
| POST | `/seller/orders` | catat order; stok dipotong atomik, order masuk delta metrik |
| GET | `/seller/orders/export?status=&marketplace=&q=` | ekspor CSV |
| GET | `/seller/orders/:id` | detail pesanan |
| PATCH | `/seller/orders/:id/status` | ubah status; batal/retur mengembalikan stok, `Completed` menambah `sold` |
| GET | `/seller/marketplaces` | koneksi, izin, performa, revenue share |
| POST | `/seller/marketplaces/sync` | sinkronkan semua koneksi (simulasi) |
| POST | `/seller/marketplaces/:id/sync` | sinkronkan satu koneksi, perbarui `lastSync` |
| GET | `/seller/finance` | net sales/profit, fee, waterfall, revenue 7 hari, profit per produk |
| PATCH | `/seller/finance/fees` | ubah fee marketplace/afiliasi/shipping/ads/opex, metrik dihitung ulang |
| GET | `/seller/seo` | skor rata-rata, prioritas perbaikan, checklist per produk |
| GET | `/seller/intelligence` | kontribusi profit, sinyal, matriks produk, stok berisiko |

Baseline 30 hari (revenue, COGS, diskon, refund, jumlah order, split marketplace) disimpan di `seller_settings` agar angka demo sama dengan FE. Order yang dibuat lewat API (`included_in_baseline = false`) ditambahkan sebagai delta aktif; order berstatus `Cancelled`/`Returned` tidak dihitung. Restock, pemotongan stok, dan perubahan status memakai transaksi database agar stok tidak negatif saat request bersamaan.

## Agent Runtime (PicoClaw)

Default `AGENT_RUNTIME=picoclaw`; setiap briefing memakai LLM nyata. PicoClaw adalah sidecar analisis **read-only**: ia hanya membaca `context.json` dan menghasilkan temuan, sedangkan backend tetap memegang auth, approval, audit, dan semua aksi tulis.

- Identitas agent: Muhe (head/orchestrator), Asep (Finance), Ucup (Seller), Bambang (Content) di `agents/picoclaw/workspace*/AGENT.md`, dengan persona di `SOUL.md`, profil pengguna di `USER.md`, dan prosedur domain di `skills/*/SKILL.md`.
- Snapshot membawa `finance.trend`/`topCategories`, `seller.salesTrend`/`productPerformance`, `content.trend`/`platformPerformance`/`recentContent`, dan `dataQuality` agar agent bisa membandingkan baseline, menghitung dampak, dan menyebut keterbatasan data. Finding baru diminta menyertakan `evidence`, `priority`, `confidence`, dan `steps`; field ini opsional saat parsing agar output lama tetap kompatibel.
- Tool PicoClaw yang aktif hanya `read_file`, `list_dir`, dan `delegate` (delegasi sinkron); `spawn`, `exec`, `write_file`, `edit_file`, `web`, `mcp`, dan `cron` dimatikan.
- Memory lintas-run diambil dari `context.json` bagian `memory` (notifikasi terakhir + briefing terakhir), bukan `MEMORY.md` bersama, agar tidak bocor antar-owner.
- Setiap run memakai session PicoClaw terisolasi `agent:muhe:nuanscape:<runId>`; snapshot ditulis ke workspace lalu dihapus setelah run.
- Output wajib dibungkus `<<<NUANSCAPE_JSON>>>` ... `<<<END_NUANSCAPE_JSON>>>`, lalu divalidasi Zod.
- Provider model: **kie.ai** sebagai primary (`kie-gemini` → `gemini-3.1-pro`) dan **NVIDIA NIM** sebagai fallback lintas provider (`nvidia-llama` → `nvidia/nvidia/nemotron-3.5-lightning-30b-a3b`; prefix `nvidia/` pertama di-strip PicoClaw). Model `gpt-5-2` tidak dipakai sebagai default karena tidak memanggil tool pada endpoint KIE. Konfigurasi ada di `agents/picoclaw/config.json`.
- Isi `KIE_API_KEY` dan `NVIDIA_API_KEY` di environment/`.env`, lalu buat file kredensial yang di-ignore:
  ```bash
  export KIE_API_KEY="..."
  export NVIDIA_API_KEY="..."
  npm run agent:security
  ```
  File `agents/picoclaw/.security.yml` **tidak boleh di-commit** (sudah di-ignore). Jangan menaruh key langsung di `config.json`.
- Engine PicoClaw disalin ke `agents/picoclaw/bin/picoclaw` (x86_64, statically linked, ~78 MB, lisensi MIT di `agents/picoclaw/LICENSE`) agar runtime tidak bergantung pada instalasi di luar repo. Binary ini di-ignore git karena ukurannya; pada mesin/deploy baru, salin binary PicoClaw yang kompatibel ke path tersebut atau set `PICOCLAW_BIN` ke executable lain.
- Gate: `npm run agent:spike` harus menghasilkan `SPIKE OK: registered=4 ...`. Smoke adapter: `npm run agent:smoke`. Keduanya memakai engine lokal di `agents/picoclaw/bin/picoclaw`; `PICOCLAW_BIN` hanya perlu diisi bila memakai binary lain.
- Diagnosa kredensial: `npm run agent:providers` mencetak status KIE dan NVIDIA NIM tanpa menampilkan key.
- **Status verifikasi live (2026-11-14):** KIE aktif (`KIE: OK`), smoke agent dan spike lulus. NVIDIA NIM aktif dengan model `nvidia/nemotron-3.5-lightning-30b-a3b` (model lama `meta/llama-3.3-70b-instruct` EOL 26 Agustus 2026); tes koneksi tersimpan berhasil ~1,2 detik. Konfigurasi key dari UI disimpan terenkripsi AES-256-GCM di `ai_provider_configs`; env tetap fallback.

PicoClaw tidak dipakai sebagai backend multi-tenant atau pemberi aksi tulis. Untuk multi-user, satu worker/workspace per tenant atau runtime lain diperlukan.

## Database

- PostgreSQL 16 via `docker compose up -d db`, host port `5434`.
- Migrasi awal: `prisma/migrations/*_init` membuat tabel `users` sebagai fondasi M1.
- Migrasi auth: `auth_sessions` (refresh token hash, expiry, revoke) dan `user_preferences` (workspace, notifikasi, AI); `users.last_login_at` ditambahkan.
- Migrasi content: `platform_accounts`, `content_items`, `content_ideas`, `library_assets` (enum `Platform`, `ContentFormat`, `AccountStatus`, `ContentAssetType`).
- Migrasi finance: `finance_transactions`, `finance_budgets`, `finance_goals`, `finance_assets`, `finance_liabilities`, `finance_monthly_snapshots`.
- Migrasi seller: `seller_products`, `seller_inventory_movements`, `seller_orders`, `seller_marketplace_connections`, `seller_settings`, `seller_daily_snapshots` (enum `MarketplaceName`, `ProductMarketplace`, `ProductStatus`, `OrderStatus`, `StockMovementType`, `ConnectionStatus`).
- `npm run db:seed` hanya memastikan owner demo, preferensi, energy, dan pengaturan seller ada; tidak lagi mengisi akun/konten/transaksi/produk dummy. Semua data bisnis berasal dari input user atau sinkronisasi YouTube.
- Migrasi provider: `ai_provider_configs` menyimpan ciphertext AES-256-GCM + IV/tag per owner/provider; `head_agent_configs.fallbackModel` memakai `nvidia/nemotron-3.5-lightning-30b-a3b`.
- Skema akan diperluas per milestone; selalu buat migrasi baru, jangan mengubah migrasi yang sudah ada.

## Docker (profil penuh)

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
docker compose --profile full up -d --build
```

API berjalan di `http://localhost:8790`, database internal `db:5432`. Profil `full` memakai `NODE_ENV=production`, sehingga `JWT_SECRET` wajib diisi (minimal 32 karakter).

## CI

`.github/workflows/backend.yml` menjalankan lint, typecheck, build, migrasi, dan test terhadap Postgres service. Workflow hanya terpicu untuk perubahan di `backend/**` atau file workflow itu sendiri.

## Catatan keamanan

- Password memakai `scrypt` + salt acak; refresh token hanya disimpan sebagai hash SHA-256 dan dirotasi setiap refresh.
- `JWT_SECRET` wajib diisi minimal 32 karakter saat `NODE_ENV=production`; server menolak start bila kosong.
- API key provider LLM tidak pernah disimpan plaintext: `PROVIDER_ENCRYPTION_KEY` (base64 32 byte) dipakai untuk AES-256-GCM dengan AAD `ownerId + provider + keyVersion`. Rotasi key memakai `PROVIDER_ENCRYPTION_KEY_VERSION`; jangan mengganti master key tanpa re-enkripsi data lama.
- Rate limit login/register belum aktif (direncanakan M6).
- Agent PicoClaw hanya mendapat tool baca (`read_file`, `list_dir`) dan `spawn`; tidak ada `exec`/tulis file. `.security.yml` berisi API key dan di-ignore git. Jangan aktifkan agent untuk multi-tenant tanpa isolasi workspace per tenant.
- `npm audit` melaporkan advisory `deepmerge-ts` pada CLI Prisma (dev dependency). Tidak ikut runtime produksi (`npm ci --omit=dev`). Akan hilang saat upgrade Prisma mayor.

## Roadmap

| Milestone | Isi | Status |
| --- | --- | --- |
| M0 | Fondasi, health/ready, error format, OpenAPI, CI | Selesai |
| M1 | Auth & profil (users, sessions, preferences) | Selesai (API + test) |
| M2 | Finance | Selesai (API + seed + test) |
| M3 | Seller | Selesai (API + seed + test) |
| M4 | Content | Selesai (API + seed + test) |
| Agent runtime | PicoClaw sidecar read-only + spike gate | Selesai (spike + adapter + test) |
| M5 | Monitor, automations, notifications, export, seed | Belum |
| M6 | Hardening, rate limit, dokumentasi, image produksi | Belum |
