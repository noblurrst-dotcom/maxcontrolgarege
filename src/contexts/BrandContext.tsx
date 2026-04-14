import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import type { BrandConfig } from '../types'

const DEFAULT_BRAND: BrandConfig = {
  nome_usuario: '',
  nome_empresa: 'Estética Automotiva',
  slogan: '',
  cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  logo_url: '',
  cor_primaria: '#CFFF04',
  cor_secundaria: '#0d0d1a',
  cor_texto: '#1a1a2e',
  pdf_rodape: 'Obrigado pela preferência!',
  pdf_termos: 'Orçamento válido por 15 dias. Valores sujeitos a alteração.',
  pdf_mostrar_logo: true,
  pdf_mostrar_dados: true,
}

const STORAGE_KEY = 'brand_config'

// --- Color palette generation ---
function hexToHsl(hex: string): [number, number, number] {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generatePalette(hex: string): Record<string, string> {
  const [h, s] = hexToHsl(hex)
  return {
    50:  hslToHex(h, Math.min(s, 100), 95),
    100: hslToHex(h, Math.min(s, 100), 90),
    200: hslToHex(h, Math.min(s, 100), 80),
    300: hslToHex(h, Math.min(s, 100), 70),
    400: hslToHex(h, Math.min(s, 100), 60),
    500: hex,
    600: hslToHex(h, Math.min(s, 100), 42),
    700: hslToHex(h, Math.min(s, 100), 34),
    800: hslToHex(h, Math.min(s, 100), 26),
    900: hslToHex(h, Math.min(s, 100), 18),
  }
}

function applyBrandColors(primary: string, secondary: string) {
  const root = document.documentElement
  const palette = generatePalette(primary)
  Object.entries(palette).forEach(([shade, color]) => {
    root.style.setProperty(`--color-primary-${shade}`, color)
  })
  const [sh, ss] = hexToHsl(secondary)
  root.style.setProperty('--color-dark-800', hslToHex(sh, ss, 14))
  root.style.setProperty('--color-dark-900', hslToHex(sh, ss, 7))
}

// Apply saved colors immediately at module load (before React mounts)
try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    if (parsed.cor_primaria || parsed.cor_secundaria) {
      applyBrandColors(
        parsed.cor_primaria || DEFAULT_BRAND.cor_primaria,
        parsed.cor_secundaria || DEFAULT_BRAND.cor_secundaria
      )
    }
  }
} catch { /* ignore */ }

// --- Context ---
interface BrandContextType {
  brand: BrandConfig
  updateBrand: (b: Partial<BrandConfig>) => void
  resetBrand: () => void
}

const BrandContext = createContext<BrandContextType>({
  brand: DEFAULT_BRAND,
  updateBrand: () => {},
  resetBrand: () => {},
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_BRAND, ...JSON.parse(saved) } : DEFAULT_BRAND
    } catch {
      return DEFAULT_BRAND
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brand))
  }, [brand])

  // Apply colors synchronously before browser paint
  useLayoutEffect(() => {
    applyBrandColors(brand.cor_primaria, brand.cor_secundaria)
  }, [brand.cor_primaria, brand.cor_secundaria])

  const updateBrand = (partial: Partial<BrandConfig>) => {
    setBrand((prev) => ({ ...prev, ...partial }))
  }

  const resetBrand = () => setBrand(DEFAULT_BRAND)

  return (
    <BrandContext.Provider value={{ brand, updateBrand, resetBrand }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}
