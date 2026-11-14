import type { ContentIdea, ContentItem, Platform } from '@/types'
import { platformAccounts } from '@/data/mock'

export interface NicheMeta {
  id: string
  label: string
  tagline: string
  description: string
  accent: string
  platforms: Platform[]
  audience: string
  angles: string[]
  keywords: string[]
  trend: number
}

export const productionNiches: NicheMeta[] = [
  {
    id: 'agentic-ai',
    label: 'Agentic AI',
    tagline: 'AI agent & otomasi kerja',
    description: 'Use case agent AI, otomasi admin, dan alur kerja yang benar-benar dipakai tim kecil.',
    accent: '#24C7C4',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: 'Pemilik usaha dan operator yang ingin memangkas pekerjaan repetitif.',
    angles: ['Demo use case nyata', 'Breakdown biaya agent', 'Kesalahan setup', 'Before-after otomasi', 'Tools comparison', 'Studi kasus UMKM'],
    keywords: ['AI agent', 'otomasi', 'customer service', 'workflow', 'UMKM'],
    trend: 186,
  },
  {
    id: 'produktivitas',
    label: 'Produktivitas',
    tagline: 'Kerja fokus & workspace',
    description: 'Rutinitas, tools, dan sistem kerja yang membantu menyelesaikan pekerjaan lebih cepat.',
    accent: '#F5D64B',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: 'Pekerja remote, kreator, dan pelajar yang ingin fokus lebih lama.',
    angles: ['Rutinitas 2 jam jadi 20 menit', 'Tools yang benar-benar dipakai', 'Deep work tanpa distraksi', 'Template kerja gratis', 'Kesalahan manajemen waktu'],
    keywords: ['produktivitas', 'deep work', 'tools', 'rutinitas', 'fokus'],
    trend: 142,
  },
  {
    id: 'bisnis-umkm',
    label: 'Bisnis Online',
    tagline: 'UMKM & jualan online',
    description: 'Operasional toko online, stok, iklan, dan strategi konten yang berdampak ke omzet.',
    accent: '#F0512B',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: 'Seller marketplace dan pemilik brand lokal yang ingin tumbuh tanpa tim besar.',
    angles: ['Hitung untung jualan online', 'Kesalahan stok UMKM', 'Chat pelanggan otomatis', 'Strategi konten jualan', 'Before-after omzet', 'Cek biaya iklan'],
    keywords: ['UMKM', 'jualan online', 'TikTok Shop', 'stok', 'omzet'],
    trend: 168,
  },
  {
    id: 'lofi-study',
    label: 'Lofi & Study',
    tagline: 'Musik fokus & relaksasi',
    description: 'Mix panjang untuk belajar, coding, dan kerja malam dengan nuansa tenang.',
    accent: '#6DBBFF',
    platforms: ['YouTube'],
    audience: 'Pelajar, developer, dan pekerja yang butuh fokus tanpa distraksi.',
    angles: ['4 jam fokus tanpa iklan', 'Playlist kerja malam', 'Lofi untuk coding', 'Suara hujan + piano', 'Mix belajar akhir pekan'],
    keywords: ['lofi', 'study music', 'deep focus', 'chillhop', 'instrumental'],
    trend: 64,
  },
  {
    id: 'web-dev',
    label: 'Web Dev & Tools',
    tagline: 'Developer & AI tools',
    description: 'Alat bantu developer, alur kerja coding, dan cara membangun produk lebih cepat.',
    accent: '#F58FD9',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: 'Developer, indie hacker, dan tim produk kecil yang ingin ship lebih cepat.',
    angles: ['Tools AI untuk developer', 'Ship cepat dengan DX', 'Kesalahan struktur project', 'Demo build 7 hari', 'Perbandingan framework'],
    keywords: ['developer', 'AI tools', 'web dev', 'DX', 'coding'],
    trend: 132,
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    tagline: 'Behind the scenes & cerita',
    description: 'Cerita di balik bisnis, kegagalan, dan proses kreatif yang membuat audiens terhubung.',
    accent: '#C7A6FF',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: 'Audiens yang menyukai cerita nyata dan proses di balik layar.',
    angles: ['Dari freelance ke studio', 'Kegagalan yang bikin naik', 'Sehari di balik produksi', 'Keputusan bisnis yang berubah', 'Before-after perjalanan'],
    keywords: ['storytelling', 'behind the scenes', 'perjalanan', 'bisnis', 'kreator'],
    trend: 97,
  },
]

