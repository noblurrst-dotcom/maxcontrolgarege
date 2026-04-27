/** @type {import('tailwindcss').Config} */
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const tokenPalette = (name) =>
  Object.fromEntries(shades.map((s) => [s, `var(--color-${name}-${s})`]))

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca
        primary: {
          ...tokenPalette('primary'),
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          disabled: 'var(--color-primary-disabled)',
          contrast: 'var(--color-primary-contrast)',
        },
        secondary: {
          ...tokenPalette('secondary'),
          contrast: 'var(--color-secondary-contrast)',
        },
        // Semânticos (fixos)
        success: tokenPalette('success'),
        warning: tokenPalette('warning'),
        danger: tokenPalette('danger'),
        info: tokenPalette('info'),
        neutral: tokenPalette('neutral'),
        // Legacy (aliases mantidos por compat com classes existentes)
        dark: {
          800: 'var(--color-dark-800)',
          900: 'var(--color-dark-900)',
        },
      },
      textColor: {
        'on-primary': 'var(--color-on-primary)',
        'on-secondary': 'var(--color-on-secondary)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-muted': 'var(--color-on-surface-muted)',
      },
      backgroundColor: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
      },
      borderColor: {
        token: 'var(--color-border)',
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
