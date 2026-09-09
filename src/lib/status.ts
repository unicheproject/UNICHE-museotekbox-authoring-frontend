import type { BadgeVariants } from '@/components/ui/badge'

/**
 * Map a Catalogue project status onto a badge colour. The backend does not publish the status
 * enum, so unknown values degrade to the neutral badge rather than being hidden.
 */
export function statusVariant(status: string | undefined): BadgeVariants['variant'] {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'published':
      return 'success'
    case 'draft':
    case 'pending':
      return 'warning'
    case 'deleted':
    case 'suspended':
      return 'error'
    default:
      return 'neutral'
  }
}
