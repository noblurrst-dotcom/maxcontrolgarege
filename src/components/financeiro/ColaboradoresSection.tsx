import { useState, useMemo } from 'react'
import { Plus, Search, Users, UserCheck, UserX, Briefcase, Building2, User, Pencil, X, Info } from 'lucide-react'
import { useCloudSync } from '../../hooks/useCloudSync'
import { useDebounce } from '../../hooks/useDebounce'
import { fmt, uid } from '../../lib/utils'
import type { Colaborador, TipoColaborador } from '../../types'
import ColaboradorFormModal from './ColaboradorFormModal'
import { calcularCustoMensal, type CustoMensal } from '../../lib/colaboradores'

type Filtro = 'todos' | 'ativos' | 'inativos' | 'clt' | 'freelancer_pj' | 'freelancer_autonomo'

const TIPO_LABEL: Record<TipoColaborador, string> = {
  clt: 'CLT',
  freelancer_pj: 'PJ',
  freelancer_autonomo: 'Autônomo',
}

const TIPO_BADGE: Record<TipoColaborador, string> = {
  clt: 'bg-blue-100 text-blue-700',
  freelancer_pj: 'bg-success-100 text-success-700',
  freelancer_autonomo: 'bg-violet-100 text-violet-700',
}

const TIPO_ICON: Record<TipoColaborador, typeof Building2> = {
  clt: Building2,
  freelancer_pj: Briefcase,
  freelancer_autonomo: User,
}

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'inativos', label: 'Inativos' },
  { value: 'clt', label: 'CLT' },
  { value: 'freelancer_pj', label: 'PJ' },
  { value: 'freelancer_autonomo', label: 'Autônomo' },
]

export default function ColaboradoresSection() {
  const { data: colaboradores, save, loading } = useCloudSync<Colaborador>({ table: 'funcionarios', storageKey: 'funcionarios' })
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Colaborador | null>(null)
  const [detalheCusto, setDetalheCusto] = useState<{ colaborador: Colaborador; custo: CustoMensal } | null>(null)

  const filtrados = useMemo(() => {
    return colaboradores.filter(c => {
      const matchBusca = !buscaDebounced || c.nome.toLowerCase().includes(buscaDebounced.toLowerCase()) || (c.cargo || '').toLowerCase().includes(buscaDebounced.toLowerCase())
      let matchFiltro = true
      if (filtro === 'ativos') matchFiltro = c.ativo
      else if (filtro === 'inativos') matchFiltro = !c.ativo
      else if (filtro === 'clt' || filtro === 'freelancer_pj' || filtro === 'freelancer_autonomo') matchFiltro = c.tipo === filtro
      return matchBusca && matchFiltro
    })
  }, [colaboradores, buscaDebounced, filtro])

  const contadores = useMemo(() => ({
    total: colaboradores.length,
    ativos: colaboradores.filter(c => c.ativo).length,
    clt: colaboradores.filter(c => c.tipo === 'clt').length,
    pj: colaboradores.filter(c => c.tipo === 'freelancer_pj').length,
    autonomo: colaboradores.filter(c => c.tipo === 'freelancer_autonomo').length,
  }), [colaboradores])

  const toggleAtivo = (id: string) => {
    save(colaboradores.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c))
  }

  const abrirNovo = () => { setEditando(null); setModalAberto(true) }
  const abrirEditar = (c: Colaborador) => { setEditando(c); setModalAberto(true) }
  const fecharModal = () => { setModalAberto(false); setEditando(null) }

  const salvarColaborador = (data: Omit<Colaborador, 'id' | 'user_id' | 'created_at'>) => {
    if (editando) {
      save(colaboradores.map(c => c.id === editando.id ? { ...c, ...data } : c))
    } else {
      const novo: Colaborador = {
        ...data,
        id: uid(),
        user_id: '',
        created_at: new Date().toISOString(),
      }
      save([novo, ...colaboradores])
    }
    fecharModal()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-primary-500" />
            Colaboradores
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {contadores.total} cadastrado{contadores.total !== 1 ? 's' : ''} · {contadores.ativos} ativo{contadores.ativos !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-full text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <Plus size={14} /> Novo colaborador
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] font-medium text-gray-400 mb-1">CLT</p>
          <p className="text-lg font-bold text-blue-600">{contadores.clt}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] font-medium text-gray-400 mb-1">PJ</p>
          <p className="text-lg font-bold text-success-600">{contadores.pj}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] font-medium text-gray-400 mb-1">Autônomo</p>
          <p className="text-lg font-bold text-violet-600">{contadores.autonomo}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] font-medium text-gray-400 mb-1">Ativos</p>
          <p className="text-lg font-bold text-gray-900">{contadores.ativos}/{contadores.total}</p>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cargo..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f.value
                  ? 'bg-primary-500 text-on-primary'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">
            {busca ? 'Nenhum resultado' : 'Nenhum colaborador cadastrado'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {busca ? 'Tente outro termo de busca' : 'Clique em "+ Novo colaborador" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => {
            const TipoIcon = TIPO_ICON[c.tipo] || User
            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 flex items-center gap-3 ${
                  !c.ativo ? 'opacity-60' : ''
                }`}
              >
                {/* Avatar / icone */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TIPO_BADGE[c.tipo] || 'bg-gray-100 text-gray-600'}`}>
                  <TipoIcon size={18} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_BADGE[c.tipo]}`}>
                      {TIPO_LABEL[c.tipo] || c.tipo}
                    </span>
                    {!c.ativo && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {c.cargo || 'Sem cargo'}
                    {c.comissao_percentual > 0 ? ` · ${c.comissao_percentual}% comissão` : ''}
                  </p>
                </div>

                {/* Custo mensal */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Custo/mês</p>
                  <button
                    onClick={() => {
                      const custo = calcularCustoMensal(c)
                      setDetalheCusto({ colaborador: c, custo })
                    }}
                    className="text-sm font-bold text-primary-600 hover:underline flex items-center gap-0.5 ml-auto"
                    title="Ver detalhamento"
                  >
                    {fmt(calcularCustoMensal(c).total)}
                    <Info size={12} className="text-gray-400" />
                  </button>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleAtivo(c.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      c.ativo
                        ? 'text-success-500 hover:bg-success-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={c.ativo ? 'Desativar' : 'Reativar'}
                  >
                    {c.ativo ? <UserCheck size={16} /> : <UserX size={16} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalAberto && (
        <ColaboradorFormModal
          colaborador={editando}
          onSave={salvarColaborador}
          onClose={fecharModal}
        />
      )}

      {/* Modal detalhamento de custo mensal */}
      {detalheCusto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetalheCusto(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">Custo mensal estimado</h3>
                <p className="text-xs text-gray-400 mt-0.5">{detalheCusto.colaborador.nome} · {TIPO_LABEL[detalheCusto.colaborador.tipo]}</p>
              </div>
              <button onClick={() => setDetalheCusto(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-2">
                {detalheCusto.custo.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-[10px] text-gray-400">
                        {item.descricao}
                        {item.percentual ? ` (${item.percentual}%)` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0 ml-3">{fmt(item.valor)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t-2 border-gray-200 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Total estimado</p>
                <p className="text-lg font-bold text-primary-600">{fmt(detalheCusto.custo.total)}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">* Estimativa baseada no regime Simples Nacional. Valores reais podem variar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
