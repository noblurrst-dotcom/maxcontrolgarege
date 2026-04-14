import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ChecklistCard from '../components/ChecklistCard'
import { Plus, Search, ClipboardList, Loader2, CalendarDays, CheckCircle2, Hash, Columns, GripVertical, Phone, Car, Wrench, Trash2, ChevronRight } from 'lucide-react'
import type { Checklist, KanbanItem, KanbanEtapa, PreVenda, Agendamento } from '../types'
import { uid, fmt } from '../lib/utils'
import { useCloudSync } from '../hooks/useCloudSync'

const ETAPAS: { key: KanbanEtapa; label: string; color: string; bg: string; border: string }[] = [
  { key: 'orcamento', label: 'Orçamento', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'agendado', label: 'Agendado', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'na_oficina', label: 'Na Oficina', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'em_andamento', label: 'Em Andamento', color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-200' },
  { key: 'finalizado', label: 'Finalizado', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'entregue', label: 'Entregue', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
]

function syncKanbanFromSources(kanban: KanbanItem[], preVendas: PreVenda[], agendamentos: Agendamento[]): { items: KanbanItem[]; changed: boolean } {
  let changed = false
  const items = [...kanban]
  const origemIds = new Set(items.map(k => k.origem_id).filter(Boolean))

  // Sync pré-vendas → Orçamento (somente pendentes)
  for (const pv of preVendas) {
    if (pv.status === 'aprovado' || pv.status === 'recusado') {
      // Se já convertida/recusada, remover do kanban orçamento
      const existIdx = items.findIndex(k => k.origem_id === pv.id && k.origem_tipo === 'prevenda' && k.etapa === 'orcamento')
      if (existIdx !== -1) {
        items.splice(existIdx, 1)
        changed = true
      }
      continue
    }
    if (origemIds.has(pv.id)) continue
    const descItens = pv.itens?.map(i => i.descricao).filter(Boolean).join(', ') || ''
    items.push({
      id: uid(),
      user_id: '',
      etapa: 'orcamento',
      nome_cliente: pv.nome_cliente,
      telefone_cliente: pv.telefone_cliente || '',
      placa: '',
      veiculo: '',
      servico: descItens,
      valor: pv.valor_total || 0,
      observacoes: pv.observacoes || '',
      origem_tipo: 'prevenda',
      origem_id: pv.id,
      created_at: pv.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    changed = true
  }

  // Sync agendamentos → Agendado
  for (const ag of agendamentos) {
    if (origemIds.has(ag.id)) continue
    if (ag.status === 'cancelado') continue
    items.push({
      id: uid(),
      user_id: '',
      etapa: 'agendado',
      nome_cliente: ag.nome_cliente,
      telefone_cliente: ag.telefone_cliente || '',
      placa: '',
      veiculo: '',
      servico: ag.servico || ag.titulo || '',
      valor: ag.valor || 0,
      observacoes: ag.observacoes || '',
      origem_tipo: 'agendamento',
      origem_id: ag.id,
      created_at: ag.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    changed = true
  }

  return { items, changed }
}

export default function Checklists() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'checklists' | 'kanban'>('kanban')
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  // Kanban state
  const { data: kanban, save: salvarKanban } = useCloudSync<KanbanItem>({ table: 'kanban_items', storageKey: 'kanban_items' })
  const { data: preVendasSync } = useCloudSync<PreVenda>({ table: 'pre_vendas', storageKey: 'pre_vendas' })
  const { data: agendamentosSync } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverEtapa, setDragOverEtapa] = useState<KanbanEtapa | null>(null)

  // Auto-sync from pré-vendas and agendamentos
  useEffect(() => {
    const { items, changed } = syncKanbanFromSources(kanban, preVendasSync, agendamentosSync)
    if (changed) salvarKanban(items)
  }, [preVendasSync, agendamentosSync]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) carregarChecklists()
  }, [user])

  const carregarChecklists = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setChecklists(data || [])
    } catch (err) {
      console.error('Erro ao carregar checklists:', err)
    } finally {
      setLoading(false)
    }
  }

  const checklistsFiltrados = checklists.filter((c) => {
    const termo = busca.toLowerCase()
    return (
      c.placa.toLowerCase().includes(termo) ||
      c.nome_cliente.toLowerCase().includes(termo) ||
      c.servico.toLowerCase().includes(termo)
    )
  })

  const totalHoje = checklists.filter((c) => {
    const hoje = new Date().toISOString().split('T')[0]
    return c.created_at.startsWith(hoje)
  }).length

  const totalConcluidos = checklists.filter((c) => c.status === 'concluido').length

  // Kanban helpers
  const moverEtapa = (itemId: string, novaEtapa: KanbanEtapa) => {
    salvarKanban(kanban.map(k => k.id === itemId ? { ...k, etapa: novaEtapa, updated_at: new Date().toISOString() } : k))
  }

  const removerKanban = (itemId: string) => {
    salvarKanban(kanban.filter(k => k.id !== itemId))
  }

  const proximaEtapa = (etapaAtual: KanbanEtapa): KanbanEtapa | null => {
    const idx = ETAPAS.findIndex(e => e.key === etapaAtual)
    return idx < ETAPAS.length - 1 ? ETAPAS[idx + 1].key : null
  }

  // Drag handlers
  const onDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent, etapa: KanbanEtapa) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverEtapa(etapa)
  }
  const onDragLeave = () => setDragOverEtapa(null)
  const onDrop = (e: React.DragEvent, etapa: KanbanEtapa) => {
    e.preventDefault()
    if (dragItem) moverEtapa(dragItem, etapa)
    setDragItem(null)
    setDragOverEtapa(null)
  }

  const kanbanPorEtapa = useMemo(() => {
    const map: Record<KanbanEtapa, KanbanItem[]> = { orcamento: [], agendado: [], na_oficina: [], em_andamento: [], finalizado: [], entregue: [] }
    kanban.forEach(k => { if (map[k.etapa]) map[k.etapa].push(k) })
    return map
  }, [kanban])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gerencie os checklists e o fluxo de veículos</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'checklists' && (
            <button
              onClick={() => navigate('/novo-checklist')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm"
            >
              <Plus size={16} />
              Novo Checklist
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('kanban')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Columns size={14} /> Kanban
        </button>
        <button
          onClick={() => setTab('checklists')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            tab === 'checklists' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList size={14} /> Checklists
        </button>
      </div>

      {tab === 'checklists' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Hoje', value: totalHoje, Icon: CalendarDays, color: 'text-primary-600', iconBg: 'bg-primary-100' },
              { label: 'Concluídos', value: totalConcluidos, Icon: CheckCircle2, color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
              { label: 'Total', value: checklists.length, Icon: Hash, color: 'text-violet-600', iconBg: 'bg-violet-100' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 ${item.iconBg} rounded-xl flex items-center justify-center`}>
                    <item.Icon size={18} className={item.color} />
                  </div>
                  <p className="text-xs font-medium text-gray-400">{item.label}</p>
                </div>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por placa, cliente ou serviço..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Lista */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Checklists Recentes ({checklistsFiltrados.length})
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : checklistsFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-900 font-semibold text-lg">Nenhum checklist encontrado</p>
                <p className="text-gray-400 text-sm mt-1">
                  {busca ? 'Tente outro termo de busca' : 'Crie seu primeiro checklist!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklistsFiltrados.map((checklist) => (
                  <ChecklistCard key={checklist.id} checklist={checklist} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Kanban Board */
        <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0 pb-4">
          <div className="flex gap-3 min-w-[1100px]">
            {ETAPAS.map((etapa) => {
              const items = kanbanPorEtapa[etapa.key]
              const isDragOver = dragOverEtapa === etapa.key
              return (
                <div
                  key={etapa.key}
                  onDragOver={(e) => onDragOver(e, etapa.key)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, etapa.key)}
                  className={`flex-1 min-w-[180px] rounded-2xl border-2 transition-colors ${
                    isDragOver ? 'border-primary-400 bg-primary-50/40' : `${etapa.border} bg-white/60`
                  }`}
                >
                  {/* Column header */}
                  <div className={`px-3 py-3 rounded-t-2xl ${etapa.bg}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xs font-bold ${etapa.color} uppercase tracking-wider`}>{etapa.label}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${etapa.bg} ${etapa.color} border ${etapa.border}`}>
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {items.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-[10px] text-gray-300 font-medium">Nenhum veículo</p>
                      </div>
                    )}
                    {items.map((item) => {
                      const prox = proximaEtapa(item.etapa)
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, item.id)}
                          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                            dragItem === item.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="text-gray-300 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{item.nome_cliente}</p>
                              {item.servico && (
                                <p className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                  <Wrench size={9} className="shrink-0" /> {item.servico}
                                </p>
                              )}
                              {item.placa && (
                                <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                  <Car size={9} className="shrink-0" /> {item.placa}{item.veiculo ? ` • ${item.veiculo}` : ''}
                                </p>
                              )}
                              {item.telefone_cliente && (
                                <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                  <Phone size={9} className="shrink-0" /> {item.telefone_cliente}
                                </p>
                              )}
                              {item.valor > 0 && (
                                <p className="text-[10px] font-bold text-emerald-600 mt-1">{fmt(item.valor)}</p>
                              )}
                              {item.origem_tipo !== 'manual' && (
                                <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                                  item.origem_tipo === 'prevenda' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {item.origem_tipo === 'prevenda' ? 'Pré-venda' : 'Agenda'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50">
                            {prox && (
                              <button
                                onClick={() => moverEtapa(item.id, prox)}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                              >
                                <ChevronRight size={12} /> {ETAPAS.find(e => e.key === prox)?.label}
                              </button>
                            )}
                            <button
                              onClick={() => removerKanban(item.id)}
                              className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
