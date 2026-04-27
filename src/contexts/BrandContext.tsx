import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import type { BrandConfig } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import {
  generatePalette,
  getReadableTextColor,
  contrastRatio,
  adjustForContrast,
  isLight,
  lightenColor,
  darkenColor,
  mixColors,
  normalizeHex,
} from '../lib/color'

const DEFAULT_BRAND: BrandConfig = {
  nome_usuario: '',
  nome_empresa: '',
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

/**
 * Aplica as cores de marca no :root.
 * Deriva: paleta primary/secondary, on-primary/on-secondary (contraste
 * automático), estados hover/active/disabled, contrast-ajustado vs surface.
 * Reage ao modo (dark/light) para escolher surface base.
 */
function applyBrandColors(primary: string, secondary: string, isDark = false) {
  const root = document.documentElement
  const pri = normalizeHex(primary)
  const sec = normalizeHex(secondary)

  // 1. Paletas 50-900
  const palettePri = generatePalette(pri)
  const paletteSec = generatePalette(sec)
  Object.entries(palettePri).forEach(([shade, color]) => {
    root.style.setProperty(`--color-primary-${shade}`, color)
  })
  Object.entries(paletteSec).forEach(([shade, color]) => {
    root.style.setProperty(`--color-secondary-${shade}`, color)
  })

  // 2. Texto contrastante automático
  const onPrimary = getReadableTextColor(pri, 4.5)
  const onSecondary = getReadableTextColor(sec, 4.5)
  // Se o melhor candidato (preto/branco) ainda não passa AA, ajusta iterativamente
  const onPrimaryFinal = contrastRatio(onPrimary, pri) >= 4.5
    ? onPrimary
    : adjustForContrast(onPrimary, pri, 4.5)
  const onSecondaryFinal = contrastRatio(onSecondary, sec) >= 4.5
    ? onSecondary
    : adjustForContrast(onSecondary, sec, 4.5)
  root.style.setProperty('--color-on-primary', onPrimaryFinal)
  root.style.setProperty('--color-on-secondary', onSecondaryFinal)

  // 3. Estados (hover/active/disabled)
  const priIsLight = isLight(pri)
  const hover = priIsLight ? darkenColor(pri, 8) : lightenColor(pri, 8)
  const active = priIsLight ? darkenColor(pri, 14) : lightenColor(pri, 14)
  const surfaceBase = isDark ? '#1a1a2e' : '#ffffff'
  const disabled = mixColors(pri, surfaceBase, 0.6)
  root.style.setProperty('--color-primary-hover', hover)
  root.style.setProperty('--color-primary-active', active)
  root.style.setProperty('--color-primary-disabled', disabled)

  // 4. Variantes contrastadas vs surface (se primary tem contraste fraco com surface,
  //    gera --color-primary-contrast ajustada)
  const surface1 = isDark ? '#1a1a2e' : '#ffffff'
  const priVsSurface = contrastRatio(pri, surface1)
  const priContrast = priVsSurface >= 3 ? pri : adjustForContrast(pri, surface1, 3)
  root.style.setProperty('--color-primary-contrast', priContrast)

  const secVsSurface = contrastRatio(sec, surface1)
  const secContrast = secVsSurface >= 3 ? sec : adjustForContrast(sec, surface1, 3)
  root.style.setProperty('--color-secondary-contrast', secContrast)

  // 5. Legacy aliases (mantidos para compat com classes existentes que ainda usam dark-*)
  root.style.setProperty('--color-dark-800', paletteSec['600'])
  root.style.setProperty('--color-dark-900', paletteSec['700'])
}

// Apply saved colors immediately at module load (before React mounts)
try {
  const saved = localStorage.getItem(STORAGE_KEY)
  const isDarkInitial = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  if (saved) {
    const parsed = JSON.parse(saved)
    if (parsed.cor_primaria || parsed.cor_secundaria) {
      applyBrandColors(
        parsed.cor_primaria || DEFAULT_BRAND.cor_primaria,
        parsed.cor_secundaria || DEFAULT_BRAND.cor_secundaria,
        isDarkInitial
      )
    }
  } else {
    applyBrandColors(DEFAULT_BRAND.cor_primaria, DEFAULT_BRAND.cor_secundaria, isDarkInitial)
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
  const { user } = useAuth()
  const [brand, setBrand] = useState<BrandConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_BRAND, ...JSON.parse(saved) } : DEFAULT_BRAND
    } catch {
      return DEFAULT_BRAND
    }
  })

  // Load from Supabase on auth
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: row, error } = await supabase.from('brand_config').select('*').eq('user_id', user.id).single()
        if (cancelled) return
        if (row && !error) {
          const { user_id, updated_at, ...rest } = row
          const cloudBrand = { ...DEFAULT_BRAND, ...rest } as BrandConfig
          setBrand(cloudBrand)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudBrand))
          applyBrandColors(
            cloudBrand.cor_primaria,
            cloudBrand.cor_secundaria,
            document.documentElement.classList.contains('dark')
          )
        } else {
          // No cloud data — push local up
          const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          if (local.nome_empresa) {
            await supabase.from('brand_config').upsert({ ...local, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          }
        }
      } catch (err) {
        console.warn('[BrandSync] Erro:', err)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // Save to localStorage + Supabase
  const syncToCloud = useCallback(async (b: BrandConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b))
    if (user && isSupabaseConfigured) {
      await supabase.from('brand_config').upsert({ ...b, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.warn('[BrandSync] Erro ao salvar:', error.message)
      })
    }
  }, [user])

  useEffect(() => {
    syncToCloud(brand)
  }, [brand]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply colors synchronously before browser paint.
  // Reage também a mudanças no class `dark` do <html>.
  useLayoutEffect(() => {
    const apply = () => applyBrandColors(
      brand.cor_primaria,
      brand.cor_secundaria,
      document.documentElement.classList.contains('dark')
    )
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
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
