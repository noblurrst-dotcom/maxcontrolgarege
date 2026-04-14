import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield,
  Search,
  LogOut,
  User,
  Mail,
  Clock,
  ShoppingCart,
  CalendarDays,
  Users,
  DollarSign,
  ClipboardCheck,
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

// ========================================================================
// IDs dos super administradores (adicione seu user_id do Supabase aqui)
// ========================================================================
export const SUPER_ADMIN_IDS: string[] = [
  '22cf7ac8-0e64-481e-b0a6-c71b8fc11823',
]

interface SupportSession {
  userId: string
  userEmail: string
  userNome: string
  code: string
}

interface UserData {
  vendas: any[]
  agendamentos: any[]
  clientes: any[]
  financeiro: any[]
  kanban_items: any[]
  pre_vendas: any[]
  brand_config: any | null
}

export default function AdminSuporte() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<SupportSession | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'vendas' | 'agendamentos' | 'clientes' | 'financeiro' | 'kanban' | 'config'>('vendas')

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
    if (urlCode && isSuperAdmin && !session) {
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

      setSession({
        userId: row.user_id,
        userEmail: row.user_email,
        userNome: row.user_nome,
        code: row.code,
      })

      // Carregar dados do usuário
      await loadUserData(row.user_id)
    } catch (err: any) {
      console.error('Erro ao validar código:', err)
      setError('Erro ao validar código')
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async (userId: string) => {
    setDataLoading(true)
    try {
      const [vendas, agendamentos, clientes, financeiro, kanban, preVendas, brand] = await Promise.all([
        supabase.from('vendas').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('agendamentos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('clientes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('financeiro').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('kanban_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('pre_vendas').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('brand_config').select('*').eq('user_id', userId).single(),
      ])

      setUserData({
        vendas: vendas.data || [],
        agendamentos: agendamentos.data || [],
        clientes: clientes.data || [],
        financeiro: financeiro.data || [],
        kanban_items: kanban.data || [],
        pre_vendas: preVendas.data || [],
        brand_config: brand.data || null,
      })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const endSession = () => {
    setSession(null)
    setUserData(null)
    setCode('')
    setActiveTab('vendas')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // UI de login (não é super admin ou sem user)
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
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-sm text-gray-500 mb-6">Esta página é exclusiva para administradores do sistema.</p>
          <div className="space-y-2">
            <button onClick={() => navigate('/')} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
              Voltar ao sistema
            </button>
            <button onClick={handleSignOut} className="w-full py-2.5 text-red-500 text-sm font-medium">
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tela principal do admin
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-amber-400" />
              <span className="text-sm font-bold">Painel de Suporte</span>
            </div>
            <div className="flex items-center gap-3">
              {session && (
                <button onClick={endSession} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition-colors">
                  <XCircle size={14} />
                  Encerrar sessão
                </button>
              )}
              <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-white transition-colors" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {!session ? (
          /* Tela de input do código */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-amber-400" />
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
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                    <XCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  id="btn-validate-code"
                  onClick={validateCode}
                  disabled={loading || code.trim().length < 6}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {loading ? 'Validando...' : 'Acessar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Sessão ativa — visualizar dados do usuário */
          <div>
            {/* User info banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                    <User size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{session.userNome || 'Sem nome'}</h3>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail size={12} /> {session.userEmail}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} /> Código: {session.code}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">Sessão ativa</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            {userData && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                  { label: 'Vendas', count: userData.vendas.length, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Agendamentos', count: userData.agendamentos.length, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Clientes', count: userData.clientes.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Financeiro', count: userData.financeiro.length, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Kanban', count: userData.kanban_items.length, icon: ClipboardCheck, color: 'text-pink-600', bg: 'bg-pink-50' },
                  { label: 'Pré-Vendas', count: userData.pre_vendas.length, icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                      <s.icon size={16} className={s.color} />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{s.count}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {[
                { key: 'vendas' as const, label: 'Vendas', icon: ShoppingCart },
                { key: 'agendamentos' as const, label: 'Agenda', icon: CalendarDays },
                { key: 'clientes' as const, label: 'Clientes', icon: Users },
                { key: 'financeiro' as const, label: 'Financeiro', icon: DollarSign },
                { key: 'kanban' as const, label: 'Kanban', icon: ClipboardCheck },
                { key: 'config' as const, label: 'Config', icon: Building2 },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeTab === t.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Data table */}
            {dataLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Carregando dados...</p>
              </div>
            ) : userData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {activeTab === 'config' && userData.brand_config ? (
                  <div className="p-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Configurações da Marca</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(userData.brand_config).filter(([k]) => k !== 'user_id' && k !== 'updated_at').map(([key, val]) => (
                        <div key={key} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                          <span className="text-[10px] font-bold text-gray-400 uppercase min-w-[100px]">{key}</span>
                          <span className="text-xs text-gray-700 break-all">{String(val || '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeTab === 'config' ? (
                  <div className="p-12 text-center text-sm text-gray-400">Sem configuração de marca</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {activeTab === 'vendas' && ['Nome', 'Descrição', 'Valor', 'Status', 'Data'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}
                          {activeTab === 'agendamentos' && ['Cliente', 'Serviço', 'Data/Hora', 'Status', 'Valor'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}
                          {activeTab === 'clientes' && ['Nome', 'Telefone', 'Veículo', 'Placa', 'Total Gasto'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}
                          {activeTab === 'financeiro' && ['Tipo', 'Categoria', 'Descrição', 'Valor', 'Data'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}
                          {activeTab === 'kanban' && ['Cliente', 'Serviço', 'Etapa', 'Valor', 'Origem'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTab === 'vendas' && userData.vendas.map(v => (
                          <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{v.nome_cliente || '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{v.descricao || '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{fmt(v.valor_total || v.valor || 0)}</td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === 'fechada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.status}</span></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{v.data_venda}</td>
                          </tr>
                        ))}
                        {activeTab === 'agendamentos' && userData.agendamentos.map(a => (
                          <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{a.nome_cliente}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{a.servico || a.titulo}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{a.data_hora?.replace('T', ' ')}</td>
                            <td className="px-4 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a.status}</span></td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{fmt(a.valor || 0)}</td>
                          </tr>
                        ))}
                        {activeTab === 'clientes' && userData.clientes.map(c => (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{c.nome}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{c.telefone || '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{c.veiculo || '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{c.placa || '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{fmt(c.total_gasto || 0)}</td>
                          </tr>
                        ))}
                        {activeTab === 'financeiro' && userData.financeiro.map(f => (
                          <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{f.tipo}</span></td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{f.categoria}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{f.descricao}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{fmt(f.valor || 0)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{f.data}</td>
                          </tr>
                        ))}
                        {activeTab === 'kanban' && userData.kanban_items.map(k => (
                          <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{k.nome_cliente}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{k.servico || '—'}</td>
                            <td className="px-4 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{k.etapa}</span></td>
                            <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{fmt(k.valor || 0)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{k.origem_tipo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {userData && (
                      (activeTab === 'vendas' && userData.vendas.length === 0) ||
                      (activeTab === 'agendamentos' && userData.agendamentos.length === 0) ||
                      (activeTab === 'clientes' && userData.clientes.length === 0) ||
                      (activeTab === 'financeiro' && userData.financeiro.length === 0) ||
                      (activeTab === 'kanban' && userData.kanban_items.length === 0)
                    ) && (
                      <div className="p-12 text-center text-sm text-gray-400">Nenhum registro encontrado</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
