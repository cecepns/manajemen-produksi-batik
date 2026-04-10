/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        batik: {
          ink: '#1a1a2e',
          indigo: '#16213e',
          teal: '#0f3460',
          gold: '#e8b86d',
          cream: '#faf3e0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
