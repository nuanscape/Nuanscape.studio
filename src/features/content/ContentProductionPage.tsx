import * as React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SectionHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useContentStore } from '@/stores/content-store'
import { api, type YouTubeResearchResult } from '@/lib/api-client'
import { useToastStore } from '@/stores/app-store'
import { AccountPicker } from '@/features/content/components/account-picker'
import { cn, downloadText, formatNumber, formatPercent, uid } from '@/lib/utils'
import type { Platform } from '@/types'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Film,
  Gauge,
  Image as ImageIcon,
  Lightbulb,
  List,
  Mic2,
  Music,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  Wand2,
  type LucideIcon,
} from 'lucide-react'

type StepKey = 'type' | 'account' | 'research' | 'brief' | 'script' | 'scenes' | 'production' | 'generate' | 'result'
type ContentType = 'music' | 'storytelling' | 'konspirasi'
type ClaimType = 'Fakta' | 'Dugaan' | 'Spekulasi'

interface IdeaOption {
  id: string
  title: string
  hook: string
  angle: string
  thumbnail?: string
  reference?: string
  score: number
}

interface StyleOption {
  id: string
  label: string
  desc: string
  accent?: string
}

interface StepDef {
  key: StepKey
  label: string
}

interface SceneDraft {
  id: string
  title: string
  narration: string
  visual: string
  animation: string
  duration: number
  claimType?: ClaimType
  source?: string
}

interface NicheConfig {
  id: ContentType
  label: string
  desc: string
  icon: LucideIcon
  needsScript: boolean
  pageDescription: string
  flowSummary: string
  stepLabel: string
  stepHint: string
  scriptTitle: string
  scriptHint: string
  sceneTitle: string
  sceneHint: string
  steps: StepDef[]
  thumbnailStyles: StyleOption[]
  animationStyles: StyleOption[]
  musicStyles: StyleOption[]
  checklist: string[]
  phases: string[]
}

const types: { id: ContentType; label: string; desc: string; icon: LucideIcon }[] = [
  { id: 'music', label: 'Music', desc: 'Konten musik, lofi, mix, atau lagu', icon: Music },
  { id: 'storytelling', label: 'Story Telling', desc: 'Cerita naratif dan storytelling visual', icon: BookOpen },
  { id: 'konspirasi', label: 'Konspirasi', desc: 'Bahasan misteri dan teori konspirasi', icon: Search },
]

const designThemes: StyleOption[] = [
  { id: 'cinematic', label: 'Cinematic', desc: 'Film still sinematik, cahaya dramatis, detail tajam.', accent: '#93C5FD' },
  { id: 'pixel', label: 'Pixel art', desc: '16-bit retro, tepi pixel tajam, palet terbatas.', accent: '#A3E635' },
  { id: 'anime', label: 'Anime', desc: 'Cel-shaded, garis bersih, warna vivid.', accent: '#F472B6' },
  { id: 'clay', label: 'Clay', desc: 'Claymation, tekstur tanah liat, stop-motion.', accent: '#FDBA74' },
  { id: '3d', label: '3D render', desc: 'CGI bersih, global illumination lembut.', accent: '#C4B5FD' },
]

const scriptSteps: StepDef[] = [
  { key: 'account', label: 'Pilih akun' },
  { key: 'type', label: 'Pilih tipe' },
  { key: 'research', label: 'Riset ide' },
  { key: 'script', label: 'Script cerita' },
  { key: 'scenes', label: 'Scene & animasi' },
  { key: 'production', label: 'Visual & audio' },
  { key: 'generate', label: 'Generate' },
  { key: 'result', label: 'Hasil' },
]

const overviewSteps: StepDef[] = [
  { key: 'account', label: 'Pilih akun' },
  { key: 'type', label: 'Pilih tipe' },
  { key: 'research', label: 'Riset' },
  { key: 'script', label: 'Script / brief' },
  { key: 'scenes', label: 'Scene / evidence' },
  { key: 'production', label: 'Visual & audio' },
  { key: 'generate', label: 'Generate' },
  { key: 'result', label: 'Hasil' },
]

const nicheConfigs: Record<ContentType, NicheConfig> = {
  music: {
    id: 'music',
    label: 'Music',
    desc: 'Konten musik, lofi, mix, atau lagu',
    icon: Music,
    needsScript: false,
    pageDescription: 'Riset audio, atur brief, pilih visual dan mood, lalu render tanpa script cerita.',
    flowSummary: 'Pilih akun - pilih tipe - riset audio - brief audio - visual & audio - generate thumbnail + loop',
    stepLabel: 'Sound & visual',
    stepHint: 'Tentukan artwork, durasi loop, dan mood audio sebelum render.',
    scriptTitle: 'Brief audio',
    scriptHint: 'Tidak perlu script cerita. Cukup tentukan arah audio dan visual.',
    sceneTitle: '',
    sceneHint: '',
    steps: [
      { key: 'account', label: 'Pilih akun' },
      { key: 'type', label: 'Pilih tipe' },
      { key: 'research', label: 'Riset audio' },
      { key: 'brief', label: 'Brief audio' },
      { key: 'production', label: 'Visual & audio' },
      { key: 'generate', label: 'Generate' },
      { key: 'result', label: 'Hasil' },
    ],
    thumbnailStyles: [
      { id: 'vinyl', label: 'Vinyl mood', desc: 'Artwork hangat dengan tekstur piringan hitam.', accent: '#F5D64B' },
      { id: 'analog', label: 'Analog grain', desc: 'Nuansa kaset dan grain lembut untuk lofi.', accent: '#E8A87C' },
      { id: 'neon', label: 'Neon equalizer', desc: 'Visual tegas dengan aksen equalizer neon.', accent: '#5EEAD4' },
    ],
    animationStyles: [
      { id: 'slow-zoom', label: 'Slow zoom', desc: 'Zoom sinusoid mulus untuk sesi fokus panjang.' },
      { id: 'loop-motion', label: 'Loop motion', desc: 'Pan dan zoom lembut yang kembali ke frame awal.' },
    ],
    musicStyles: [
      { id: 'lofi', label: 'Lofi beats', desc: 'Beat santai, cocok untuk kerja dan belajar.' },
      { id: 'ambient', label: 'Ambient', desc: 'Pad luas tanpa distraksi untuk relaksasi.' },
      { id: 'jazzhop', label: 'Jazzhop', desc: 'Sample jazz ringan dengan groove lembut.' },
    ],
    checklist: [
      'Durasi audio sesuai platform (long-form 1-2 jam, short 30-60 detik).',
      'Thumbnail murni tanpa teks atau overlay agar loop tetap bersih.',
      'Animasi AI dibuat near-static sesuai tema desain, lalu video di-loop lokal tanpa menambah animasi.',
    ],
    phases: [
      'Menyusun beat',
      'Generate gambar',
      'Generate animasi AI',
      'Mixing audio',
      'Loop audio + video',
    ],
  },
  storytelling: {
    id: 'storytelling',
    label: 'Story Telling',
    desc: 'Cerita naratif dan storytelling visual',
    icon: BookOpen,
    needsScript: true,
    pageDescription: 'Riset ide, tulis script cerita, atur animasi per scene, lalu render narasi.',
    flowSummary: 'Pilih akun - pilih tipe - riset ide - script - scene & animasi - visual & audio - render',
    stepLabel: 'Storyboard & narasi',
    stepHint: 'Pilih arah visual, ritme animasi, dan musik pengiring cerita.',
    scriptTitle: 'Script cerita',
    scriptHint: 'Tulis narasi utuh. Script ini yang akan dipecah menjadi scene di langkah berikutnya.',
    sceneTitle: 'Scene & animasi',
    sceneHint: 'Setiap scene punya narasi, visual, durasi, dan style animasi sendiri.',
    steps: scriptSteps,
    thumbnailStyles: [
      { id: 'cinematic', label: 'Cinematic portrait', desc: 'Potret dramatis dengan pencahayaan sinematik.', accent: '#F0B27A' },
      { id: 'diary', label: 'Diary collage', desc: 'Kolase personal untuk cerita yang intim.', accent: '#E8D5B7' },
      { id: 'warm-film', label: 'Warm film', desc: 'Warna film hangat dengan grain halus.', accent: '#D98880' },
    ],
    animationStyles: [
      { id: 'ken-burns', label: 'Ken Burns', desc: 'Zoom dan pan lembut di setiap adegan.' },
      { id: 'scene-cut', label: 'Scene cut', desc: 'Potongan adegan mengikuti beat narasi.' },
      { id: 'motion-text', label: 'Motion text', desc: 'Kutipan dan poin cerita muncul bertahap.' },
    ],
    musicStyles: [
      { id: 'piano', label: 'Emotional piano', desc: 'Piano lembut untuk momen reflektif.' },
      { id: 'strings', label: 'Cinematic strings', desc: 'String build-up untuk klimaks cerita.' },
      { id: 'acoustic', label: 'Soft acoustic', desc: 'Gitar akustik hangat dan personal.' },
    ],
    checklist: [
      'Hook cerita selesai sebelum detik ke-5.',
      'Narasi memiliki jeda untuk napas dan teks di layar.',
      'Konflik, klimaks, dan resolusi punya penanda visual.',
    ],
    phases: ['Menyusun storyboard', 'Membuat narasi VO', 'Sinkronisasi scene', 'Render video'],
  },
  konspirasi: {
    id: 'konspirasi',
    label: 'Konspirasi',
    desc: 'Bahasan misteri dan teori konspirasi',
    icon: Search,
    needsScript: true,
    pageDescription: 'Riset kasus, susun script dan label klaim, atur evidence per scene, lalu render.',
    flowSummary: 'Pilih akun - pilih tipe - riset kasus - script & klaim - evidence per scene - visual & audio - render',
    stepLabel: 'Evidence & reveal',
    stepHint: 'Susun bukti visual, pola reveal, dan tension audio yang berbeda dari niche lain.',
    scriptTitle: 'Script & klaim',
    scriptHint: 'Pisahkan fakta, dugaan, dan spekulasi. Setiap klaim akan diberi label per scene.',
    sceneTitle: 'Evidence per scene',
    sceneHint: 'Tentukan evidence visual, label klaim, sumber, dan animasi untuk tiap scene.',
    steps: scriptSteps,
    thumbnailStyles: [
      { id: 'dossier', label: 'Dossier redacted', desc: 'Berkas merah dengan bagian disensor.', accent: '#E6B8A2' },
      { id: 'evidence', label: 'Evidence board', desc: 'Papan bukti gelap dengan garis merah.', accent: '#E74C3C' },
      { id: 'archive', label: 'Vintage archive', desc: 'Arsip lama, foto pudar, dan cap rahasia.', accent: '#C9A66B' },
    ],
    animationStyles: [
      { id: 'parallax', label: 'Parallax evidence', desc: 'Lapisan bukti bergerak dengan kedalaman.' },
      { id: 'glitch', label: 'Glitch reveal', desc: 'Potongan glitch saat klaim kunci muncul.' },
      { id: 'slow-pan', label: 'Slow pan', desc: 'Kamera menyusuri dokumen secara perlahan.' },
    ],
    musicStyles: [
      { id: 'dark-ambient', label: 'Dark ambient', desc: 'Drone gelap untuk membangun ketegangan.' },
      { id: 'suspense', label: 'Suspense pulse', desc: 'Pulsa ritmis yang meningkat menjelang reveal.' },
      { id: 'mystery', label: 'Mysterious drone', desc: 'Nada rendah misterius dengan ruang hening.' },
    ],
    checklist: [
      'Setiap klaim diberi label fakta, dugaan, atau spekulasi.',
      'Sumber ditampilkan di layar dan tidak dipotong.',
      'Disclaimer dan konteks muncul sebelum kesimpulan.',
    ],
    phases: ['Menyusun klaim', 'Cek sumber & disclaimer', 'Membangun visual evidence', 'Render video'],
  },
}

