import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * Button styling, shared so that non-`<button>` elements (e.g. RouterLink) can look like a button:
 *   <RouterLink :class="buttonVariants({ variant: 'outline' })">…</RouterLink>
 *
 * Shape and type follow the UNICHE styleguide's `.btn`: pill radius, uppercase Montserrat 700,
 * 0.06em tracking. Per the styleguide's colour hierarchy the brand GRADIENT is reserved for the
 * single main call-to-action on a screen (`variant="gradient"`); everything else uses the deep
 * indigo, an outline, or a muted fill.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-bold uppercase tracking-button transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring disabled:pointer-events-none disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none',
  {
    variants: {
      variant: {
        /** Deep indigo solid — the default action. */
        default: 'bg-brand-deep text-white shadow-xs hover:bg-[#3a1470] hover:-translate-y-px',
        /** Brand gradient — main CTA only, at most one per screen. */
        gradient:
          'bg-grad-brand text-white shadow-cta [text-shadow:0_1px_3px_rgba(76,29,139,0.45)] hover:-translate-y-px hover:shadow-cta-hover',
        outline: 'border-2 border-brand-deep bg-transparent text-brand-deep hover:bg-secondary',
        ghost: 'border-2 border-transparent bg-transparent text-brand-purple hover:bg-secondary',
        /** Muted — secondary actions inside content. */
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:border-brand-purple hover:text-brand-purple',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:-translate-y-px',
      },
      size: {
        default: 'px-7 py-3 text-xs',
        sm: 'px-[18px] py-2 text-[10px]',
        lg: 'px-10 py-4 text-[13px]',
        /** Square icon-only button — the one place the pill radius is dropped. */
        icon: 'h-10 w-10 rounded-sm p-0',
        'icon-round': 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
