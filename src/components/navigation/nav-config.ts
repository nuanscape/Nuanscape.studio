import {
  Activity,
  Bell,
  Blocks,
  Bot,
  Boxes,
  CircleDollarSign,
  Clapperboard,
  ClipboardList,
  Compass,
  FileBarChart,
  Film,
  Gauge,
  Goal,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  type LucideIcon,
  Package,
  Plug,
  Settings,
  Store,
  Tags,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wand2,
  Warehouse,
  Youtube,
} from 'lucide-react'

export type WorkspaceId = 'monitor' | 'seller' | 'content' | 'finance'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

export interface Workspace {
  id: WorkspaceId
  label: string
  short: string
  description: string
  href: string
  icon: LucideIcon
  accent: string
  items: NavItem[]
}

export const workspaces: Workspace[] = [
  {
    id: 'monitor',
    label: 'Agent Monitor',
    short: 'Monitor',
    description: 'Nuanscape AI sebagai head agent memantau seluruh aktivitas',
    href: '/app/monitor',
    icon: LayoutDashboard,
    accent: '#F5D64B',
    items: [
      { label: 'Agent Monitor', href: '/app/monitor', icon: LayoutDashboard },
      { label: 'Automations', href: '/app/automations', icon: Blocks },
      { label: 'Notifications', href: '/app/notifications', icon: Bell },
      { label: 'Settings', href: '/app/settings', icon: Settings },
    ],
  },
  {
    id: 'seller',
    label: 'Seller Center',
    short: 'Seller',
    description: 'Marketplace, inventory, dan profit oleh Seller Agent',
    href: '/app/seller/overview',
    icon: Store,
    accent: '#F0512B',
    items: [
      { label: 'Overview', href: '/app/seller/overview', icon: Gauge },
      { label: 'Marketplaces', href: '/app/seller/marketplaces', icon: Plug },
      { label: 'Products', href: '/app/seller/products', icon: Package },
      { label: 'Inventory', href: '/app/seller/inventory', icon: Warehouse },
      { label: 'Orders', href: '/app/seller/orders', icon: ClipboardList },
      { label: 'Finance', href: '/app/seller/finance', icon: CircleDollarSign },
      { label: 'SEO & GEO', href: '/app/seller/seo', icon: Tags },
      { label: 'Seller Intelligence', href: '/app/seller/intelligence', icon: Bot },
    ],
  },
  {
    id: 'content',
    label: 'Content Production',
    short: 'Content',
    description: 'Riset, produksi, dan distribusi konten oleh Content Agent',
    href: '/app/content/overview',
    icon: Film,
    accent: '#24C7C4',
    items: [
      { label: 'Overview', href: '/app/content/overview', icon: Activity },
      { label: 'Accounts', href: '/app/content/accounts', icon: Users },
      { label: 'Long-form', href: '/app/content/long-form', icon: Youtube },
      { label: 'Short-form', href: '/app/content/short-form', icon: Clapperboard },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    short: 'Finance',
    description: 'Personal financial intelligence oleh Finance Agent',
    href: '/app/finance/overview',
    icon: Wallet,
    accent: '#F58FD9',
    items: [
      { label: 'Overview', href: '/app/finance/overview', icon: Gauge },
      { label: 'Transactions', href: '/app/finance/transactions', icon: ListOrdered },
      { label: 'Income', href: '/app/finance/income', icon: TrendingUp },
      { label: 'Expenses', href: '/app/finance/expenses', icon: CircleDollarSign },
      { label: 'Budgets', href: '/app/finance/budgets', icon: Target },
      { label: 'Assets', href: '/app/finance/assets', icon: Boxes },
      { label: 'Goals', href: '/app/finance/goals', icon: Goal },
      { label: 'Reports', href: '/app/finance/reports', icon: FileBarChart },
    ],
  },
]

export const extraNavigation: NavItem[] = [
  { label: 'Profile', href: '/app/profile', icon: Compass },
  { label: 'Automations', href: '/app/automations', icon: Wand2 },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

export const searchableRoutes = [
  ...workspaces.flatMap((w) =>
    w.items.map((item) => ({
      label: item.label,
      href: item.href,
      group: w.label,
      icon: item.icon,
      keywords: `${w.label} ${item.label}`.toLowerCase(),
    })),
  ),
  { label: 'Profile', href: '/app/profile', group: 'Account', icon: Compass, keywords: 'profile akun user' },
]

export function getWorkspaceForPath(pathname: string): Workspace {
  if (pathname.startsWith('/app/seller')) return workspaces.find((w) => w.id === 'seller')!
  if (pathname.startsWith('/app/content')) return workspaces.find((w) => w.id === 'content')!
  if (pathname.startsWith('/app/finance')) return workspaces.find((w) => w.id === 'finance')!
  return workspaces.find((w) => w.id === 'monitor')!
}

export function getCurrentNavItem(pathname: string): NavItem | undefined {
  const workspace = getWorkspaceForPath(pathname)
  const allItems = [...workspaces.flatMap((w) => w.items), ...extraNavigation]
  return (
    allItems.find(
      (item) => pathname === item.href || (item.href !== '/app/monitor' && pathname.startsWith(item.href)),
    ) ?? workspace.items[0]
  )
}

export const quickActions = [
  { label: 'Buka Agent Monitor', href: '/app/monitor', icon: LayoutDashboard },
  { label: 'Tambah produk seller', href: '/app/seller/products?new=1', icon: Package },
  { label: 'Generate ide konten', href: '/app/content/short-form/ideas', icon: Lightbulb },
  { label: 'Tambah transaksi', href: '/app/finance/transactions?new=1', icon: Wallet },
]
