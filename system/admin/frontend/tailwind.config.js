/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        'main-bg': '#0B1120',
        'card-bg': '#1E293B',
        'border': '#334155',
        safe: '#10B981',
        warn: '#F59E0B',
        locked: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '8pt': '0.5rem', // 8px grid
        '16pt': '1rem',
        '24pt': '1.5rem',
        '32pt': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },

  plugins: [],
}