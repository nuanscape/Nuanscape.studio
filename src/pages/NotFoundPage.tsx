import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, Radar } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="app-backdrop grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.06]">
          <Compass className="size-6 text-primary" />
        </div>
        <p className="num mt-5 text-[11px] uppercase tracking-[0.3em] text-primary/70">404</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-text-primary">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
          Alamat ini tidak ada di workspace. Kembali ke Agent Monitor untuk melihat struktur dan aktivitas agent.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link to="/app/monitor" className={buttonVariants()}>
            <ArrowLeft /> Agent Monitor
          </Link>
          <Link to="/app/seller/overview" className={buttonVariants({ variant: 'secondary' })}>
            <Radar /> Buka Seller Center
          </Link>
        </div>
        <p className="mt-6 text-[10px] text-text-muted">NUANSCAPE.STUDIO</p>
      </div>
    </div>
  )
}