export function customNiche(label: string): NicheMeta {
  const clean = label.trim()
  const keyword = clean.toLowerCase()
  return {
    id: 'custom',
    label: clean,
    tagline: 'Niche custom',
    description: `Niche yang kamu tulis sendiri. Ide dan judul akan mengikuti konteks ${clean}.`,
    accent: '#24C7C4',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    audience: `Audiens yang tertarik dengan ${clean}.`,
    angles: ['Panduan pemula', 'Kesalahan umum', 'Studi kasus', 'Before-after', 'Tools pilihan', 'Checklist praktis'],
    keywords: [keyword, `${keyword} pemula`, `${keyword} 2026`, `tips ${keyword}`],
    trend: 0,
  }
}

const shortTitles: ((keyword: string, niche: string) => string)[] = [
  (keyword) => `3 cara ${keyword} bikin kerja 2x lebih cepat`,
  (keyword) => `Stop salah paham soal ${keyword} — ini yang benar`,
  (_keyword, niche) => `${niche}: before vs after dalam 30 detik`,
  (keyword) => `Checklist ${keyword} untuk pemula`,
  (keyword) => `Kenapa ${keyword} kamu belum jalan? Ini penyebabnya`,
  (keyword) => `POV: coba ${keyword} pertama kali`,
  (keyword) => `1 tool ${keyword} yang bikin hemat 10 jam`,
  (keyword) => `Jangan mulai ${keyword} sebelum tahu ini`,
]

const longTitles: ((keyword: string, niche: string) => string)[] = [
  (_keyword, niche) => `${niche}: panduan lengkap dari nol`,
  (keyword) => `Berapa biaya ${keyword} sebenarnya? Breakdown lengkap`,
  (keyword) => `Studi kasus ${keyword}: hasil setelah 30 hari`,
  (keyword) => `Kesalahan ${keyword} yang bikin rugi`,
  (keyword) => `Membangun ${keyword} yang benar-benar dipakai`,
  (keyword) => `${keyword} vs alternatif: mana yang cocok untukmu?`,
]

const shortHooks: ((keyword: string, niche: string) => string)[] = [
  (keyword) => `"Kamu masih manual untuk ${keyword}? Ini cara yang aku pakai."`,
  (keyword) => `"Stop scroll. Kalau kamu mau ${keyword} jalan, 3 detik ini penting."`,
  (_keyword, niche) => `"Semua orang bicara ${niche}, tapi ini bagian yang jarang dibahas."`,
  (keyword) => `"Ini checklist ${keyword} yang bikin kamu tidak mulai dari nol."`,
  (keyword) => `"${keyword} kamu belum jalan? Penyebabnya bukan tools."`,
  (keyword) => `"POV: pertama kali coba ${keyword} dan hasilnya di luar dugaan."`,
]

const longHooks: ((keyword: string, niche: string) => string)[] = [
  (keyword) => `"Semua bilang ${keyword} mudah. Setelah 30 hari, ini yang benar-benar terjadi."`,
  (keyword) => `"Aku hitung biaya ${keyword} dari nol. Angkanya tidak seperti yang dibayangkan."`,
  (keyword) => `"Studi kasus ini mengubah cara kami memakai ${keyword}."`,
  (keyword) => `"Kesalahan ${keyword} ini terlihat sepele, tapi biayanya besar."`,
  (keyword) => `"Kalau kamu mau ${keyword} yang benar-benar dipakai, mulai dari sini."`,
]

