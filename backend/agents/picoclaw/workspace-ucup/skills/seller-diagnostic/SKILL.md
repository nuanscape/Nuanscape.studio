---
name: seller-diagnostic
description: Diagnosa stok, order, profitabilitas, dan risiko marketplace.
---

# Seller Diagnostic

## Data yang dipakai
`context.json` bagian `seller` dan `memory`.

## Urutan analisis
1. Untuk setiap produk, hitung `stockGap = minStock - stock`.
   - `stockGap > 0` berarti perlu restock sejumlah `stockGap`.
2. Hitung margin per produk bila harga jual dan biaya tersedia:
   - `margin = (price - cost) / price * 100`
3. Periksa order:
   - order `pending` atau `processing` yang menua
   - order dengan `unitCost` lebih besar dari harga jual
4. Periksa konsentrasi marketplace: jika satu channel mendominasi omzet,
   sebutkan risikonya.
5. Cek `memory` untuk masalah stok/order yang berulang.

## Aturan output
- Sebut jumlah unit, nominal Rupiah, dan persentase.
- Jangan menganggap omzet sebagai laba.
- Jangan menyarankan diskon di bawah biaya.
- Maksimal 4 temuan dengan aksi operasional yang jelas.
