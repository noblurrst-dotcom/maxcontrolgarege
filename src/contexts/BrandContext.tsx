import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { BrandConfig } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DEFAULT_BRAND: BrandConfig = {
  nome_usuario: '',
  nome_empresa: '',
  slogan: '',
  cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  logo_url: '',
  pdf_rodape: 'Obrigado pela preferência!',
  pdf_termos: 'Orçamento válido por 15 dias. Valores sujeitos a alteração.',
  pdf_mostrar_logo: true,
  pdf_mostrar_dados: true,
}

const STORAGE_KEY = 'brand_config'

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