const longFormats = ['Deep-dive episode', 'Studi kasus', 'Tutorial bertahap', 'Documentary']
const shortFormats = ['Short-form tutorial', 'Reels', 'Carousel', 'POV', 'Before-after']

function scoreFor(niche: NicheMeta, platform: Platform, index: number) {
  const base = niche.label.length * 3 + platform.length * 5 + index * 11
  return 76 + (base % 21)
}

export function generateIdeas(
  niche: NicheMeta,
  platform: Platform,
  accountId?: string,
  count = 6,
): Omit<ContentIdea, 'id'>[] {
  const isLong = platform === 'YouTube'
  const titles = isLong ? longTitles : shortTitles
  const hooks = isLong ? longHooks : shortHooks
  const formats = isLong ? longFormats : shortFormats
  const resolvedAccountId = accountId ?? platformAccounts.find((account) => account.platform === platform)?.id

  return Array.from({ length: count }, (_, index) => {
    const angle = niche.angles[index % niche.angles.length]
    const keyword = niche.keywords[index % niche.keywords.length]
    return {
      title: titles[index % titles.length](keyword, niche.label),
      hook: hooks[index % hooks.length](keyword, niche.label),
      platform,
      accountId: resolvedAccountId,
      niche: niche.label,
      angle,
      format: formats[index % formats.length],
      score: scoreFor(niche, platform, index),
      approved: false,
    }
  })
}

