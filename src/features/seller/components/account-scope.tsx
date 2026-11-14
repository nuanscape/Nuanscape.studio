import { Link } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { Select } from '@/components/ui/input'
import { useSellerStore } from '@/stores/seller-store'
import { cn } from '@/lib/utils'

export function AccountScope({ className }: { className?: string }) {
  const { connections, activeAccountId, setActiveAccount } = useSellerStore()
  const activeValue = connections.some((c) => c.id === activeAccountId) ? activeAccountId : 'all'
  const tiktokAccounts = connections.filter((c) => c.name === 'TikTok Shop')
  const shopeeAccounts = connections.filter((c) => c.name === 'Shopee')

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Select
        value={activeValue}
        onChange={(e) => setActiveAccount(e.target.value)}
        aria-label="Pilih akun seller"
        className="h-10 w-[220px] max-w-full rounded-full border-white/[0.1] bg-white/[0.055] px-4 text-xs font-semibold hover:border-white/[0.2]"
      >
        <option value="all">Semua akun</option>
        <optgroup label="TikTok Shop">
          {tiktokAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.storeName}
            </option>
          ))}
        </optgroup>
        <optgroup label="Shopee">
          {shopeeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.storeName}
            </option>
          ))}
        </optgroup>
      </Select>
      <Link
        to="/app/seller/marketplaces"
        aria-label="Kelola akun seller"
        title="Kelola akun seller"
        className="ring-focus grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.1] text-text-muted transition-colors hover:border-white/[0.2] hover:text-white"
      >
        <Settings2 className="size-4" />
      </Link>
    </div>
  )
}