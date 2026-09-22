import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#050608',
          900: '#090b10',
          850: '#0e1118',
          800: '#141822',
          750: '#1b212f',
          700: '#232b3d',
          border: 'rgba(255, 255, 255, 0.05)',
          glow: 'rgba(212, 175, 55, 0.05)'
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E2C799',
          muted: '#C5A059',
          dark: '#8C6D23',
          glow: 'rgba(212, 175, 55, 0.22)'
        },
        burgundy: {
          DEFAULT: '#8B1E22',
          dark: '#5C1215',
          deep: '#3B0B0D',
          glow: 'rgba(139, 30, 34, 0.28)'
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          glow: 'rgba(16, 185, 129, 0.2)'
        },
        amber: {
          400: '#E2C799',
          500: '#D4AF37',
          600: '#C5A059',
          glow: 'rgba(212, 175, 55, 0.2)'
        },
        indigo: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5'
        },
        rose: {
          400: '#fb7185',
          500: '#8B1E22',
          600: '#5C1215'
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'luxury': '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'vault': '0 25px 70px -10px rgba(0, 0, 0, 0.95), 0 0 50px -10px rgba(212, 175, 55, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-gold': '0 0 35px -5px rgba(212, 175, 55, 0.28)',
        'glow-burgundy': '0 0 35px -5px rgba(139, 30, 34, 0.35)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 35px -5px rgba(212, 175, 55, 0.25)',
        'glow-indigo': '0 0 35px -5px rgba(99, 102, 241, 0.25)'
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
