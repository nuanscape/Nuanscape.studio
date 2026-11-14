import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clapperboard, Radar, Store, Wallet } from 'lucide-react'
import { PrismaHero } from '@/components/ui/prisma-hero'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IosIcon, type IosTone } from '@/components/ui/ios-icon'

const interfaces = [
  {
    id: 'seller',
    title: 'Seller Center',
    agent: 'Seller Agent',
    description:
      'Kelola marketplace, produk, stok, pesanan, dan profit. Seller Agent memantau performa toko dan menyiapkan aksi operasional.',
    href: '/app/seller/overview',
    icon: Store,
    tone: 'amber' as IosTone,
    accent: 'from-amber-400/20 to-orange-500/5',
  },
  {
    id: 'content',
    title: 'Content Production',
    agent: 'Content Agent',
    description:
      'Riset tren, ide, script, produksi, kalender, dan analitik konten. Content Agent menjaga pipeline dari ide sampai tayang.',
    href: '/app/content/overview',
    icon: Clapperboard,
    tone: 'sky' as IosTone,
    accent: 'from-cyan-400/20 to-sky-500/5',
  },
  {
    id: 'finance',
    title: 'Finance',
    agent: 'Finance Agent',
    description:
      'Pantau cash flow, transaksi, budget, aset, goals, dan laporan. Finance Agent membaca angka dan menandai risiko lebih awal.',
    href: '/app/finance/overview',
    icon: Wallet,
    tone: 'green' as IosTone,
    accent: 'from-emerald-400/20 to-teal-500/5',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#050505] text-white">
      <PrismaHero />

      <section id="interfaces" className="relative scroll-mt-8 px-4 pb-20 pt-14 sm:px-6 md:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#E1E0CC]/55">Agent Interfaces</p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-[#F4F3EA] sm:text-4xl">
                Pilih antarmuka yang dikendalikan agent
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55 sm:text-base">
                Setelah masuk, Nuanscape AI dan Agent Monitor membantu mengoordinasikan Seller Agent, Content Agent, dan Finance Agent dalam satu sistem.
              </p>
            </div>
            <Link to="/login?next=/app/monitor" className={cn(buttonVariants({ variant: 'secondary' }), 'border-white/10 bg-white/5 text-white hover:bg-white/10')}>
              <Radar className="size-4" /> Buka Agent Monitor
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {interfaces.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ y: 18, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90', item.accent)} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <IosIcon icon={item.icon} tone={item.tone} size="lg" />
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/65">
                      {item.agent}
                    </span>
                  </div>
                  <h3 className="mt-6 text-2xl font-medium tracking-tight text-[#F4F3EA]">{item.title}</h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-relaxed text-white/58">{item.description}</p>
                  <Link
                    to={item.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#E1E0CC] transition-all group-hover:gap-3"
                  >
                    Masuk ke {item.title}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
