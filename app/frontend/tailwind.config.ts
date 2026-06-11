import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: { DEFAULT: '#0a0b0d', raised: '#111216', subtle: '#16171c' },
        border: { DEFAULT: '#1f2024', strong: '#2a2c33' },
        fg: { DEFAULT: '#e6e7eb', dim: '#9aa0aa', faint: '#71727a' },
        accent: { DEFAULT: '#5b8def', muted: '#374a8a' },
        // Palo Alto Networks brand orange — used for marketing/demo surfaces.
        brand: { DEFAULT: '#fa582d', dim: '#c5431f', muted: '#5a2a1c' },
        success: '#22d36f',
        danger: '#ff5d6c',
        warn: '#ffaa44',
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(120% 140% at 0% 0%, rgba(250,88,45,0.16) 0%, rgba(91,141,239,0.10) 38%, rgba(10,11,13,0) 70%)',
        'brand-grad': 'linear-gradient(135deg, #fa582d 0%, #ff8a5b 100%)',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03), 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
