import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // Athletic dark palette with neon accent
        ink: {
          950: '#05070b',
          900: '#0a0d13',
          800: '#10141d',
          700: '#171b26',
          600: '#1f2533',
          500: '#2a3142',
          400: '#3a4256',
          300: '#525c74',
          200: '#8b94ad',
          100: '#c5cbdb',
        },
        accent: {
          DEFAULT: '#22e36a',
          50: '#e8fff1',
          100: '#c4ffd9',
          200: '#85f8ad',
          300: '#46ee84',
          400: '#22e36a',
          500: '#13c655',
          600: '#0aa044',
          700: '#077a35',
          800: '#055527',
          900: '#03361a',
        },
        danger: '#ff4f4f',
        warn: '#facc15',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Bebas Neue"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,227,106,.4), 0 8px 40px -10px rgba(34,227,106,.45)',
        card: '0 1px 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.6)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse at top, rgba(34,227,106,0.12), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
