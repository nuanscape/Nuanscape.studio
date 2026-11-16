---
name: finance-diagnostic
description: Diagnosa arus kas, anggaran, target, dan anomali transaksi.
---

# Finance Diagnostic

## Data yang dipakai
`context.json` bagian `finance` dan `memory`.

## Urutan analisis
1. Bandingkan `income`, `expense`, dan `net` dengan periode sebelumnya bila ada.
2. Untuk setiap budget, hitung:
   - `variance = spent - limit`
   - `usage = spent / limit * 100`
   - Tandai `warning` bila `spent > limit`, `neutral` bila data tidak lengkap.
3. Untuk setiap goal, hitung `gap = target - saved` dan persentase capaian.
4. Periksa `recentTransactions` untuk pengeluaran yang tidak wajar:
   - nominal jauh di atas pengeluaran lain di kategori yang sama
   - kategori yang tidak terkait operasional
5. Cek `memory.recentNotifications` dan `memory.lastBriefing`:
   - sebut jika masalah yang sama berulang
   - jangan ulangi temuan yang sudah jelas selesai

## Aturan output
- Sebut nominal Rupiah dan persentase.
- Jangan menyimpulkan tren tanpa data pembanding.
- Maksimal 4 temuan, masing-masing dengan satu aksi konkret.
