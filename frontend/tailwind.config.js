/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        dusky: {
          50: '#FBFBFA',
          100: '#F7F7F6',
          200: '#ECECEB',
          300: '#E0E0DE',
          400: '#C5C5C2',
          500: '#8C8C89',
          600: '#5A5A58',
          700: '#383836',
          800: '#222220',
          900: '#141413',
          950: '#0A0A0A',
        },
        brand: {
          50: '#f4f5f7',
          100: '#e5e7eb',
          200: '#d1d5db',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#374151',
          600: '#1f2937',
          700: '#111827',
          800: '#0f172a',
          900: '#030712',
        }
      }
    },
  },
  plugins: [],
}

