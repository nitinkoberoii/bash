/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: 'rgba(15, 23, 42, 0.85)',
          border: 'rgba(51, 65, 85, 0.6)',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
};
