/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        dark: {
          800: 'var(--color-dark-800)',
          900: 'var(--color-dark-900)',
        },
      },
    },
  },
  safelist: [
    'col-span-1','col-span-2','col-span-3','col-span-4',
    'md:col-span-1','md:col-span-2','md:col-span-3','md:col-span-4',
    'row-span-1','row-span-2','row-span-3','row-span-4',
  ],
  plugins: [],
}
