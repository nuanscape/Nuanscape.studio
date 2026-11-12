import type { ContentStatus, Platform } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusTone: Record<ContentStatus, 'default' | 'primary' | 'warning' | 'danger' | 'info' | 'outline'> = {
  Researching: 'outline',
  Idea: 'outline',
  Approved: 'info',
  'Script Ready': 'primary',
  Production: 'warning',
  Editing: 'warning',
  Review: 'info',
  Draft: 'outline',
  'Ready to Publish': 'primary',
  Published: 'primary',
  Failed: 'danger',
}

export function ContentStatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <Badge tone={statusTone[status]} className={className}>
      {status}
    </Badge>
  )
}

export const platformColor: Record<Platform, string> = {
  YouTube: '#F0512B',
  TikTok: '#F58FD9',
  Instagram: '#6DBBFF',
}

export function PlatformChip({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium text-text-secondary', className)}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: platformColor[platform] }} />
      {platform}
    </span>
  )
}

export const statusOrder: ContentStatus[] = [
  'Idea',
  'Researching',
  'Approved',
  'Script Ready',
  'Production',
  'Editing',
  'Review',
  'Ready to Publish',
  'Published',
]
