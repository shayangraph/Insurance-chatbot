/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0c1322',
          surface: '#191f2f',
          accent: '#2563eb',
        }
      }
    },
  },
  plugins: [],
}
