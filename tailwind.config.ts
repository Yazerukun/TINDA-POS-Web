import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light surfaces. `obsidian-950` is the page background, so the numeric
        // scale reads light-to-dark instead of dark-to-light.
        obsidian: {
          950: '#FFFFFF',
          900: '#F8FAFC',
          850: '#F1F5F9',
          800: '#E2E8F0',
          750: '#CBD5E1',
          700: '#94A3B8',
          border: 'rgba(15, 23, 42, 0.10)',
          glow: 'rgba(37, 99, 235, 0.06)'
        },
        // Text scale inverted for a light background: stone-100 is now the
        // darkest ink, stone-600 the lightest. Existing `text-stone-*` usages
        // keep their relative emphasis.
        stone: {
          100: '#0F172A',
          200: '#1E293B',
          300: '#334155',
          400: '#475569',
          500: '#64748B',
          600: '#94A3B8',
          800: '#CBD5E1'
        },
        gold: {
          DEFAULT: '#2563EB',
          light: '#93C5FD',
          muted: '#3B82F6',
          dark: '#1E40AF',
          glow: 'rgba(37, 99, 235, 0.16)'
        },
        burgundy: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          deep: '#991B1B',
          glow: 'rgba(220, 38, 38, 0.20)'
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          glow: 'rgba(16, 185, 129, 0.2)'
        },
        amber: {
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          glow: 'rgba(37, 99, 235, 0.18)'
        },
        indigo: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB'
        },
        rose: {
          400: '#F87171',
          500: '#DC2626',
          600: '#B91C1C'
        }
      },
      fontSize: {
        // Replaces the 9-11px labels that were unreadable at a POS terminal.
        '2xs': ['0.75rem', { lineHeight: '1rem' }],
        xs: ['0.875rem', { lineHeight: '1.25rem' }]
      },
      fontFamily: {
        serif: ['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        'luxury': '0 20px 50px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        'vault': '0 25px 70px -10px rgba(15, 23, 42, 0.18), 0 0 40px -12px rgba(37, 99, 235, 0.20), 0 0 0 1px rgba(15, 23, 42, 0.07)',
        'glow-gold': '0 0 30px -6px rgba(37, 99, 235, 0.30)',
        'glow-burgundy': '0 0 30px -6px rgba(220, 38, 38, 0.28)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 30px -6px rgba(37, 99, 235, 0.25)',
        'glow-indigo': '0 0 35px -5px rgba(59, 130, 246, 0.25)'
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
} satisfies Config
