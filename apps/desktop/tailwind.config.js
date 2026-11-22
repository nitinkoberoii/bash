/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#181818',
          card: 'rgba(24, 24, 24, 0.88)',
          inner: 'rgba(18, 18, 18, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#ededed',
          muted: '#9a9a9a',
          dim: '#555555',
        },
        hud: {
          bg: 'rgba(24, 24, 24, 0.88)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#ededed',
          muted: '#9a9a9a',
          accent: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};