function cleanTag(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function hashtagsFor(niche: NicheMeta, platform: Platform) {
  const base = niche.keywords.map(cleanTag).filter(Boolean)
  const platformTags = platform === 'YouTube' ? ['youtubetips', 'edukasi'] : ['fyp', 'creatorindonesia']
  return [...new Set([...base, ...platformTags])].slice(0, 6)
}

export function buildContent(niche: NicheMeta, idea: ContentIdea): {
  script: string
  caption: string
  hashtags: string[]
  scheduledAt: string
} {
  const keyword = niche.keywords[0]
  const tags = hashtagsFor(niche, idea.platform)
  const schedule = new Date(Date.now() + (2 + (idea.score % 4)) * 86400000)
  schedule.setHours(19, 0, 0, 0)
  const isLong = idea.platform === 'YouTube'
  const tagLine = tags.map((tag) => `#${tag}`).join(' ')

  const caption = isLong
    ? `${idea.title}\n\n${idea.hook}\n\nDi video ini: ${idea.angle.toLowerCase()}, contoh nyata, dan langkah yang bisa langsung kamu coba. Simpan untuk ditonton ulang.`
    : `${idea.title}\n\n${idea.hook}\n\nSimpan postingan ini dan coba langkah pertamanya hari ini. Follow untuk tips ${keyword} lainnya.`

  const script = isLong
    ? `# ${idea.title}

NICHE · ${niche.label}
PLATFORM · ${idea.platform}
FORMAT · ${idea.format}
SUDUT · ${idea.angle}
TARGET DURASI · 8–12 menit

## Hook (0:00–0:30)
${idea.hook}

## Konteks (0:30–1:30)
Jelaskan kenapa ${keyword} relevan untuk ${niche.audience.toLowerCase()}
Tunjukkan satu contoh nyata yang membuat penonton merasa "ini gue banget".
Sebutkan apa yang akan penonton dapat di akhir video.

## Bab 1 — Masalah (1:30–3:30)
- Kebiasaan atau asumsi yang bikin ${keyword} tidak jalan.
- Biaya waktu, uang, atau peluang yang hilang.
- Siapa yang paling terdampak dan kenapa.

## Bab 2 — Kerangka solusi (3:30–7:00)
1. Langkah pertama — alasan di baliknya + demo singkat.
2. Langkah kedua — implementasi, angka pendukung, dan batasan.
3. Langkah ketiga — cara mengukur apakah berhasil.
Gunakan contoh dari sudut "${idea.angle.toLowerCase()}" agar pembahasan tidak melebar.

## Bab 3 — Studi kasus (7:00–9:30)
Tampilkan kondisi sebelum-sesudah, keputusan yang diambil, dan pelajaran yang bisa dipakai ulang.
Sertakan sumber untuk setiap angka yang ditampilkan.

## CTA (9:30–10:00)
Ringkas 3 poin utama. Arahkan penonton ke video lanjutan atau checklist gratis.
CTA: "Simpan video ini dan coba langkah pertamanya minggu ini."

## Judul alternatif
- ${niche.label}: dari nol sampai benar-benar jalan
- ${keyword} yang dipakai setiap hari, bukan cuma teori
- 3 keputusan penting sebelum mulai ${keyword}

## Deskripsi
${idea.hook}

Di video ini kita bahas ${idea.angle.toLowerCase()} untuk ${niche.label.toLowerCase()}, lengkap dengan contoh dan langkah praktis.

Timestamps:
0:00 Hook
0:30 Konteks
1:30 Masalah
3:30 Kerangka solusi
7:00 Studi kasus
9:30 Penutup

## Thumbnail brief
- Wajah dengan ekspresi fokus atau terkejut.
- 3 kata besar: "${keyword.toUpperCase()} YANG BENAR".
- Angka hasil atau before-after sebagai aksen.
- Kontras tinggi, teks aman di area tengah.

## Catatan produksi
- Format: ${idea.format}
- Visual: screen recording, B-roll, dan chapter card per bab.
- Audio: VO utama + musik latar rendah.
- Semua klaim angka wajib disertai sumber.
- Naskah ini kerangka demo, bukan naskah final.

${tagLine}`

    : `# ${idea.title}

NICHE · ${niche.label}
PLATFORM · ${idea.platform}
FORMAT · ${idea.format}
SUDUT · ${idea.angle}
TARGET DURASI · 30–45 detik

## Hook (0–3 detik)
${idea.hook}
Tampilkan teks besar 3–5 kata di layar.

## Konteks (3–8 detik)
Situasi nyata yang relatable untuk ${niche.audience.toLowerCase()}
Visual cepat, cut tiap 1–2 detik.

## Beat 1 (8–20 detik)
Poin utama: ${idea.angle.toLowerCase()}.
Demo singkat atau tunjukkan contoh sebelum-sesudah.

## Beat 2 (20–35 detik)
Kesalahan umum atau langkah yang jarang dibahas.
Tambahkan teks overlay untuk penonton tanpa audio.

## CTA (35–45 detik)
Minta simpan atau komentar dengan kata kunci "${keyword}".
Arahkan ke konten lanjutan di bio.

## Caption
${caption}

## Hashtag
${tagLine}

## Catatan produksi
- Platform: ${idea.platform}
- Format: ${idea.format}
- Rasio 9:16, teks aman di area tengah.
- B-roll: screen recording vertikal dan close-up ekspresi.
- Uji 2–3 variasi hook sebelum batch final.
- Semua klaim angka wajib disertai sumber.
- Naskah ini kerangka demo, bukan naskah final.`

  return {
    script,
    caption,
    hashtags: tags,
    scheduledAt: schedule.toISOString(),
  }
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return slug || 'konten'
}

export function buildDraftPack(drafts: ContentItem[]) {
  const header = [
    '# Paket draft konten',
    `Dibuat: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`,
    `Total: ${drafts.length} draft`,
    '',
  ]

  const body = drafts.flatMap((draft, index) => [
    '---',
    '',
    `## ${index + 1}. ${draft.title}`,
    `Platform: ${draft.platform} · Niche: ${draft.niche} · Format: ${draft.format}`,
    `Jadwal: ${new Date(draft.scheduledAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`,
    '',
    draft.script ?? '(naskah belum tersedia)',
    '',
    '### Caption',
    draft.caption ?? '-',
    '',
    '### Hashtag',
    draft.hashtags?.length ? draft.hashtags.map((tag) => `#${tag}`).join(' ') : '-',
    '',
  ])

  return [...header, ...body].join('\n')
}
