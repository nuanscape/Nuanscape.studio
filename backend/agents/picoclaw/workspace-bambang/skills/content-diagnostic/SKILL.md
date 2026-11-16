---
name: content-diagnostic
description: Diagnosa pipeline, performa konten, dan kapasitas produksi.
---

# Content Diagnostic

## Data yang dipakai
`context.json` bagian `content` dan `memory`.

## Urutan analisis
1. Hitung distribusi status: `published`, `scheduled`, `draft`.
2. Untuk konten published, bandingkan `views` dan `engagement` aktual:
   - konten teratas = views tertinggi
   - engagement di bawah rata-rata = perlu perbaikan hook/CTA
   - jika semua metrik nol, sebutkan bahwa data performa belum tersedia
3. Periksa `pipeline`:
   - item yang melewati jadwal
   - tahap yang menumpuk
4. Periksa `ideas` yang belum dieksekusi; jangan menyarankan ide baru jika
   kapasitas produksi sudah penuh.
5. Cek `memory` untuk masalah konten yang berulang.

## Aturan output
- Jangan memakai angka contoh atau asumsi engagement.
- Bedakan masalah distribusi dan masalah produksi.
- Maksimal 4 temuan dengan aksi yang bisa dijalankan minggu ini.
