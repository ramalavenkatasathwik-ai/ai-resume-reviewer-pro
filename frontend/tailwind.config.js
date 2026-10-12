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
          light: '#1E1E26',
          border: '#282834',
          muted: '#3A3A4A',
        },
        crimson: {
          DEFAULT: '#C91432',
          dark: '#A00F27',
          light: '#E01B3C',
        },
        'bright-red': {
          DEFAULT: '#F04452',
          hover: '#FA5866',
        },
        'electric-orange': {
          DEFAULT: '#FF7417',
          light: '#FFA05C',
          dark: '#E05E09',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
}
