import type { Config } from 'tailwindcss'

// shadcn-vue token theme (CSS variables defined in src/assets/globals.css).
// The variable VALUES come from the UNICHE Design Styleguide (styleguide_v2.html) so that the
// stock shadcn components render in the platform's visual language without being forked.
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        // Montserrat is the styleguide's only typeface; loaded in index.html.
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Styleguide brand palette. `deep` is the workhorse (CTAs, active nav, stat values);
        // `pink`/`cyan` exist for the logo gradient and hover accents only — see the styleguide's
        // "Color Usage Hierarchy" section.
        brand: {
          deep: 'hsl(var(--brand-deep))',
          purple: 'hsl(var(--brand-purple))',
          pink: 'hsl(var(--brand-pink))',
          cyan: 'hsl(var(--brand-cyan))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          2: 'hsl(var(--surface-2))',
          dark: 'hsl(var(--surface-dark))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))',
      },
      backgroundImage: {
        // Reserved for the logo and the single primary CTA per screen.
        'grad-brand': 'linear-gradient(135deg, #f832a4 0%, #b05fd6 50%, #29f8fd 100%)',
        'grad-deco': 'linear-gradient(135deg, #ff80b5 0%, #9089fc 100%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: '999px',
      },
      boxShadow: {
        xs: '0 1px 3px rgba(0, 0, 0, 0.06)',
        sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
        md: '0 6px 20px rgba(0, 0, 0, 0.1)',
        lg: '0 16px 40px rgba(0, 0, 0, 0.12)',
        cta: '0 3px 16px rgba(176, 95, 214, 0.3)',
        'cta-hover': '0 6px 22px rgba(176, 95, 214, 0.4)',
      },
      letterSpacing: {
        overline: '0.1em',
        button: '0.06em',
      },
    },
  },
} satisfies Config
