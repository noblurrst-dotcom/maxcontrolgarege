import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Eye, Headphones, Loader2, Users, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'

interface Conta {
  id: string
  email: string
  cadastro: string
  ultimo_acesso: string | null
  status: 'ativa' | 'dormente' | 'inativa' | 'nunca_logou' | 'suspensa'
  nome_empresa: string
  slogan: string
  cor_primaria: string
  total_clientes: number
  total_vendas: number
  total_agendamentos: number
  banned_until: string | null
}

interface Contadores {
  total: number
  ativas: number
  dormentes: number
  inativas: number
  nunca_logou: number
  suspensas: number
}

const FILTROS = [
  { key: 'todos', label: 'Todas' },
  { key: 'ativa', label: 'Ativas' },
  { key: 'dormente', label: 'Dormentes' },
  { key: 'inativa', label: 'Inativas' },
  { key: 'nunca_logou', label: 'Nunca logou' },
  { key: 'suspensa', label: 'Suspensas' },
] as const

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  ativa: { label: 'Ativa', bg: 'bg-success-100', text: 'text-success-700' },
  dormente: { label: 'Dormente', bg: 'bg-warning-100', text: 'text-warning-700' },
  inativa: { label: 'Inativa', bg: 'bg-gray-100', text: 'text-gray-600' },
  nunca_logou: { label: 'Nunca logou', bg: 'bg-blue-100', text: 'text-blue-700' },
  suspensa: { label: 'Suspensa', bg: 'bg-danger-100', text: 'text-danger-700' },
}

const PER_PAGE = 50

export default function AdminContas() {
  const navigate = useNavigate()
  const [contas, setContas] = useState<Conta[]>([])
  const [contadores, setContadores] = useState<Contadores>({ total: 0, ativas: 0, dormentes: 0, inativas: 0, nunca_logou: 0, suspensas: 0 })
  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [pagina, setPagina] = useState(0)
  const [ordem, setOrdem] = useState('cadastro_desc')
  const [gerando, setGerando] = useState<string | null>(null)

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 400)
    return () => clearTimeout(t)
  }, [busca])

  // Reset página ao mudar filtro/busca
  useEffect(() => { setPagina(0) }, [filtro, buscaDebounced])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_listar_contas', {
        p_filtro: filtro,
        p_busca: buscaDebounced,
        p_offset: pagina * PER_PAGE,
        p_limit: PER_PAGE,
        p_ordem: ordem,
      })
      if (error) throw error
      const result = data as any
      setContas(result.contas || [])
      setContadores(result.contadores || { total: 0, ativas: 0, dormentes: 0, inativas: 0, nunca_logou: 0, suspensas: 0 })
      setTotalFiltrado(result.total_filtrado || 0)
    } catch (err: any) {
      console.error('Erro ao carregar contas:', err)
      toast.error('Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }, [filtro, buscaDebounced, pagina, ordem])

  useEffect(() => { carregar() }, [carregar])

  const gerarSupportCode = async (conta: Conta) => {
    setGerando(conta.id)
    try {
      const { data, error } = await supabase.rpc('admin_gerar_support_code', {
        p_target_user_id: conta.id,
      })
      if (error) throw error
      const result = data as { code: string; email: string; nome: string }
      // Abrir /admin/suporte com o code
      window.open(`/admin/suporte?code=${result.code}`, '_blank')
      toast.success(`Código de suporte gerado: ${result.code}`)
    } catch (err: any) {
      console.error('Erro ao gerar código:', err)
      toast.error('Erro ao gerar código de suporte')
    } finally {
      setGerando(null)
    }
  }

  const totalPaginas = Math.ceil(totalFiltrado / PER_PAGE)

  const contadorKey = (key: string) => {
    const map: Record<string, number> = {
      todos: contadores.total,
      ativa: contadores.ativas,
      dormente: contadores.dormentes,
      inativa: contadores.inativas,
      nunca_logou: contadores.nunca_logou,
      suspensa: contadores.suspensas,
    }
    return map[key] ?? 0
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contas da Plataforma</h1>
          <p className="text-sm text-gray-400 mt-0.5">{contadores.total} contas registradas</p>
        </div>
        <button onClick={carregar} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-start">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filtro === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">{contadorKey(f.key)}</span>
          </button>
        ))}
      </div>

      {/* Busca + Ordenação */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por email ou empresa..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-warning-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 outline-none focus:ring-2 focus:ring-warning-500"
        >
          <option value="cadastro_desc">Cadastro (recente)</option>
          <option value="cadastro_asc">Cadastro (antigo)</option>
          <option value="acesso_desc">Último acesso (recente)</option>
          <option value="acesso_asc">Último acesso (antigo)</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : contas.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Nenhuma conta encontrada</p>
            <p className="text-sm text-gray-400 mt-1">Tente outro filtro ou termo de busca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Empresa / Email</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden md:table-cell">Plano</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden lg:table-cell">Cadastro</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden lg:table-cell">Último acesso</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase hidden xl:table-cell">Dados</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => {
                  const st = STATUS_STYLE[c.status] || STATUS_STYLE.inativa
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate max-w-[200px]">{c.nome_empresa || c.email}</p>
                          {c.nome_empresa && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{c.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-400">—</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{c.cadastro ? format(new Date(c.cadastro), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{c.ultimo_acesso ? format(new Date(c.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex gap-3 text-[10px] text-gray-400">
                          <span>{c.total_clientes} cli</span>
                          <span>{c.total_vendas} ven</span>
                          <span>{c.total_agendamentos} age</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/admin/contas/${c.id}`)}
                            title="Ver detalhes"
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => gerarSupportCode(c)}
                            disabled={gerando === c.id}
                            title="Entrar como suporte"
                            className="p-1.5 text-warning-500 hover:text-warning-700 hover:bg-warning-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {gerando === c.id ? <Loader2 size={14} className="animate-spin" /> : <Headphones size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {pagina * PER_PAGE + 1}–{Math.min((pagina + 1) * PER_PAGE, totalFiltrado)} de {totalFiltrado}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(p => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-gray-600 px-2">{pagina + 1} / {totalPaginas}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
