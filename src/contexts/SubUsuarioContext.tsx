import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { SubUsuario, ModuloId, ModuloPermissao } from '../types'
import { safeGetStorage, safeSetStorage } from '../lib/utils'

interface SubUsuarioContextType {
  subUsuarios: SubUsuario[]
  subUsuarioAtivo: SubUsuario | null
  isOwner: boolean
  salvarSubUsuarios: (items: SubUsuario[]) => void
  loginSubUsuario: (email: string, senha: string) => SubUsuario | null
  logoutSubUsuario: () => void
  podeVer: (modulo: ModuloId) => boolean
  podeEditar: (modulo: ModuloId) => boolean
}

const SubUsuarioContext = createContext<SubUsuarioContextType | undefined>(undefined)

function getDefaultPermissoes(role: SubUsuario['role']): ModuloPermissao[] {
  const modulos: ModuloId[] = ['dashboard', 'vendas', 'agenda', 'clientes', 'checklists', 'financeiro', 'servicos', 'configuracoes', 'usuarios']
  switch (role) {
    case 'admin':
      return modulos.map(m => ({ modulo: m, ver: true, editar: true }))
    case 'gerente':
      return modulos.map(m => ({ modulo: m, ver: true, editar: m !== 'usuarios' && m !== 'configuracoes' }))
    case 'operador':
      return modulos.map(m => ({
        modulo: m,
        ver: ['dashboard', 'vendas', 'agenda', 'clientes', 'checklists', 'servicos'].includes(m),
        editar: ['vendas', 'agenda', 'clientes', 'checklists'].includes(m),
      }))
    case 'visualizador':
      return modulos.map(m => ({ modulo: m, ver: ['dashboard', 'vendas', 'agenda', 'clientes'].includes(m), editar: false }))
    default:
      return modulos.map(m => ({ modulo: m, ver: false, editar: false }))
  }
}

export { getDefaultPermissoes }

export function SubUsuarioProvider({ children }: { children: ReactNode }) {
  const [subUsuarios, setSubUsuarios] = useState<SubUsuario[]>(() =>
    safeGetStorage<SubUsuario[]>('sub_usuarios', [])
  )
  const [subUsuarioAtivo, setSubUsuarioAtivo] = useState<SubUsuario | null>(() =>
    safeGetStorage<SubUsuario | null>('sub_usuario_ativo', null)
  )

  const isOwner = !subUsuarioAtivo

  const salvarSubUsuarios = useCallback((items: SubUsuario[]) => {
    setSubUsuarios(items)
    safeSetStorage('sub_usuarios', items)
  }, [])

  const loginSubUsuario = useCallback((email: string, senha: string): SubUsuario | null => {
    const found = subUsuarios.find(s => s.email === email && s.senha === senha && s.ativo)
    if (found) {
      setSubUsuarioAtivo(found)
      safeSetStorage('sub_usuario_ativo', found)
      return found
    }
    return null
  }, [subUsuarios])

  const logoutSubUsuario = useCallback(() => {
    setSubUsuarioAtivo(null)
    safeSetStorage('sub_usuario_ativo', null)
  }, [])

  const podeVer = useCallback((modulo: ModuloId): boolean => {
    if (isOwner) return true
    if (!subUsuarioAtivo) return false
    const perm = subUsuarioAtivo.permissoes.find(p => p.modulo === modulo)
    return perm?.ver ?? false
  }, [isOwner, subUsuarioAtivo])

  const podeEditar = useCallback((modulo: ModuloId): boolean => {
    if (isOwner) return true
    if (!subUsuarioAtivo) return false
    const perm = subUsuarioAtivo.permissoes.find(p => p.modulo === modulo)
    return perm?.editar ?? false
  }, [isOwner, subUsuarioAtivo])

  // Sync active sub-user with latest data
  useEffect(() => {
    if (subUsuarioAtivo) {
      const updated = subUsuarios.find(s => s.id === subUsuarioAtivo.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(subUsuarioAtivo)) {
        setSubUsuarioAtivo(updated)
        safeSetStorage('sub_usuario_ativo', updated)
      }
      if (!updated || !updated.ativo) {
        logoutSubUsuario()
      }
    }
  }, [subUsuarios]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SubUsuarioContext.Provider value={{
      subUsuarios,
      subUsuarioAtivo,
      isOwner,
      salvarSubUsuarios,
      loginSubUsuario,
      logoutSubUsuario,
      podeVer,
      podeEditar,
    }}>
      {children}
    </SubUsuarioContext.Provider>
  )
}

export function useSubUsuario() {
  const context = useContext(SubUsuarioContext)
  if (!context) throw new Error('useSubUsuario deve ser usado dentro de SubUsuarioProvider')
  return context
}
