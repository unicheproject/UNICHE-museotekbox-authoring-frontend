import { cva, type VariantProps } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'

/**
 * Inline feedback banner. Tinted fills rather than saturated ones, matching the styleguide's
 * badge treatment — an alert should read as a note on the surface, not as a second CTA.
 */
export const alertVariants = cva('flex items-start gap-2.5 rounded-md border px-3.5 py-3', {
  variants: {
    variant: {
      success: 'border-success/25 bg-success/10 text-success',
      error: 'border-destructive/25 bg-destructive/10 text-destructive',
      warning: 'border-warning/25 bg-warning/10 text-warning',
      info: 'border-info/25 bg-info/10 text-info',
    },
  },
  defaultVariants: { variant: 'info' },
})

export type AlertVariants = VariantProps<typeof alertVariants>
