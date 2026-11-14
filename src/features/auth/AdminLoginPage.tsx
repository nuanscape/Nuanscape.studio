import * as React from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LockKeyhole, Mail, Radar, ShieldCheck, UserRound } from 'lucide-react'
import { useAuthStore, useToastStore } from '@/stores/app-store'
import { IosIcon } from '@/components/ui/ios-icon'
import { BackgroundVideo } from '@/components/ui/background-video'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const TABS: { id: Mode; label: string }[] = [
  { id: 'login', label: 'Masuk' },
  { id: 'register', label: 'Daftar' },
]

function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden" inert={!open}>
        <div
          className={cn(
            'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            open ? 'translate-y-0' : '-translate-y-1',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/app/monitor'
  const { session, login, register } = useAuthStore()
  const { push } = useToastStore()

  const [mode, setMode] = React.useState<Mode>('login')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (session) navigate(next, { replace: true })
  }, [session, navigate, next])

  const switchMode = (value: Mode) => {
    setMode(value)
    setError('')
    setPassword('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result =
      mode === 'login' ? login({ email, password }) : register({ name, email, password })

    if (!result.ok) {
      setError(result.error)
      return
    }

    push({
      title: mode === 'login' ? 'Selamat datang kembali' : 'Akun berhasil dibuat',
      description: 'Dashboard Nuanscape siap digunakan.',
      tone: 'success',
    })
    navigate(next, { replace: true })
  }

  return (
    <section className="relative min-h-dvh w-full bg-[#050505] p-2 text-[#F4F3EA] sm:p-3 md:p-4">
      <div className="relative flex min-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl md:min-h-[calc(100dvh-2rem)] md:rounded-[2rem]">
        <BackgroundVideo
          className="absolute inset-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
        />
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />

        <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6 md:px-10">
          <Link to="/" aria-label="Nuanscape" className="inline-flex items-center">
            <img
              src="/nuanscape-iso-matrix.png"
              alt="Nuanscape"
              width={686}
              height={200}
              fetchPriority="high"
              decoding="async"
              className="block h-8 w-auto object-contain sm:h-9 md:h-10"
            />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#E1E0CC]/70 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-[#E1E0CC]"
          >
            Kembali ke landing
          </Link>
        </header>

        <div className="relative z-10 grid min-w-0 flex-1 grid-cols-1 items-center gap-10 px-4 pb-12 pt-6 sm:px-6 md:px-10 lg:grid-cols-12 lg:gap-6 lg:pb-16">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#E1E0CC]/55">Secure Access</p>
            <h1
              className="mt-4 flex max-w-full flex-col items-start font-medium tracking-[-0.07em]"
              style={{ color: '#E1E0CC' }}
            >
              <span className="block max-w-full text-[14vw] leading-[0.84] sm:text-[13vw] lg:text-[7.5vw]">NUANSCAPE</span>
              <span className="-mt-[0.03em] block pl-[0.04em] text-[4.5vw] leading-[1] tracking-[0.14em] text-[#E1E0CC]/78 sm:text-[3.6vw] lg:text-[2.1vw]">
                STUDIO
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#E1E0CC]/60 sm:text-base">
              Agentic Studio Command Center. Masuk dengan akun untuk mengelola Seller Agent, Content Agent, dan Finance
              Agent.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {[
                { icon: Radar, label: 'Agent Monitor', tone: 'mint' as const },
                { icon: UserRound, label: 'Akun Studio', tone: 'blue' as const },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/20 py-1.5 pl-1.5 pr-3 text-[11px] font-medium text-[#E1E0CC]/75 backdrop-blur-sm"
                >
                  <IosIcon icon={item.icon} tone={item.tone} size="xs" />
                  {item.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 lg:justify-self-end"
          >
            <form
              onSubmit={submit}
              className="w-full rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-7 lg:max-w-sm"
            >
              <div className="mb-5 flex rounded-full border border-white/10 bg-black/25 p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchMode(tab.id)}
                    aria-pressed={mode === tab.id}
                    className="relative flex-1 rounded-full px-3 py-2 text-[11px] font-medium"
                  >
                    {mode === tab.id ? (
                      <motion.span
                        layoutId="auth-tab-pill"
                        className="absolute inset-0 rounded-full bg-[#E1E0CC]"
                        transition={{ type: 'spring', stiffness: 480, damping: 38, mass: 0.7 }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 transition-colors duration-200',
                        mode === tab.id ? 'text-black' : 'text-[#E1E0CC]/60 hover:text-[#E1E0CC]',
                      )}
                    >
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#E1E0CC]/50">
                      Studio Account
                    </p>
                    <h2 className="mt-2 text-xl font-medium tracking-[-0.02em] text-[#F4F3EA]">
                      {mode === 'login' ? 'Masuk' : 'Daftar'}
                    </h2>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#E1E0CC]/55">
                      {mode === 'login'
                        ? 'Masukkan email dan password akun studio kamu.'
                        : 'Buat akun baru untuk mengakses dashboard.'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div>
                <Reveal open={mode === 'register'}>
                  <div className="pb-3">
                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#E1E0CC]/55">
                        <UserRound className="size-3.5" /> Nama
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap"
                        autoComplete="name"
                        tabIndex={mode === 'register' ? undefined : -1}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-[#F4F3EA] outline-none transition-colors placeholder:text-[#E1E0CC]/30 focus:border-[#E1E0CC]/40 focus-visible:outline-none"
                      />
                    </label>
                  </div>
                </Reveal>

                <div className="pb-3">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#E1E0CC]/55">
                      <Mail className="size-3.5" /> Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@studio.com"
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-[#F4F3EA] outline-none transition-colors placeholder:text-[#E1E0CC]/30 focus:border-[#E1E0CC]/40 focus-visible:outline-none"
                    />
                  </label>
                </div>

                <div className="pb-3">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#E1E0CC]/55">
                      <LockKeyhole className="size-3.5" /> Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-[#F4F3EA] outline-none transition-colors placeholder:text-[#E1E0CC]/30 focus:border-[#E1E0CC]/40 focus-visible:outline-none"
                    />
                  </label>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {error ? (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="mt-3 text-[12px] text-rose-300"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!email.trim() || !password}
                className="group mt-4 inline-flex w-full items-center justify-between gap-2 rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="relative inline-flex h-5 items-center overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={mode}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {mode === 'login' ? 'Masuk ke dashboard' : 'Buat akun'}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110">
                  <ArrowRight className="h-4 w-4" style={{ color: '#E1E0CC' }} />
                </span>
              </button>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[#E1E0CC]/50">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#F5D64B]/80" />
                <span>Sesi akun tersimpan sampai kamu keluar. Setelah keluar, masuk lagi dengan akun studio.</span>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}