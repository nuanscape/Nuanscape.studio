import * as React from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, LockKeyhole, Mail, Radar, ShieldCheck, UserRound } from 'lucide-react'
import { useAuthStore, useToastStore } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { IosIcon } from '@/components/ui/ios-icon'
import { BackgroundVideo } from '@/components/ui/background-video'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

const TABS: { id: Mode; label: string }[] = [
  { id: 'login', label: 'Masuk' },
  { id: 'register', label: 'Daftar' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

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
  const nextParam = params.get('next') || '/app/monitor'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app/monitor'
  const { session, login, register, loginWithGoogle } = useAuthStore()
  const { push } = useToastStore()

  const [mode, setMode] = React.useState<Mode>('login')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [googleBusy, setGoogleBusy] = React.useState(false)
  const googleHandled = React.useRef(false)

  React.useEffect(() => {
    if (session && !params.get('ticket')) navigate(next, { replace: true })
  }, [session, navigate, next, params])

  React.useEffect(() => {
    const google = params.get('google')
    if (google === 'error') {
      setError(params.get('reason') || 'Login Google gagal. Coba lagi.')
      return
    }

    const ticket = params.get('ticket')
    if (google !== 'success' || !ticket || googleHandled.current) return
    googleHandled.current = true
    setGoogleBusy(true)

    void (async () => {
      const result = await loginWithGoogle(ticket)
      if (!result.ok) {
        setError(result.error)
        setGoogleBusy(false)
        return
      }
      push({
        title: 'Berhasil masuk dengan Google',
        description: 'Dashboard Nuanscape siap digunakan.',
        tone: 'success',
      })
      navigate(next, { replace: true })
    })()
  }, [params, loginWithGoogle, push, navigate, next])

  const startGoogle = async () => {
    setError('')
    setGoogleBusy(true)
    try {
      const { url } = await api.auth.googleUrl({ next })
      window.location.assign(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak bisa memulai login Google.')
      setGoogleBusy(false)
    }
  }

  const switchMode = (value: Mode) => {
    setMode(value)
    setError('')
    setPassword('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result =
      mode === 'login' ? await login({ email, password }) : await register({ name, email, password })

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

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#E1E0CC]/40">
                  atau
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={startGoogle}
                disabled={googleBusy}
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.06] text-sm font-medium text-[#F4F3EA] transition-colors hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {googleBusy ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-[#E1E0CC]/30 border-t-[#E1E0CC]" />
                ) : (
                  <GoogleIcon />
                )}
                {googleBusy
                  ? 'Membuka Google...'
                  : mode === 'login'
                    ? 'Masuk dengan Google'
                    : 'Daftar dengan Google'}
              </button>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[#E1E0CC]/50">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#F5D64B]/80" />
                <span>Sesi akun tersimpan sampai kamu keluar. Login Google otomatis membuat akun bila email belum terdaftar.</span>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  )
}