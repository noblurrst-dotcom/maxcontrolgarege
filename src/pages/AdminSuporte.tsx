import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSupportView } from '../contexts/SupportViewContext'
import {
  Shield,
  Search,
  LogOut,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

import { SUPER_ADMIN_IDS } from '../lib/superAdmins'
export { SUPER_ADMIN_IDS }


export default function AdminSuporte() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { startSupportView } = useSupportView()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Verificar se é super admin
  const isSuperAdmin = user && SUPER_ADMIN_IDS.includes(user.id)

  // Se não estiver configurado ou não for admin, redireciona
  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/login')
    }
  }, [navigate])

  // Auto-validate code from URL param
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode && isSuperAdmin) {
      setCode(urlCode.toUpperCase())
      // Trigger validation after state is set
      setTimeout(() => {
        document.getElementById('btn-validate-code')?.click()
      }, 300)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const validateCode = async () => {
    if (!code.trim() || code.trim().length < 6) {
      setError('Código inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: row, error: dbError } = await supabase
        .from('support_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (dbError || !row) {
        setError('Código inválido, expirado ou já utilizado')
        return
      }

      // Marcar como usado
      await supabase.from('support_codes').update({ used: true }).eq('id', row.id)

      // Carregar dados do usuário e iniciar modo suporte
      await loadUserDataAndEnter(row.user_id, row.user_email, row.user_nome)
    } catch (err: any) {
      console.error('Erro ao validar código:', err)
      setError('Erro ao validar código')
    } finally {
      setLoading(false)
    }
  }

  const loadUserDataAndEnter = async (userId: string, email: string, nome: string) => {
    setLoading(true)
    try {
      const [vendas, agendamentos, clientes, financeiro, kanban, orcamentos, contasBancarias, brand] = await Promise.all([
        supabase.from('vendas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('agendamentos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('clientes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('financeiro').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('kanban_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('orcamentos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('contas_bancarias').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('brand_config').select('*').eq('user_id', userId).single(),
      ])

      startSupportView(userId, { email, nome }, {
        vendas: vendas.data || [],
        orcamentos: orcamentos.data || [],
        agendamentos: agendamentos.data || [],
        clientes: clientes.data || [],
        financeiro: financeiro.data || [],
        contas_bancarias: contasBancarias.data || [],
        kanban_items: kanban.data || [],
        brand_config: brand.data || null,
      })

      // Navigate to normal app in support mode
      navigate('/')
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-danger-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6">Esta página é exclusiva para administradores do sistema.</p>
          <div className="space-y-2">
            <button onClick={() => navigate('/')} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
              Voltar ao sistema
            </button>
            <button onClick={handleSignOut} className="w-full py-2.5 text-danger-500 text-sm font-medium">
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-warning-400" />
              <span className="text-sm font-bold">Painel de Suporte</span>
            </div>
            <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-white transition-colors" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-warning-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Acessar Conta do Usuário</h2>
            <p className="text-sm text-gray-500 mt-1">Insira o código de suporte fornecido pelo cliente</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Código de Suporte</label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && validateCode()}
                placeholder="Ex: A1B2C3"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                maxLength={8}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-danger-50 border border-danger-100 rounded-xl">
                <XCircle size={14} className="text-danger-500 shrink-0" />
                <p className="text-xs text-danger-600">{error}</p>
              </div>
            )}

            <button
              id="btn-validate-code"
              onClick={validateCode}
              disabled={loading || code.trim().length < 6}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Carregando dados...' : 'Acessar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
