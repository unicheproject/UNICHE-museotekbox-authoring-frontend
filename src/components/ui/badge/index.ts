import { cva, type VariantProps } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/** The styleguide's `.badge`: pill, uppercase, 10px/700, tinted rather than saturated fills. */
export const badgeVariants = cva(
  'inline-flex items-center gap-[5px] whitespace-nowrap rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em]',
  {
    variants: {
      variant: {
        neutral: 'border border-border bg-secondary text-secondary-foreground',
        purple: 'bg-brand-purple/[0.12] text-[#7b3fc4]',
        deep: 'bg-brand-deep text-white',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-destructive/10 text-destructive',
        gradient: 'bg-grad-brand text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
