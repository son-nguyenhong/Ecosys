/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vib: {
          blue:  '#003087',
          red:   '#E31837',
          gray:  '#F5F5F5',
        },
      },
    },
  },
  plugins: [],
}
