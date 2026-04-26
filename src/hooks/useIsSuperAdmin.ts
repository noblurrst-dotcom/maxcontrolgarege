import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { SUPER_ADMIN_IDS } from '../pages/AdminSuporte'

/**
 * Verifica se o usuário logado é superadmin.
 * Consulta a tabela `superadmins` via RPC (SECURITY DEFINER).
 * Fallback para SUPER_ADMIN_IDS caso o RPC falhe (migration não aplicada ainda).
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const lastCheckedUid = useRef<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) {
      setIsSuperAdmin(false)
      setChecked(!authLoading)
      return
    }

    // Evitar re-check se já verificamos este uid
    if (lastCheckedUid.current === user.id && checked) return

    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('admin_is_superadmin', { uid: user.id })
        if (cancelled) return
        if (error) throw error
        setIsSuperAdmin(!!data)
      } catch {
        // Fallback para lista local se RPC falhar
        if (!cancelled) {
          setIsSuperAdmin(SUPER_ADMIN_IDS.includes(user.id))
        }
      } finally {
        if (!cancelled) {
          lastCheckedUid.current = user.id
          setChecked(true)
        }
      }
    })()

    return () => { cancelled = true }
  }, [user, authLoading])

  return { isSuperAdmin, loading: authLoading || !checked }
}