const claimTypes: ClaimType[] = ['Fakta', 'Dugaan', 'Spekulasi']
const audioLengths = ['30 detik', '60 detik', '1 jam', '2 jam']
const musicTrackOptions = [1, 2, 3, 4, 5]
const audioEnergies = ['Chill', 'Fokus', 'Upbeat']


function makePreviewSvg(
  title: string,
  type: string,
  thumb: StyleOption | undefined,
  animation: StyleOption | undefined,
  audio: StyleOption | undefined,
  theme?: StyleOption,
) {
  const safe = (value: string) => value.replace(/[<>&"]/g, '')
  const accent = theme?.accent ?? thumb?.accent ?? '#F5D64B'
  const bars = Array.from({ length: 28 }, (_, i) => {
    const height = 24 + ((i * 37) % 96)
    return `<rect x="${320 + i * 23}" y="${528 - height / 2}" width="10" height="${height}" rx="5" fill="${accent}" opacity="${0.25 + (i % 5) * 0.12}"/>`
  }).join('')
  const decoration =
    type === 'music'
      ? `<circle cx="1080" cy="190" r="118" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/><circle cx="1080" cy="190" r="46" fill="${accent}" fill-opacity="0.18"/><circle cx="1080" cy="190" r="8" fill="${accent}"/>${bars}`
      : type === 'storytelling'
        ? `<rect x="850" y="120" width="270" height="170" rx="18" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-opacity="0.4"/><rect x="890" y="155" width="190" height="100" rx="10" fill="${accent}" fill-opacity="0.1"/><path d="M890 235 L940 195 L980 225 L1030 180 L1080 235 Z" fill="${accent}" fill-opacity="0.45"/><circle cx="1030" cy="175" r="12" fill="${accent}" fill-opacity="0.7"/>`
        : `<rect x="850" y="110" width="260" height="180" rx="10" fill="#141414" stroke="${accent}" stroke-opacity="0.45"/><line x1="880" y1="150" x2="1080" y2="150" stroke="#ffffff" stroke-opacity="0.18"/><line x1="880" y1="180" x2="1080" y2="180" stroke="#ffffff" stroke-opacity="0.18"/><line x1="880" y1="210" x2="1080" y2="210" stroke="#ffffff" stroke-opacity="0.18"/><rect x="880" y="168" width="120" height="18" fill="${accent}" fill-opacity="0.65"/><rect x="930" y="198" width="90" height="18" fill="#0b0b0b"/><circle cx="1070" cy="125" r="22" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.6"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b0b0b"/><stop offset="100%" stop-color="#171717"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="52" y="52" width="1176" height="616" rx="30" fill="#101010" stroke="${accent}" stroke-opacity="0.32"/>
  <text x="90" y="132" fill="${accent}" font-size="22" font-family="Arial" font-weight="700" letter-spacing="4">${safe(type).toUpperCase()}</text>
  <text x="90" y="218" fill="#ffffff" font-size="44" font-family="Arial" font-weight="700">${safe(title).slice(0, 38)}</text>
  <text x="90" y="266" fill="#9a9a9a" font-size="21" font-family="Arial">${safe(thumb?.label ?? 'Thumbnail')} - ${safe(animation?.label ?? 'Animasi')} - ${safe(theme?.label ?? 'Cinematic')}</text>
  ${decoration}
  <rect x="90" y="408" width="410" height="42" rx="21" fill="${accent}" fill-opacity="0.12"/>
  <text x="112" y="436" fill="${accent}" font-size="18" font-family="Arial">${safe(audio?.label ?? 'Music')}</text>
  <text x="90" y="588" fill="#8a8a8a" font-size="19" font-family="Arial">Kombinasi produksi - siap direview</text>
  <circle cx="640" cy="640" r="28" fill="${accent}"/><polygon points="632,626 632,654 656,640" fill="#0b0b0b"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function buildScenesFromScript(script: string, type: ContentType, config: NicheConfig): SceneDraft[] {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  const narrationParts = paragraphs.length >= 2 ? paragraphs.slice(0, 8) : [script.trim()]

  return narrationParts.map((narration, index) => {
    const firstLine = narration.split('\n')[0]
    const words = narration.trim().split(/\s+/).filter(Boolean).length
    return {
      id: uid('scene'),
      title: firstLine.slice(0, 42) || `Scene ${index + 1}`,
      narration,
      visual: type === 'konspirasi' ? 'Tampilkan sumber, potongan arsip, dan label klaim.' : 'Visual pendukung narasi scene ini.',
      duration: Math.max(4, Math.min(15, Math.round(words / 2.4))),
      animation: config.animationStyles[index % config.animationStyles.length].id,
      claimType: type === 'konspirasi' ? claimTypes[index % claimTypes.length] : undefined,
      source: type === 'konspirasi' ? 'Sumber akan dilengkapi' : undefined,
    }
  })
}

export function ContentProductionPage() {
  const consumeEnergy = useContentStore((s) => s.consumeEnergy)
  const addEnergy = useContentStore((s) => s.addEnergy)
  const aiEnergy = useContentStore((s) => s.aiEnergy)
  const aiEnergyMax = useContentStore((s) => s.aiEnergyMax)
  const accounts = useContentStore((s) => s.accounts)
  const { push } = useToastStore()

  const [step, setStep] = React.useState<StepKey>('account')
  const [contentType, setContentType] = React.useState<ContentType | null>(null)
  const [accountId, setAccountId] = React.useState('')
  const [platform, setPlatform] = React.useState<Platform>('YouTube')
  const [selectedIdea, setSelectedIdea] = React.useState('')
  const [ideas, setIdeas] = React.useState<IdeaOption[]>([])
  const [researching, setResearching] = React.useState(false)
  const [ytQuery, setYtQuery] = React.useState<string | null>(null)
  const [ytResearch, setYtResearch] = React.useState<YouTubeResearchResult | null>(null)
  const [ytLoading, setYtLoading] = React.useState(false)
  const [ytError, setYtError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [thumbnail, setThumbnail] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [script, setScript] = React.useState('')
  const [disclaimer, setDisclaimer] = React.useState('')
  const [scenes, setScenes] = React.useState<SceneDraft[]>([])
  const [audioLength, setAudioLength] = React.useState('1 jam')
  const [audioEnergy, setAudioEnergy] = React.useState('Fokus')
  const [musicTrackCount, setMusicTrackCount] = React.useState(5)
  const [thumbStyle, setThumbStyle] = React.useState('')
  const [animationStyle, setAnimationStyle] = React.useState('')
  const [musicStyle, setMusicStyle] = React.useState('')
  const [designTheme, setDesignTheme] = React.useState('cinematic')
  const [progress, setProgress] = React.useState(0)
  const [phase, setPhase] = React.useState('')
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [contentItemId, setContentItemId] = React.useState<string | null>(null)
  const [uploadPrivacy, setUploadPrivacy] = React.useState<'private' | 'unlisted' | 'public'>('private')
  const [uploading, setUploading] = React.useState(false)
  const [uploadResult, setUploadResult] = React.useState<{
    videoId: string
    url: string
    privacyStatus: 'private' | 'unlisted' | 'public'
  } | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = React.useState('')
  const [savedDraft, setSavedDraft] = React.useState(false)
  const timers = React.useRef<number[]>([])
  const backendSavedRef = React.useRef(false)

  React.useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)) }, [])

  const config = contentType ? nicheConfigs[contentType] : null
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null
  const ytQueryValue =
    ytQuery ??
    (selectedAccount?.niche && selectedAccount.niche !== 'General'
      ? selectedAccount.niche
      : config?.label ?? '')
  const activeSteps = config?.steps ?? overviewSteps
  const idx = Math.max(0, activeSteps.findIndex((s) => s.key === step))
  const prevStep = idx > 0 ? activeSteps[idx - 1].key : null
  const selectedThumb = config?.thumbnailStyles.find((s) => s.id === thumbStyle) ?? config?.thumbnailStyles[0]
  const selectedAnimation = config?.animationStyles.find((s) => s.id === animationStyle) ?? config?.animationStyles[0]
  const selectedMusic = config?.musicStyles.find((s) => s.id === musicStyle) ?? config?.musicStyles[0]
  const selectedTheme = designThemes.find((theme) => theme.id === designTheme) ?? designThemes[0]
  const sceneAnimation = config?.animationStyles.find((s) => s.id === scenes[0]?.animation) ?? selectedAnimation
  const totalSceneDuration = scenes.reduce((sum, scene) => sum + (Number.isFinite(scene.duration) ? scene.duration : 0), 0)
  const scriptWords = script.trim() ? script.trim().split(/\s+/).filter(Boolean).length : 0
  const scriptMinutes = scriptWords ? Math.max(1, Math.round(scriptWords / 140)) : 0

  const animationLabel = (id?: string) => config?.animationStyles.find((style) => style.id === id)?.label ?? 'Animasi'

  const pickType = (type: ContentType) => {
    const next = nicheConfigs[type]
    setContentType(type)
    setThumbStyle(next.thumbnailStyles[0].id)
    setAnimationStyle(next.animationStyles[0].id)
    setMusicStyle(next.musicStyles[0].id)
    setYtQuery(null)
    setYtResearch(null)
    setYtError(null)
    setIdeas([])
    setSelectedIdea('')
    setStep('research')
  }

  const selectAccount = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) return
    setAccountId(account.id)
    setPlatform(account.platform)
    setYtQuery(null)
    setYtResearch(null)
    setYtError(null)
    setIdeas([])
    setSelectedIdea('')
  }

  const runResearch = async () => {
    if (!contentType || !config || !selectedAccount) return
    setResearching(true)
    try {
      const res = await api.content.researchIdeas({
        contentType,
        platform,
        accountId: selectedAccount.id,
        niche: config.label,
        format: platform === 'YouTube' ? 'long' : 'short',
        ...(platform === 'YouTube' ? { researchQuery: ytQueryValue.trim() || config.label } : {}),
      })
      if (res.youtubeResearch) {
        setYtResearch(res.youtubeResearch)
        setYtError(null)
      }
      setIdeas(res.ideas)
      setSelectedIdea(res.ideas[0]?.id ?? '')
      const researchLabel = res.youtubeResearch?.configured
        ? `${res.youtubeResearch.videos.length} video live`
        : 'riset live tidak tersedia'
      push({
        title: 'Riset ide selesai',
        description: `${res.ideas.length} rekomendasi dari ${res.provider} (${res.model}) · ${researchLabel}`,
        tone: 'success',
      })
    } catch (error) {
      push({
        title: 'Riset ide gagal',
        description: error instanceof Error ? error.message : 'Provider AI tidak tersedia.',
        tone: 'warning',
      })
    } finally {
      setResearching(false)
    }
  }

  const runYouTubeResearch = async () => {
    const query = ytQueryValue.trim()
    if (!query) {
      push({ title: 'Topik YouTube kosong', description: 'Isi topik atau niche untuk riset live.', tone: 'warning' })
      return
    }
    setYtLoading(true)
    setYtError(null)
    try {
      const res = await api.content.researchYouTube({ q: query, days: 90, maxResults: 10, refresh: true })
      setYtResearch(res)
      push({
        title: 'Riset YouTube selesai',
        description: `${res.videos.length} video live untuk "${res.query ?? query}".`,
        tone: 'success',
      })
    } catch (error) {
      setYtResearch(null)
      setYtError(error instanceof Error ? error.message : 'Riset YouTube gagal.')
    } finally {
      setYtLoading(false)
    }
  }

  const prepareNext = async () => {
    const idea = ideas.find((item) => item.id === selectedIdea)
    if (!idea || !config || !selectedAccount) return
    setTitle(idea.title)
    setThumbnail(idea.thumbnail ?? '')
    setDescription(
      `${idea.hook} ${idea.angle}${idea.reference ? ` Acuan riset: ${idea.reference}` : ''} Dioptimalkan untuk ${platform} - ${selectedAccount.name}.`,
    )
    if (!config.needsScript) {
      setAudioLength(platform === 'YouTube' ? '1 jam' : '60 detik')
      setStep('brief')
      return
    }

    setPreparing(true)
    try {
      const res = await api.content.scriptFromIdea(idea.id, {
        contentType: config.id,
        platform,
        animationStyles: config.animationStyles.map((style) => style.id),
      })
      setScript(res.script)
      setScenes(
        res.scenes.map((scene) => ({
          id: uid('scene'),
          title: scene.title,
          narration: scene.narration,
          visual: scene.visual,
          duration: scene.duration,
          animation: scene.animation,
          claimType: scene.claimType,
          source: scene.source ?? (config.id === 'konspirasi' ? '' : undefined),
        })),
      )
      setDisclaimer(
        res.disclaimer ||
          (config.id === 'konspirasi'
            ? 'Konten ini membahas klaim yang diperdebatkan. Fakta, dugaan, dan spekulasi diberi label terpisah.'
            : ''),
      )
      push({ title: 'Naskah siap', description: `${res.scenes.length} scene dari ${res.provider}`, tone: 'success' })
    } catch (error) {
      setScript('')
      setScenes([])
      setDisclaimer(
        config.id === 'konspirasi'
          ? 'Konten ini membahas klaim yang diperdebatkan. Fakta, dugaan, dan spekulasi diberi label terpisah.'
          : '',
      )
      push({
        title: 'Naskah AI gagal',
        description: error instanceof Error ? error.message : 'Tulis naskah secara manual.',
        tone: 'warning',
      })
    } finally {
      setPreparing(false)
      setStep('script')
    }
  }

  const goScenes = () => {
    if (!config || !script.trim()) return
    if (scenes.length === 0) setScenes(buildScenesFromScript(script, config.id, config))
    setStep('scenes')
  }

  const updateScene = (id: string, patch: Partial<SceneDraft>) => {
    setScenes((current) => current.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene)))
  }

  const addScene = () => {
    if (!config) return
    const last = scenes[scenes.length - 1]
    setScenes((current) => [
      ...current,
      {
        id: uid('scene'),
        title: `Scene ${current.length + 1}`,
        narration: '',
        visual: '',
        duration: 6,
        animation: last?.animation ?? config.animationStyles[0].id,
        claimType: config.id === 'konspirasi' ? 'Dugaan' : undefined,
        source: config.id === 'konspirasi' ? '' : undefined,
      },
    ])
  }

  const removeScene = (id: string) => {
    setScenes((current) => (current.length <= 1 ? current : current.filter((scene) => scene.id !== id)))
  }

  const goProduction = () => {
    if (!config || !title.trim()) return
    if (config.needsScript && (!script.trim() || scenes.length === 0)) return
    if (!thumbStyle) setThumbStyle(config.thumbnailStyles[0].id)
    if (!animationStyle) setAnimationStyle(config.animationStyles[0].id)
    if (!musicStyle) setMusicStyle(config.musicStyles[0].id)
    setStep('production')
  }

  const goBack = () => {
    if (prevStep) setStep(prevStep)
  }

  const cancelGeneration = () => {
    timers.current.forEach((timer) => {
      window.clearTimeout(timer)
      window.clearInterval(timer)
    })
    timers.current = []
    addEnergy(10)
    setProgress(0)
    setPhase('')
    setStep('production')
  }

  const runGenerate = () => {
    if (!title.trim() || !config) return
    if (config.needsScript && (!script.trim() || scenes.length === 0)) return
    const cost = 10
    if (!consumeEnergy(cost)) {
      push({ title: 'Energy Bambang habis', description: 'Ganti API key di Agent Report untuk isi ulang energy.', tone: 'warning' })
      return
    }
    setProgress(0)
    setPhase(config.phases[0])
    setSavedDraft(false)
    backendSavedRef.current = false
    setStep('generate')

    const backendRequest = api.content.generateProduction({
      contentType: contentType ?? 'music',
      title,
      platform,
      accountId: accountId || undefined,
      niche: config.label,
      format: platform === 'YouTube' ? 'long' : 'short',
      brief: config.needsScript
        ? undefined
        : [description, thumbnail ? `Konsep thumbnail: ${thumbnail}` : ''].filter(Boolean).join(' '),
      script: config.needsScript ? script : undefined,
      audioLength,
      audioEnergy,
      musicTrackCount,
      disclaimer: disclaimer || undefined,
      thumbnailStyle: selectedThumb?.id ?? thumbStyle,
      animationStyle: config.needsScript
        ? sceneAnimation?.id ?? animationStyle
        : selectedAnimation?.id ?? animationStyle,
      musicStyle: selectedMusic?.id ?? musicStyle,
      designTheme: selectedTheme?.id ?? designTheme,
      scenes: config.needsScript
        ? scenes.map((scene) => ({
            title: scene.title,
            narration: scene.narration,
            visual: scene.visual,
            animation: scene.animation,
            duration: Math.max(1, Math.round(scene.duration)),
            claimType: scene.claimType,
            source: scene.source,
          }))
        : undefined,
    })

    const tick = { value: 0 }
    const iv = window.setInterval(async () => {
      tick.value = Math.min(100, tick.value + 6)
      const p = tick.value
      setProgress(p)
      const phaseIndex = Math.min(config.phases.length - 1, Math.floor((p / 100) * config.phases.length))
      setPhase(config.phases[phaseIndex])
      if (p >= 100) {
        window.clearInterval(iv)
        try {
          const res = await backendRequest
          if (!res.media?.videoUrl || !res.media?.previewUrl) {
            throw new Error('Backend tidak mengembalikan file video hasil render.')
          }
          setPreviewUrl(res.media.previewUrl)
          setVideoUrl(res.media.videoUrl)
          setGeneratedTitle(title)
          const storedItem = res.item as { id?: string } | null
          setContentItemId(storedItem?.id ?? null)
          setUploadResult(null)
          setUploadError(null)
          if (res.item) backendSavedRef.current = true
          if (res.energy && typeof res.energy.current === 'number') {
            useContentStore.setState({ aiEnergy: res.energy.current, aiEnergyMax: res.energy.max })
          } else {
            addEnergy(cost)
          }
          setStep('result')
          const seconds = res.media.render?.duration
          const animationNote =
            res.media.render?.videoProvider === 'kie' ? ' Animasi AI KIE.' : ''
          push({
            title: 'Video selesai dirender',
            description: seconds
              ? `MP4 ${seconds}s tersimpan di backend dan siap direview.${animationNote}`
              : `Paket produksi tersimpan di backend dan siap direview.${animationNote}`,
            tone: 'success',
          })
        } catch (error) {
          addEnergy(cost)
          setProgress(0)
          setPhase('')
          setStep('production')
          push({
            title: 'Render video gagal',
            description: error instanceof Error ? error.message : 'Backend tidak tersedia.',
            tone: 'warning',
          })
        }
      }
    }, 180)
    timers.current.push(iv as unknown as number)
  }

  const downloadVideo = () => {
    const safe = (generatedTitle || title || 'konten').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const a = document.createElement('a')
    a.href = videoUrl || ''
    a.download = `${safe}.mp4`
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    push({ title: 'Unduhan dimulai', description: 'Video siap untuk diposting', tone: 'success' })
  }

  const downloadThumbnail = () => {
    const safe = (generatedTitle || title || 'konten').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const a = document.createElement('a')
    a.href = previewUrl || ''
    a.download = `${safe}-thumbnail.png`
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    push({ title: 'Unduhan dimulai', description: 'Thumbnail murni siap dipakai', tone: 'success' })
  }

  const uploadToYouTube = async () => {
    if (!contentItemId || uploading) return
    const warning =
      uploadPrivacy === 'public'
        ? 'Video akan langsung PUBLIK di YouTube dan bisa ditonton siapa saja. Lanjutkan?'
        : uploadPrivacy === 'unlisted'
          ? 'Video akan diunggah sebagai Unlisted (hanya lewat link). Lanjutkan?'
          : 'Video akan diunggah sebagai Private (hanya Anda). Lanjutkan?'
    if (!window.confirm(warning)) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await api.content.publishYouTube(contentItemId, {
        privacyStatus: uploadPrivacy,
        confirm: true,
      })
      setUploadResult(res.upload)
      push({
        title: 'Video terunggah ke YouTube',
        description: `Status ${res.upload.privacyStatus}. ${res.upload.url}`,
        tone: 'success',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload ke YouTube gagal.'
      setUploadError(message)
      push({ title: 'Upload YouTube gagal', description: message, tone: 'warning' })
    } finally {
      setUploading(false)
    }
  }

  const productionLines = () => {
    if (!config) return []
    if (!config.needsScript) {
      return [
        'Brief audio:',
        description,
        '',
        `Durasi audio: ${audioLength}`,
        `Energi audio: ${audioEnergy}`,
        `Jumlah lagu: ${musicTrackCount}`,
      ]
    }
    return [
      'Script:',
      script,
      '',
      `Disclaimer: ${disclaimer || '-'}`,
      '',
      `Scene (${scenes.length}, total ${totalSceneDuration} detik):`,
      ...scenes.flatMap((scene, index) => [
        `${index + 1}. ${scene.title} - ${scene.duration} detik - ${animationLabel(scene.animation)}`,
        `   Narasi: ${scene.narration}`,
        `   Visual: ${scene.visual}`,
        ...(config.id === 'konspirasi' ? [`   Klaim: ${scene.claimType ?? '-'}`, `   Sumber: ${scene.source || '-'}`] : []),
      ]),
    ]
  }

  const downloadPack = () => {
    const safe = (generatedTitle || title || 'konten').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadText(
      `${safe}-paket-produksi.txt`,
      [
        `Judul: ${title}`,
        `Niche: ${config?.label ?? contentType}`,
        `Platform: ${platform}`,
        `Akun: ${selectedAccount?.name ?? '-'} (${selectedAccount?.handle ?? '-'})`,
        `Flow: ${config?.flowSummary ?? '-'}`,
        `Thumbnail style: ${selectedThumb?.label}`,
        `Tema desain: ${selectedTheme?.label}`,
        `Animation: ${config?.needsScript ? `${scenes.length} scene` : selectedAnimation?.label}`,
        `Music: ${selectedMusic?.label}`,
        `Thumbnail: ${thumbnail}`,
        '',
        ...productionLines(),
        '',
        'Checklist niche:',
        ...(config?.checklist.map((item) => `- ${item}`) ?? []),
      ].join('\n'),
    )
  }

  const saveToDraft = () => {
    if (!videoUrl || savedDraft) return
    if (!backendSavedRef.current) {
      push({ title: 'Belum tersimpan', description: 'Render ulang agar konten masuk draft backend.', tone: 'warning' })
      return
    }
    setSavedDraft(true)
    push({ title: 'Tersimpan di backend', description: 'Konten sudah masuk draft dan library.', tone: 'success' })
  }

  const reset = () => {
    setStep('account')
    setContentType(null)
    setAccountId('')
    setPlatform('YouTube')
    setIdeas([])
    setSelectedIdea('')
    setTitle('')
    setThumbnail('')
    setDescription('')
    setScript('')
    setDisclaimer('')
    setScenes([])
    setAudioLength('1 jam')
    setAudioEnergy('Fokus')
    setMusicTrackCount(5)
    setThumbStyle('')
    setAnimationStyle('')
    setMusicStyle('')
    setDesignTheme('cinematic')
    setVideoUrl(null)
    setPreviewUrl(null)
    setContentItemId(null)
    setUploadPrivacy('private')
    setUploading(false)
    setUploadResult(null)
    setUploadError(null)
    setProgress(0)
    setPhase('')
    setSavedDraft(false)
  }

  return (
    <div>
      <PageHeader
        title="Flow Konten"
        description={config?.pageDescription ?? 'Pilih akun tujuan dulu, lalu tentukan tipe konten. Setiap niche punya urutan langkah, script, dan kontrol animasi yang berbeda.'}
        actions={
          <div className="min-w-[180px] rounded-xl border border-teal/30 bg-teal/[0.06] px-3 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-text-muted">
              <span>Energy Bambang</span>
              <span className="num text-teal">{aiEnergy}/{aiEnergyMax}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${(aiEnergy / aiEnergyMax) * 100}%` }} />
            </div>
            <p className="mt-1 text-[9px] text-text-muted">Setiap generate -10 energy</p>
          </div>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {activeSteps.map((s, i) => {
            const active = s.key === step
            const done = i < idx
            return (
              <React.Fragment key={s.key}>
                {i > 0 ? <span className={cn('h-px w-6 shrink-0', done || active ? 'bg-teal/50' : 'bg-white/10')} /> : null}
                <div className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[11px]', active ? 'border-teal/40 bg-teal/10 text-teal' : done ? 'border-line text-text-secondary' : 'border-transparent text-text-muted')}>
                  {done ? 'OK ' : ''}{s.label}
                </div>
              </React.Fragment>
            )
          })}
        </div>
        {config ? (
          <p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-text-muted">
            Flow {config.label}: {config.flowSummary}
          </p>
        ) : null}
      </Card>

      {step === 'type' ? (
        <Card className="p-5">
          <SectionHeader title="Pilih tipe konten" description={`Akun: ${selectedAccount?.name ?? '-'}. Music tidak memakai script cerita. Story Telling dan Konspirasi punya script serta animasi per scene.`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {types.map((t) => {
              const cfg = nicheConfigs[t.id]
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickType(t.id)}
                  className="rounded-xl border border-line bg-white/[0.02] p-4 text-left transition-colors hover:border-teal/40 hover:bg-teal/[0.05]"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-teal/10 text-teal"><t.icon className="size-5" /></span>
                  <p className="mt-3 text-[14px] font-semibold text-text-primary">{t.label}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{t.desc}</p>
                  <p className="mt-3 text-[9px] uppercase tracking-[0.1em] text-teal/80">{cfg.steps.length} langkah</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-text-muted">{cfg.flowSummary}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] text-primary">
                    {cfg.needsScript ? 'Dengan script + scene' : 'Tanpa script cerita'} <ArrowRight className="size-3" />
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      ) : null}

      {step === 'account' ? (
        <Card className="p-5">
          <SectionHeader
            title="Pilih akun tujuan"
            description="Pilih akun tujuan dulu. Hasil generate akan masuk ke draft akun ini, lalu tentukan tipe kontennya."
            action={selectedAccount ? <Badge tone="info">{selectedAccount.handle}</Badge> : <Badge tone="outline">Belum dipilih</Badge>}
          />
          <AccountPicker activeId={accountId} onSelect={selectAccount} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[10px] text-text-muted">
              {selectedAccount
                ? `Target: ${selectedAccount.name} - ${selectedAccount.platform} (${selectedAccount.handle})`
                : 'Pilih salah satu akun untuk melanjutkan flow.'}
            </p>
            <Button onClick={() => setStep('type')} disabled={!selectedAccount}>
              Lanjut pilih tipe <ArrowRight />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 'research' ? (
        <Card className="p-5">
          <SectionHeader
            title={config?.needsScript ? 'Riset ide konten' : 'Riset audio'}
            description={`Tipe: ${types.find((t) => t.id === contentType)?.label} - Akun: ${selectedAccount?.name ?? '-'}`}
            action={<Badge tone="info">{platform}</Badge>}
          />
          <div className="mb-3 text-[10px] leading-relaxed text-text-muted">
            {platform === 'YouTube'
              ? 'Data YouTube live dipakai lebih dulu, lalu AI menyusun rekomendasi judul, thumbnail, angle, dan acuan video.'
              : 'AI menyusun rekomendasi judul, thumbnail, dan angle berdasarkan tipe konten yang dipilih.'}
          </div>

          {platform === 'YouTube' ? (
            <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="yt-research-query" className="mb-1.5 block text-[10px] uppercase tracking-[0.08em] text-text-muted">
                    Niche / topik riset YouTube
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                    <Input
                      id="yt-research-query"
                      value={ytQueryValue}
                      onChange={(event) => setYtQuery(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && void runResearch()}
                      placeholder="Cari niche, mis. lofi study, ambient, indie..."
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void runYouTubeResearch()} loading={ytLoading}>
                  <Search /> Ambil data live
                </Button>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-text-muted">
                Ketik niche yang ingin diriset. Data live ini yang dipakai AI untuk menyusun judul dan thumbnail.
              </p>
            </div>
          ) : null}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-text-muted">Akun tujuan:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-2.5 py-1 text-[10px] text-teal">
              <CheckCircle2 className="size-3" />
              {selectedAccount?.name ?? '-'}
              <span className="text-teal/60">{selectedAccount?.handle}</span>
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setStep('account')}>Ganti akun</Button>
              <Button size="sm" onClick={runResearch} loading={researching} disabled={!selectedAccount}>
                <Search /> {config?.needsScript ? 'Riset ide konten' : 'Riset referensi audio'}
              </Button>
            </div>
          </div>

          {platform === 'YouTube' && ytResearch?.configured && ideas.length ? (
            <p className="mb-2 rounded-lg border border-teal/20 bg-teal/[0.04] px-3 py-2 text-[10px] leading-relaxed text-text-secondary">
              Rekomendasi di bawah disusun dari {ytResearch.videos.length} video live query "{ytResearch.query}" ({ytResearch.windowDays} hari terakhir).
            </p>
          ) : null}

          {ideas.length ? (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => setSelectedIdea(idea.id)}
                  className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left', selectedIdea === idea.id ? 'border-teal/40 bg-teal/[0.06]' : 'border-line bg-white/[0.02]')}
                >
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-text-primary">{idea.title}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-text-muted">{idea.hook}</span>
                    {idea.thumbnail ? (
                      <span className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-text-secondary">
                        <ImageIcon className="mt-0.5 size-3 shrink-0 text-primary" />
                        <span className="min-w-0 break-words"><span className="font-medium text-text-primary">Thumbnail:</span> {idea.thumbnail}</span>
                      </span>
                    ) : null}
                    {idea.reference ? (
                      <span className="mt-1 flex items-start gap-1.5 text-[10px] leading-relaxed text-text-secondary">
                        <ExternalLink className="mt-0.5 size-3 shrink-0" />
                        <span className="min-w-0 break-words"><span className="font-medium text-text-primary">Acuan:</span> {idea.reference}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[9px] text-text-muted">{idea.score}</span>
                  {selectedIdea === idea.id ? <CheckCircle2 className="size-4 shrink-0 text-teal" /> : null}
                </button>
              ))}
              <div className="flex justify-end pt-2">
                <Button onClick={prepareNext} loading={preparing} disabled={!selectedIdea}>
                  {config?.needsScript ? 'Lanjut tulis script' : 'Lanjut ke brief audio'}
                  {config?.needsScript ? <FileText /> : <AudioLines />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-[11px] text-text-muted">
              {platform === 'YouTube'
                ? 'Ketik niche di kolom atas, lalu riset video live dan susun rekomendasi judul, thumbnail, serta angle.'
                : `Klik "${config?.needsScript ? 'Riset ide konten' : 'Riset referensi audio'}" untuk mendapatkan rekomendasi berdasarkan tipe konten yang dipilih.`}
            </div>
          )}

          {platform === 'YouTube' ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-text-primary">Riset YouTube live</p>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    Tren dan kompetitor dari YouTube Data API v3, bukan data simulasi.
                  </p>
                </div>
                <Badge tone={ytResearch ? 'success' : 'outline'}>{ytResearch ? 'Live' : 'Belum diambil'}</Badge>
              </div>

              {ytError ? (
                <div className="mt-3 rounded-xl border border-danger/25 bg-danger/[0.04] p-3">
                  <p className="text-[11px] font-medium text-text-primary">Riset YouTube gagal</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">{ytError}</p>
                  <p className="mt-1 text-[9px] text-text-muted">
                    Pastikan channel YouTube terhubung lewat OAuth atau YOUTUBE_API_KEY terisi di backend.
                  </p>
                </div>
              ) : null}

              {ytResearch && !ytResearch.configured ? (
                <p className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3 text-[10px] text-text-muted">
                  {ytResearch.reason ?? 'Riset YouTube belum siap.'}
                </p>
              ) : ytResearch ? (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-line bg-black/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Median views</p>
                      <p className="num mt-1 text-[13px] font-semibold text-text-primary">{formatNumber(ytResearch.patterns.medianViews, true)}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-black/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Views/hari</p>
                      <p className="num mt-1 text-[13px] font-semibold text-text-primary">{formatNumber(ytResearch.patterns.medianViewsPerDay, true)}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-black/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Shorts share</p>
                      <p className="num mt-1 text-[13px] font-semibold text-text-primary">{formatPercent(ytResearch.patterns.shortsShare)}</p>
                    </div>
                    <div className="rounded-lg border border-line bg-black/20 p-2.5">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Sampel</p>
                      <p className="num mt-1 text-[13px] font-semibold text-text-primary">{ytResearch.patterns.sampleSize} video</p>
                    </div>
                  </div>

                  {ytResearch.videos.length ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left">
                        <thead>
                          <tr className="border-b border-line text-[9px] uppercase tracking-[0.08em] text-text-muted">
                            <th className="px-2 py-2 font-medium">Video</th>
                            <th className="px-2 py-2 text-right font-medium">Views</th>
                            <th className="px-2 py-2 text-right font-medium">Views/hari</th>
                            <th className="px-2 py-2 text-right font-medium">Outlier</th>
                            <th className="px-2 py-2 text-right font-medium">Subs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ytResearch.videos.slice(0, 5).map((video) => (
                            <tr key={video.videoId} className="border-b border-line/60 last:border-0">
                              <td className="max-w-[280px] px-2 py-2">
                                <a href={video.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[10px] font-medium text-text-primary hover:text-primary">
                                  {video.title}
                                  <ExternalLink className="ml-1 inline size-2.5 align-[-1px]" />
                                </a>
                                <p className="mt-0.5 truncate text-[9px] text-text-muted">{video.channelTitle}</p>
                              </td>
                              <td className="num whitespace-nowrap px-2 py-2 text-right text-[10px] text-text-secondary">{formatNumber(video.views, true)}</td>
                              <td className="num whitespace-nowrap px-2 py-2 text-right text-[10px] text-text-secondary">{formatNumber(video.viewsPerDay, true)}</td>
                              <td className="num whitespace-nowrap px-2 py-2 text-right text-[10px] text-primary">{video.outlierRatio.toFixed(2)}x</td>
                              <td className="num whitespace-nowrap px-2 py-2 text-right text-[10px] text-text-muted">{formatNumber(video.subscriberCount, true)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] text-text-muted">Tidak ada video pada jendela 90 hari untuk query ini.</p>
                  )}
                  <p className="mt-2 text-[9px] leading-relaxed text-text-muted">
                    Menampilkan 5 video teratas dari {ytResearch.patterns.sampleSize} sampel · {ytResearch.windowDays} hari terakhir · {ytResearch.regionCode} · outlier = views / median sampel ·
                    data live, cache backend 1 jam.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
                  Ketik niche di kolom atas lalu klik "Ambil data live" atau "Riset referensi audio" untuk melihat video kompetitor, views per hari, dan rasio outlier.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === 'brief' && config && !config.needsScript ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Card className="p-5">
            <SectionHeader title={config.scriptTitle} description={config.scriptHint} action={<Badge tone="primary">{config.label}</Badge>} />
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Film className="size-3.5" /> Judul</span>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul konten" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><ImageIcon className="size-3.5" /> Thumbnail (konsep)</span>
                <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="Deskripsi/teks thumbnail" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Mic2 className="size-3.5" /> Brief audio</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-teal/40" placeholder="Arah audio, referensi, dan suasana yang diinginkan" />
              </label>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Clock3 className="size-3.5" /> Durasi audio</p>
                <div className="flex flex-wrap gap-2">
                  {audioLengths.map((option) => (
                    <button key={option} type="button" onClick={() => setAudioLength(option)} className={cn('rounded-full border px-3 py-1.5 text-[10px]', audioLength === option ? 'border-teal/45 bg-teal/10 text-teal' : 'border-line text-text-muted')}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Gauge className="size-3.5" /> Energi audio</p>
                <div className="flex flex-wrap gap-2">
                  {audioEnergies.map((option) => (
                    <button key={option} type="button" onClick={() => setAudioEnergy(option)} className={cn('rounded-full border px-3 py-1.5 text-[10px]', audioEnergy === option ? 'border-teal/45 bg-teal/10 text-teal' : 'border-line text-text-muted')}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Music className="size-3.5" /> Jumlah lagu</p>
                <div className="flex flex-wrap gap-2">
                  {musicTrackOptions.map((option) => (
                    <button key={option} type="button" onClick={() => setMusicTrackCount(option)} className={cn('rounded-full border px-3 py-1.5 text-[10px]', musicTrackCount === option ? 'border-teal/45 bg-teal/10 text-teal' : 'border-line text-text-muted')}>
                      {option} lagu
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[9px] leading-relaxed text-text-muted">
                  Suno membuat {musicTrackCount} lagu dengan genre, tipe, dan mood yang sama; aransemen tiap lagu dibuat berbeda lalu digabung menjadi satu playlist.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={goBack}><ArrowLeft /> Kembali</Button>
              <Button onClick={goProduction} disabled={!title.trim()}><Palette /> Atur visual & audio</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Ringkasan brief" description="Flow music tanpa script cerita" />
            <div className="rounded-xl border border-teal/20 bg-teal/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-teal/80">Brief audio</p>
              <p className="mt-2 text-[13px] font-semibold text-text-primary">{title || 'Judul konten'}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{description || 'Brief audio akan muncul di sini.'}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-black/20 p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Durasi</p>
                  <p className="mt-1 text-[11px] text-text-secondary">{audioLength}</p>
                </div>
                <div className="rounded-lg border border-line bg-black/20 p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Energi</p>
                  <p className="mt-1 text-[11px] text-text-secondary">{audioEnergy}</p>
                </div>
                <div className="rounded-lg border border-line bg-black/20 p-2.5">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Lagu</p>
                  <p className="mt-1 text-[11px] text-text-secondary">{musicTrackCount} lagu</p>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-white/[0.02] p-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-text-muted"><List className="size-3" /> Langkah music</p>
              <ul className="mt-2 space-y-1.5">
                {config.steps.slice(1).map((s) => (
                  <li key={s.key} className="text-[10px] text-text-muted">- {s.label}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 'script' && config?.needsScript ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card className="p-5">
            <SectionHeader title={config.scriptTitle} description={config.scriptHint} action={<Badge tone="info">{config.label}</Badge>} />
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Film className="size-3.5" /> Judul</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul konten" />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><ImageIcon className="size-3.5" /> Thumbnail (konsep)</span>
                  <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="Deskripsi/teks thumbnail" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><FileText className="size-3.5" /> Script utuh</span>
                <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={14} className="w-full rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-[12px] leading-relaxed text-text-primary outline-none focus:border-teal/40" placeholder="Tulis script cerita di sini. Pisahkan antar bagian dengan baris kosong." />
              </label>
              {config.id === 'konspirasi' ? (
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><ShieldAlert className="size-3.5" /> Disclaimer</span>
                  <Input value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} placeholder="Disclaimer yang muncul di video" />
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><BookOpen className="size-3.5" /> Deskripsi / sinopsis</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-teal/40" placeholder="Deskripsi konten" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={goBack}><ArrowLeft /> Kembali</Button>
              <Button onClick={goScenes} disabled={!script.trim()}><List /> Pecah jadi scene</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Cek script" description="Script akan dipecah menjadi scene bernarasi" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Kata</p>
                <p className="num mt-1 text-[18px] text-text-primary">{scriptWords}</p>
              </div>
              <div className="rounded-lg border border-line bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Estimasi</p>
                <p className="num mt-1 text-[18px] text-text-primary">{scriptMinutes} mnt</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-teal/20 bg-teal/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-teal/80">Aturan niche</p>
              <ul className="mt-2 space-y-1.5">
                {config.checklist.map((item) => (
                  <li key={item} className="flex gap-1.5 text-[10px] leading-relaxed text-text-muted">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-teal/70" />{item}
                  </li>
                ))}
              </ul>
            </div>
            {config.id === 'konspirasi' ? (
              <div className="mt-3 rounded-xl border border-warning/25 bg-warning/[0.05] p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-warning"><ShieldAlert className="size-3" /> Label klaim</p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted">Gunakan {claimTypes.join(', ')}. Label ini akan diatur per scene dan ikut tersimpan di paket produksi.</p>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {step === 'scenes' && config?.needsScript ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="p-5">
            <SectionHeader
              title={config.sceneTitle}
              description={config.sceneHint}
              action={
                <Button size="sm" variant="secondary" onClick={goScenes} disabled={!script.trim()}>
                  <RefreshCw /> Bagi ulang script
                </Button>
              }
            />
            <div className="space-y-3">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-text-primary">
                      <span className="grid size-6 place-items-center rounded-full bg-teal/10 text-[10px] text-teal">{index + 1}</span>
                      Scene {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeScene(scene.id)}
                      disabled={scenes.length <= 1}
                      className="rounded-lg border border-line p-1.5 text-text-muted transition-colors hover:border-danger/30 hover:text-danger disabled:opacity-30"
                      aria-label={`Hapus scene ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_100px_1.2fr]">
                    <Input value={scene.title} onChange={(e) => updateScene(scene.id, { title: e.target.value })} placeholder="Judul scene" />
                    <Input
                      type="number"
                      min={1}
                      value={scene.duration}
                      onChange={(e) => updateScene(scene.id, { duration: Number(e.target.value) })}
                      placeholder="Detik"
                    />
                    <Select value={scene.animation} onChange={(e) => updateScene(scene.id, { animation: e.target.value })} className="h-9 text-[11px]">
                      {config.animationStyles.map((style) => (
                        <option key={style.id} value={style.id}>{style.label}</option>
                      ))}
                    </Select>
                  </div>
                  <textarea
                    value={scene.narration}
                    onChange={(e) => updateScene(scene.id, { narration: e.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-text-primary outline-none focus:border-teal/40"
                    placeholder="Narasi scene"
                  />
                  <Input
                    value={scene.visual}
                    onChange={(e) => updateScene(scene.id, { visual: e.target.value })}
                    placeholder="Arahan visual / evidence scene"
                    className="mt-2"
                  />
                  {config.id === 'konspirasi' ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
                      <Select value={scene.claimType ?? 'Dugaan'} onChange={(e) => updateScene(scene.id, { claimType: e.target.value as ClaimType })} className="h-9 text-[11px]">
                        {claimTypes.map((claim) => (
                          <option key={claim} value={claim}>{claim}</option>
                        ))}
                      </Select>
                      <Input value={scene.source ?? ''} onChange={(e) => updateScene(scene.id, { source: e.target.value })} placeholder="Sumber / link bukti" />
                    </div>
                  ) : null}
                  <p className="mt-2 text-[9px] text-text-muted">Animasi: {animationLabel(scene.animation)} - {scene.duration} detik</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="secondary" size="sm" onClick={addScene}><Plus /> Tambah scene</Button>
              <p className="text-[10px] text-text-muted">{scenes.length} scene - total {totalSceneDuration} detik</p>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={goBack}><ArrowLeft /> Kembali ke script</Button>
              <Button onClick={goProduction} disabled={!scenes.length || scenes.some((scene) => !scene.narration.trim())}><Palette /> Lanjut visual & audio</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Peta scene" description="Animasi dipilih per scene, bukan satu gaya untuk semua" />
            <div className="space-y-2">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-medium text-text-primary">{index + 1}. {scene.title || 'Tanpa judul'}</p>
                    <span className="shrink-0 text-[9px] text-text-muted">{scene.duration}s</span>
                  </div>
                  <p className="mt-1 text-[9px] text-teal/80">{animationLabel(scene.animation)}</p>
                  {config.id === 'konspirasi' ? <p className="mt-1 text-[9px] text-warning/90">{scene.claimType ?? 'Dugaan'} - {scene.source || 'Sumber belum diisi'}</p> : null}
                  <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-text-muted">{scene.narration || 'Narasi belum diisi'}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-teal/20 bg-teal/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-teal/80">Animasi terpakai</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(new Set(scenes.map((scene) => scene.animation))).map((id) => (
                  <Badge key={id} tone="outline" className="text-[8px]">{animationLabel(id)}</Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 'production' && config ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
          <Card className="p-5">
            <SectionHeader title={config.stepLabel} description={config.stepHint} action={<Badge tone="primary">{config.label}</Badge>} />
            <div className="space-y-5">
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Palette className="size-3.5" /> Tema desain visual</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {designThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setDesignTheme(theme.id)}
                      className={cn('rounded-xl border p-2.5 text-left transition-colors', designTheme === theme.id ? 'border-teal/45 bg-teal/[0.07]' : 'border-line bg-white/[0.02] hover:border-line-strong')}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span className="text-[10px] font-medium text-text-primary">{theme.label}</span>
                      </span>
                      <span className="mt-1 block text-[8px] leading-relaxed text-text-muted">{theme.desc}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[9px] text-text-muted">Tema ini dipakai untuk gambar GPT Image 2 dan animasi AI.</p>
              </section>

              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><ImageIcon className="size-3.5" /> Style gambar thumbnail</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {config.thumbnailStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setThumbStyle(style.id)}
                      className={cn('rounded-xl border p-3 text-left transition-colors', thumbStyle === style.id ? 'border-teal/45 bg-teal/[0.07]' : 'border-line bg-white/[0.02] hover:border-line-strong')}
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ backgroundColor: style.accent }} />
                        <span className="text-[11px] font-medium text-text-primary">{style.label}</span>
                      </span>
                      <span className="mt-1 block text-[9px] leading-relaxed text-text-muted">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {config.needsScript ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Clapperboard className="size-3.5" /> Animasi per scene</p>
                    <button type="button" onClick={() => setStep('scenes')} className="text-[10px] text-primary">Atur scene</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {scenes.map((scene, index) => (
                      <div key={scene.id} className="rounded-xl border border-line bg-white/[0.02] p-3">
                        <p className="text-[10px] font-medium text-text-primary">{index + 1}. {scene.title || 'Scene'}</p>
                        <p className="mt-1 text-[9px] text-teal/80">{animationLabel(scene.animation)} - {scene.duration} detik</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Clapperboard className="size-3.5" /> Style animasi video</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {config.animationStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setAnimationStyle(style.id)}
                        className={cn('rounded-xl border p-3 text-left transition-colors', animationStyle === style.id ? 'border-teal/45 bg-teal/[0.07]' : 'border-line bg-white/[0.02] hover:border-line-strong')}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary"><Film className="size-3 text-teal" />{style.label}</span>
                        <span className="mt-1 block text-[9px] leading-relaxed text-text-muted">{style.desc}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary"><Music className="size-3.5" /> {config.id === 'music' ? 'Hasil music' : 'Musik pengiring'}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {config.musicStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setMusicStyle(style.id)}
                      className={cn('rounded-xl border p-3 text-left transition-colors', musicStyle === style.id ? 'border-teal/45 bg-teal/[0.07]' : 'border-line bg-white/[0.02] hover:border-line-strong')}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary"><AudioLines className="size-3 text-teal" />{style.label}</span>
                      <span className="mt-1 block text-[9px] leading-relaxed text-text-muted">{style.desc}</span>
                      <span className="mt-2 flex h-4 items-end gap-0.5">
                        {[8, 14, 10, 16, 6, 12, 9, 15, 7, 11].map((h, i) => (
                          <span key={i} className={cn('w-1 rounded-sm', musicStyle === style.id ? 'bg-teal/70' : 'bg-white/15')} style={{ height: h }} />
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={goBack}><ArrowLeft /> Kembali</Button>
              <Button onClick={runGenerate} disabled={!title.trim()}><Wand2 /> Generate {config.id === 'music' ? 'audio & visual' : 'video'}</Button>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Preview kombinasi" description="Cek arah visual dan audio sebelum generate" />
            <div className="overflow-hidden rounded-xl border border-line bg-black">
              <img src={makePreviewSvg(title, contentType ?? 'konten', selectedThumb, sceneAnimation, selectedMusic, selectedTheme)} alt="Preview kombinasi produksi" className="aspect-video w-full object-cover" />
            </div>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Thumbnail', value: selectedThumb?.label, icon: <ImageIcon className="size-3" /> },
                { label: 'Tema', value: selectedTheme?.label, icon: <Palette className="size-3" /> },
                { label: 'Animasi', value: config.needsScript ? `${scenes.length} scene` : selectedAnimation?.label, icon: <Clapperboard className="size-3" /> },
                { label: 'Music', value: selectedMusic?.label, icon: <Music className="size-3" /> },
                ...(config.needsScript
                  ? []
                  : [{ label: 'Lagu', value: `${musicTrackCount} lagu`, icon: <Music className="size-3" /> }]),
                ...(config.needsScript
                  ? [{ label: 'Durasi scene', value: `${totalSceneDuration} detik`, icon: <Clock3 className="size-3" /> }]
                  : [{ label: 'Durasi audio', value: audioLength, icon: <Clock3 className="size-3" /> }]),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-white/[0.02] px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">{row.icon}{row.label}</span>
                  <span className="truncate text-[10px] text-text-secondary">{row.value}</span>
                </div>
              ))}
            </div>
            {config.needsScript ? (
              <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-text-muted"><List className="size-3" /> Scene plan</p>
                <div className="mt-2 space-y-1.5">
                  {scenes.map((scene, index) => (
                    <p key={scene.id} className="text-[9px] leading-relaxed text-text-muted">{index + 1}. {scene.title || 'Scene'} - {animationLabel(scene.animation)}</p>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-teal/20 bg-teal/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-teal/80">Checklist {config.label}</p>
              <ul className="mt-2 space-y-1.5">
                {config.checklist.map((item) => (
                  <li key={item} className="flex gap-1.5 text-[10px] leading-relaxed text-text-muted">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-teal/70" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 'generate' ? (
        <Card className="p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-teal/30 bg-teal/10 text-teal"><Wand2 className="size-6" /></span>
          <p className="mt-4 text-[15px] font-semibold text-text-primary">
            {config?.needsScript ? 'Menyusun narasi, scene, dan musik...' : 'Membuat thumbnail murni, animasi AI, dan audio...'}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">{phase || 'Menyiapkan render'} - {config?.label}</p>
          <div className="mx-auto mt-5 max-w-md">
            <Progress value={progress} tone="info" />
            <p className="num mt-2 text-[11px] text-text-secondary">{progress}%</p>
          </div>
          <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-1.5 sm:grid-cols-4">
            {config?.phases.map((p, i) => {
              const activeIndex = Math.min((config?.phases.length ?? 1) - 1, Math.floor((progress / 100) * (config?.phases.length ?? 1)))
              return (
                <div key={p} className={cn('rounded-lg border px-2 py-1.5 text-[9px]', i < activeIndex ? 'border-teal/25 bg-teal/[0.06] text-teal/70' : i === activeIndex ? 'border-teal/40 bg-teal/10 text-teal' : 'border-line text-text-muted')}>
                  {p}
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex justify-center">
            <Button variant="secondary" onClick={cancelGeneration}>
              <ArrowLeft /> Batalkan & kembali
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 'result' && videoUrl ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="p-5">
            <SectionHeader title="Hasil gabungan" description={config?.needsScript ? 'Video final dari script, animasi per scene, dan musik' : 'Thumbnail murni dan video animasi AI dari artwork + audio'} />
            <div className="overflow-hidden rounded-xl border border-line bg-black">
              <video controls poster={previewUrl ?? undefined} className="aspect-video w-full">
                <source src={videoUrl} type="video/mp4" />
              </video>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={downloadVideo}><Download /> Unduh video</Button>
              <Button variant="secondary" onClick={downloadThumbnail}><ImageIcon /> Unduh thumbnail</Button>
              <Button variant="secondary" onClick={downloadPack}><Download /> Unduh paket produksi</Button>
              <Button variant={savedDraft ? 'ghost' : 'soft'} onClick={saveToDraft} disabled={savedDraft}>
                {savedDraft ? <CheckCircle2 /> : <Save />} {savedDraft ? 'Tersimpan di draft' : 'Masuk ke draft'}
              </Button>
              <Button variant="ghost" onClick={reset}>Buat konten baru</Button>
            </div>
            {savedDraft ? (
              <p className="mt-2 text-[10px] text-text-muted">
                Draft tersimpan. <Link to="/app/content/drafts" className="text-primary">Buka Draft konten</Link>
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-text-muted">Unduh langsung, atau simpan kombinasi ini ke Draft untuk diedit nanti.</p>
            )}
          </Card>
          <Card className="p-5">
            <SectionHeader title="Detail produksi" description="Kombinasi lengkap siap diposting" />
            <div className="space-y-3 text-[12px]">
              <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Judul</p><p className="mt-1 text-text-primary">{generatedTitle}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Niche</p><p className="mt-1 text-text-secondary">{config?.label}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Akun tujuan</p><p className="mt-1 text-text-secondary">{selectedAccount?.name ?? '-'} - {selectedAccount?.handle ?? '-'} ({platform})</p></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: 'Thumbnail', value: selectedThumb?.label, icon: <ImageIcon className="size-3" /> },
                  { label: 'Animasi', value: config?.needsScript ? `${scenes.length} scene` : selectedAnimation?.label, icon: <Clapperboard className="size-3" /> },
                  { label: 'Music', value: selectedMusic?.label, icon: <Music className="size-3" /> },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-line bg-white/[0.02] p-2.5">
                    <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-text-muted">{row.icon}{row.label}</p>
                    <p className="mt-1 text-[10px] text-text-secondary">{row.value}</p>
                  </div>
                ))}
              </div>
              {config?.needsScript ? (
                <>
                  <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Script</p><p className="mt-1 line-clamp-3 whitespace-pre-line leading-relaxed text-text-secondary">{script}</p></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Scene ({scenes.length} - {totalSceneDuration} detik)</p>
                    <div className="mt-1.5 space-y-1">
                      {scenes.map((scene, index) => (
                        <p key={scene.id} className="text-[10px] text-text-secondary">{index + 1}. {scene.title || 'Scene'} - {animationLabel(scene.animation)}</p>
                      ))}
                    </div>
                  </div>
                  {config.id === 'konspirasi' ? (
                    <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Disclaimer</p><p className="mt-1 leading-relaxed text-text-secondary">{disclaimer || '-'}</p></div>
                  ) : null}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-line bg-white/[0.02] p-2.5"><p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Durasi</p><p className="mt-1 text-[10px] text-text-secondary">{audioLength}</p></div>
                  <div className="rounded-lg border border-line bg-white/[0.02] p-2.5"><p className="text-[9px] uppercase tracking-[0.08em] text-text-muted">Energi</p><p className="mt-1 text-[10px] text-text-secondary">{audioEnergy}</p></div>
                </div>
              )}
              <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Thumbnail</p><p className="mt-1 text-text-secondary">{thumbnail}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.1em] text-text-muted">Deskripsi</p><p className="mt-1 leading-relaxed text-text-secondary">{description}</p></div>
              {platform === 'YouTube' ? (
                <div className="rounded-xl border border-teal/25 bg-teal/[0.04] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary">
                      <Upload className="size-3.5 text-teal" /> Upload ke YouTube
                    </p>
                    {uploadResult ? <Badge tone="success">Terunggah</Badge> : null}
                  </div>
                  {uploadResult ? (
                    <div className="mt-2 space-y-1.5">
                      <a
                        href={uploadResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Buka video di YouTube <ExternalLink className="size-3" />
                      </a>
                      <p className="text-[10px] text-text-muted">
                        Status {uploadResult.privacyStatus} - ID {uploadResult.videoId}. Upload dieksekusi backend setelah persetujuan.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={uploadPrivacy}
                          onChange={(event) => setUploadPrivacy(event.target.value as 'private' | 'unlisted' | 'public')}
                          className="h-9 sm:w-40"
                          disabled={uploading}
                        >
                          <option value="private">Private</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="public">Public</option>
                        </Select>
                        <Button
                          onClick={uploadToYouTube}
                          disabled={!contentItemId || uploading || selectedAccount?.uploadReady === false}
                        >
                          <Upload /> {uploading ? 'Mengunggah...' : 'Upload ke YouTube'}
                        </Button>
                      </div>
                      {selectedAccount?.uploadReady === false ? (
                        <p className="mt-1.5 text-[10px] text-amber-300">
                          Akun belum memberi izin upload. Buka halaman Akun lalu klik Beri izin upload.
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-[10px] text-text-muted">
                        Agen hanya mengusulkan. Upload dijalankan backend setelah Anda menyetujui status privasi.
                      </p>
                    </>
                  )}
                  {!contentItemId && !uploadResult ? (
                    <p className="mt-1 text-[10px] text-amber-300">
                      Konten belum tersimpan sebagai draft backend, jadi upload belum bisa dijalankan.
                    </p>
                  ) : null}
                  {uploadError ? <p className="mt-1 text-[10px] text-red-300">{uploadError}</p> : null}
                </div>
              ) : (
                <div className="rounded-lg border border-teal/25 bg-teal/[0.05] p-3 text-[11px] text-teal"><Play className="mr-1 inline size-3.5" /> Video siap diposting ke {platform} - {selectedAccount?.name ?? 'akun terpilih'}</div>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}