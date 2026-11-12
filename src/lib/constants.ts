import type { ContentStatus } from '@/types'

export const CONTENT_STATUSES: ContentStatus[] = [
  'Researching',
  'Idea',
  'Approved',
  'Script Ready',
  'Production',
  'Editing',
  'Review',
  'Draft',
  'Ready to Publish',
  'Published',
  'Failed',
]

export const statusTone: Record<ContentStatus, string> = {
  Researching: 'text-[#6DBBFF] bg-[#6DBBFF]/10 border-[#6DBBFF]/25',
  Idea: 'text-[#B4B4B4] bg-white/5 border-white/10',
  Approved: 'text-[#FFE9A3] bg-[#FFE9A3]/10 border-[#FFE9A3]/25',
  'Script Ready': 'text-[#F5D64B] bg-[#F5D64B]/10 border-[#F5D64B]/25',
  Production: 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/25',
  Editing: 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/25',
  Review: 'text-[#6DBBFF] bg-[#6DBBFF]/10 border-[#6DBBFF]/25',
  Draft: 'text-[#B4B4B4] bg-white/5 border-white/10',
  'Ready to Publish': 'text-[#F5D64B] bg-[#F5D64B]/15 border-[#F5D64B]/35',
  Published: 'text-[#F5D64B] bg-[#F5D64B]/10 border-[#F5D64B]/25',
  Failed: 'text-[#F0512B] bg-[#F0512B]/10 border-[#F0512B]/25',
}

export const platformMeta = {
  YouTube: { color: '#F0512B', bg: 'bg-[#F0512B]/10', text: 'text-[#F0512B]', short: 'YT' },
  TikTok: { color: '#F5D64B', bg: 'bg-[#F5D64B]/10', text: 'text-[#F5D64B]', short: 'TT' },
  Instagram: { color: '#6DBBFF', bg: 'bg-[#6DBBFF]/10', text: 'text-[#6DBBFF]', short: 'IG' },
} as const

export const orderStatusTone: Record<string, string> = {
  Pending: 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/25',
  Processing: 'text-[#6DBBFF] bg-[#6DBBFF]/10 border-[#6DBBFF]/25',
  Shipped: 'text-[#FFE9A3] bg-[#FFE9A3]/10 border-[#FFE9A3]/25',
  Completed: 'text-[#F5D64B] bg-[#F5D64B]/10 border-[#F5D64B]/25',
  Cancelled: 'text-[#B4B4B4] bg-white/5 border-white/10',
  Returned: 'text-[#F0512B] bg-[#F0512B]/10 border-[#F0512B]/25',
}

export const automationTone: Record<string, string> = {
  active: 'text-[#F5D64B] bg-[#F5D64B]/10 border-[#F5D64B]/25',
  paused: 'text-[#B4B4B4] bg-white/5 border-white/10',
  needs_approval: 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/25',
}
