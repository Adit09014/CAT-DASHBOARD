/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0f18',
        panel: '#111827',
        steel: '#1f2937',
        line: '#263244',
        accent: '#f59e0b',
        good: '#16a34a',
        warn: '#f59e0b',
        danger: '#dc2626',
        info: '#3b82f6',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
