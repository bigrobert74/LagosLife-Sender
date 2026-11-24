/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080C14',
        surface: {
          DEFAULT: '#111827',
          hover: '#182235',
          border: '#1E293B',
          card: '#0F172A',
        },
        primary: {
          DEFAULT: '#00D084',
          hover: '#00B874',
          dark: '#059669',
        },
        accent: {
          gold: '#F59E0B',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          rose: '#F43F5E',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
