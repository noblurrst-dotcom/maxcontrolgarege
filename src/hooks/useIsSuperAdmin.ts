import { useAuth } from '../contexts/AuthContext'
import { SUPER_ADMIN_IDS } from '../pages/AdminSuporte'

/**
 * Verifica se o usuário logado é superadmin.
 * Na entrega 2 será migrado para consultar a tabela `superadmins` via RPC.
 * A interface do hook permanecerá idêntica.
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; loading: boolean } {
  const { user, loading } = useAuth()
  if (loading) return { isSuperAdmin: false, loading: true }
  const isSuperAdmin = !!user && SUPER_ADMIN_IDS.includes(user.id)
  return { isSuperAdmin, loading: false }
}
