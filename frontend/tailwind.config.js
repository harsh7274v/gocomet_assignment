/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc3fd',
          400: '#36a4fa',
          500: '#0c87eb',
          600: '#016bc9',
          700: '#0255a2',
          800: '#064885',
          900: '#0a3d6f',
        }
      }
    },
  },
  plugins: [],
}

