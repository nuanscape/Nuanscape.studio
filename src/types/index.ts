export type Trend = 'up' | 'down' | 'flat'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  date: string
  account: 'Personal' | 'Business' | 'Marketplace'
  recurring: 'none' | 'monthly' | 'weekly'
  source?: string
  note?: string
}

export interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  icon?: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  deadline: string
  color: string
}

export interface AssetItem {
  id: string
  name: string
  type: 'Cash' | 'Bank' | 'Investment' | 'Business' | 'Inventory'
  value: number
  note?: string
}

export interface LiabilityItem {
  id: string
  name: string
  type: 'Debt' | 'Obligation'
  value: number
  dueDate: string
}

export type ContentStatus =
  | 'Researching'
  | 'Idea'
  | 'Approved'
  | 'Script Ready'
  | 'Production'
  | 'Editing'
  | 'Review'
  | 'Draft'
  | 'Ready to Publish'
  | 'Published'
  | 'Failed'

export type Platform = 'YouTube' | 'TikTok' | 'Instagram'

export type ContentFormat = 'long' | 'short'

export interface PlatformAccount {
  id: string
  platform: Platform
  format: ContentFormat
  name: string
  handle: string
  niche: string
  followers: number
  posts30d: number
  views30d: number
  engagement: number
  avgWatchMinutes: number
  completionRate: number
  status: 'Active' | 'Growing' | 'Paused'
  lastSync: string
  linked?: boolean
}

export interface ContentItem {
  id: string
  title: string
  platform: Platform
  accountId?: string
  niche: string
  format: string
  status: ContentStatus
  scheduledAt: string
  views: number
  engagement: number
  script?: string
  thumbnail?: string
  previewUrl?: string
  videoUrl?: string
  caption?: string
  thumbnailStyle?: string
  animationStyle?: string
  musicStyle?: string
  hashtags?: string[]
  generated?: boolean
  sourceIdeaId?: string
  createdAt: string
}

export interface ContentIdea {
  id: string
  title: string
  hook: string
  platform: Platform
  accountId?: string
  niche: string
  angle: string
  format: string
  score: number
  approved?: boolean
  rejected?: boolean
}

export interface LibraryAsset {
  id: string
  name: string
  type: 'Video' | 'Image' | 'Thumbnail' | 'Script' | 'Caption'
  platform: Platform
  accountId?: string
  size: string
  createdAt: string
  contentId?: string
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  sold: number
  marketplace: 'TikTok Shop' | 'Shopee' | 'Both'
  accountIds?: string[]
  discountPct?: number
  seoScore: number
  geoScore: number
  status: 'Active' | 'Paused' | 'Out of Stock'
  createdAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  type: 'in' | 'out' | 'damaged' | 'reserved'
  qty: number
  note: string
  date: string
}

export interface Order {
  id: string
  customer: string
  product: string
  qty: number
  total: number
  status: 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled' | 'Returned'
  marketplace: 'TikTok Shop' | 'Shopee'
  accountId: string
  date: string
}

export interface MarketplaceConnection {
  id: string
  name: 'TikTok Shop' | 'Shopee'
  storeName: string
  status: 'connected' | 'disconnected' | 'syncing' | 'error'
  lastSync: string
  permissions: string[]
  note?: string
}

export type PromoStatus = 'active' | 'paused' | 'scheduled' | 'ended'

export interface Voucher {
  id: string
  code: string
  title: string
  accountId: string
  marketplace: 'TikTok Shop' | 'Shopee'
  kind: 'percent' | 'fixed' | 'shipping'
  value: number
  minSpend: number
  quota: number
  used: number
  startDate: string
  endDate: string
  status: PromoStatus
}

export interface FlashSale {
  id: string
  title: string
  accountId: string
  marketplace: 'TikTok Shop' | 'Shopee'
  productId: string
  discountPct: number
  quota: number
  sold: number
  startDate: string
  endDate: string
  status: PromoStatus
}

export interface AdCampaign {
  id: string
  name: string
  accountId: string
  marketplace: 'TikTok Shop' | 'Shopee'
  objective: 'Sales' | 'Traffic' | 'Live'
  budget: number
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  startDate: string
  endDate: string
  status: PromoStatus
}

export type LedgerType =
  | 'income'
  | 'discount'
  | 'refund'
  | 'platform_fee'
  | 'affiliate_fee'
  | 'shipping'
  | 'cogs'
  | 'ads'
  | 'opex'

export interface LedgerEntry {
  id: string
  date: string
  accountId: string
  marketplace: 'TikTok Shop' | 'Shopee'
  type: LedgerType
  label: string
  detail?: string
  amount: number
  productId?: string
  ref?: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'finance' | 'content' | 'shop' | 'system' | 'ai'
  time: string
  read: boolean
  href?: string
}

export interface Automation {
  id: string
  name: string
  module: 'Finance' | 'Content' | 'Shop'
  description: string
  status: 'active' | 'paused' | 'needs_approval'
  trigger: string
  lastRun: string
  runs: number
  successRate: number
  steps: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  context?: string
  pendingAction?: {
    label: string
    description: string
  }
}

export interface FinanceSeriesPoint {
  label: string
  income: number
  expense: number
  net: number
}

export interface AIInsight {
  id: string
  title: string
  detail: string
  why: string
  tone: 'positive' | 'warning' | 'neutral' | 'danger'
  action?: string
}
