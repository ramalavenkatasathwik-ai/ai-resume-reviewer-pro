/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0B0B0E',
        charcoal: {
          DEFAULT: '#141419',
          elevated: '#1C1C23',
          light: '#24242E',
          border: '#303038',
          subtle: '#22222B',
        },
        crimson: {
          DEFAULT: '#C91432',
          hover: '#A30D26',
          dark: '#7D0A1D',
          light: '#E51739',
        },
        'bright-red': {
          DEFAULT: '#F04452',
          hover: '#FA5866',
        },
        'electric-orange': {
          DEFAULT: '#FF7417',
          soft: '#FF9B45',
          light: '#FFAA6B',
          dark: '#E05E09',
        },
        'text-primary': '#F7F7FA',
        'text-secondary': '#A1A1AA',
        'border-default': '#303038',
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(201, 20, 50, 0.35)',
        'glow-orange': '0 0 20px rgba(255, 116, 23, 0.35)',
        'card-subtle': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
