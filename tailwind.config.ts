import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0d0f',
          900: '#111418',
          850: '#15191f',
          800: '#1a1f26',
          750: '#1f252d',
          700: '#252c36',
          line: '#2a313c'
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857'
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626'
        },
        // Desktop-matched Ink & Obsidian dark terminal surfaces
        obsidian: {
          950: '#0a0d0f',
          900: '#111418',
          850: '#15191f',
          800: '#1a1f26',
          750: '#1f252d',
          700: '#252c36',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(16, 185, 129, 0.16)'
        },
        // High-contrast text scale for dark terminal
        stone: {
          100: '#F8FAFC',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          800: '#1E293B'
        },
        gold: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          muted: '#d97706',
          dark: '#b45309',
          glow: 'rgba(245, 158, 11, 0.25)'
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
          glow: 'rgba(16, 185, 129, 0.3)'
        },
        amber: {
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          glow: 'rgba(245, 158, 11, 0.20)'
        },
        indigo: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669'
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
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'luxury': '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'vault': '0 25px 70px -10px rgba(0, 0, 0, 0.6), 0 0 40px -12px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow-gold': '0 0 30px -6px rgba(16, 185, 129, 0.35)',
        'glow-burgundy': '0 0 30px -6px rgba(220, 38, 38, 0.28)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 30px -6px rgba(245, 158, 11, 0.25)',
        'glow-indigo': '0 0 35px -5px rgba(16, 185, 129, 0.25)'
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'morph': 'morph 18s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease-in-out infinite',
        'float-x': 'float-x 14s ease-in-out infinite',
        'stagger-1': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards',
        'stagger-2': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.22s forwards',
        'stagger-3': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.34s forwards',
        'stagger-4': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.46s forwards',
        'stagger-5': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.58s forwards',
        'stagger-6': 'stagger-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards'
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
        },
        morph: {
          '0%': { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
          '25%': { transform: 'translate(30px, -40px) scale(1.12) rotate(2deg)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.92) rotate(-1deg)' },
          '75%': { transform: 'translate(40px, 10px) scale(1.06) rotate(1.5deg)' },
          '100%': { transform: 'translate(0, 0) scale(1) rotate(0deg)' }
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        'float-x': {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '33%': { transform: 'translateX(20px) translateY(-10px)' },
          '66%': { transform: 'translateX(-15px) translateY(8px)' }
        },
        'stagger-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        }
      }
    }
  },
  plugins: []
} satisfies Config
