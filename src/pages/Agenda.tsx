import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, Plus, Search, Clock, Trash2, X, MessageCircle, Link2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, Phone, Car, Wrench, Filter, Eye, EyeOff, Pencil, Check } from 'lucide-react'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Agendamento, Servico, Venda, KanbanItem, KanbanEtapa, PreVenda } from '../types'
import { uid, fmt, sanitizePhone } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'
import ClientePicker from '../components/ClientePicker'

const STATUS_MAP: Record<Agendamento['status'], { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100' },
  confirmado: { label: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-100' },
  em_andamento: { label: 'Em andamento', color: 'text-primary-600', bg: 'bg-primary-100' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-100' },
}

const CORES_AGENDA = ['#4285F4', '#33B679', '#F4B400', '#E67C73', '#7986CB', '#8E24AA', '#039BE5', '#616161', '#D50000', '#F09300', '#0B8043', '#3F51B5']

const ETAPAS: { key: KanbanEtapa; label: string; color: string; bg: string; border: string }[] = [
  { key: 'orcamento', label: 'Orçamento', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  { key: 'agendado', label: 'Agendado', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'na_oficina', label: 'Na Oficina', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'em_andamento', label: 'Em Andamento', color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-200' },
  { key: 'finalizado', label: 'Finalizado', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'entregue', label: 'Entregue', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
]

type AgendaBlockId = 'filtro' | 'stats' | 'calendario' | 'lista' | 'kanban'
interface AgendaBlock { id: AgendaBlockId; label: string; visible: boolean; size: 1 | 2 }
const DEFAULT_AGENDA_BLOCKS: AgendaBlock[] = [
  { id: 'filtro', label: 'Filtro de Período', visible: true, size: 2 },
  { id: 'stats', label: 'Estatísticas', visible: true, size: 2 },
  { id: 'calendario', label: 'Calendário Semanal', visible: true, size: 2 },
  { id: 'lista', label: 'Lista de Agendamentos', visible: true, size: 2 },
  { id: 'kanban', label: 'Kanban de Serviços', visible: true, size: 2 },
]

function syncKanbanFromSources(kanban: KanbanItem[], preVendas: PreVenda[], agendamentos: Agendamento[]): { items: KanbanItem[]; changed: boolean } {
  let changed = false
  const items = [...kanban]
  const origemIds = new Set(items.map(k => k.origem_id).filter(Boolean))

  for (const pv of preVendas) {
    if (pv.status === 'aprovado' || pv.status === 'recusado') {
      const existIdx = items.findIndex(k => k.origem_id === pv.id && k.origem_tipo === 'prevenda' && k.etapa === 'orcamento')
      if (existIdx !== -1) { items.splice(existIdx, 1); changed = true }
      continue
    }
    if (origemIds.has(pv.id)) continue
    const descItens = pv.itens?.map(i => i.descricao).filter(Boolean).join(', ') || ''
    items.push({ id: uid(), user_id: '', etapa: 'orcamento', nome_cliente: pv.nome_cliente, telefone_cliente: pv.telefone_cliente || '', placa: '', veiculo: '', servico: descItens, valor: pv.valor_total || 0, observacoes: pv.observacoes || '', origem_tipo: 'prevenda', origem_id: pv.id, created_at: pv.created_at || new Date().toISOString(), updated_at: new Date().toISOString() })
    changed = true
  }

  for (const ag of agendamentos) {
    if (origemIds.has(ag.id)) continue
    if (ag.status === 'cancelado') continue
    items.push({ id: uid(), user_id: '', etapa: 'agendado', nome_cliente: ag.nome_cliente, telefone_cliente: ag.telefone_cliente || '', placa: '', veiculo: '', servico: ag.servico || ag.titulo || '', valor: ag.valor || 0, observacoes: ag.observacoes || '', origem_tipo: 'agendamento', origem_id: ag.id, created_at: ag.created_at || new Date().toISOString(), updated_at: new Date().toISOString() })
    changed = true
  }

  return { items, changed }
}

const initForm = () => ({ nome_cliente: '', telefone_cliente: '', servico: '', servicoSelecionado: '', titulo: '', data_hora: '', data_hora_fim: '', valor: '', desconto: '', observacoes: '', vendaId: '', cor: '#4285F4' })

export default function Agenda() {
  const { user } = useAuth()
  const { data: lista, save: salvar } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: preVendasSync } = useCloudSync<PreVenda>({ table: 'pre_vendas', storageKey: 'pre_vendas' })
  const { data: kanban, save: salvarKanban } = useCloudSync<KanbanItem>({ table: 'kanban_items', storageKey: 'kanban_items' })
  const [servicos, setServicos] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm())
  const [semanaOffset, setSemanaOffset] = useState(0)
  const hoje = new Date()
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverEtapa, setDragOverEtapa] = useState<KanbanEtapa | null>(null)
  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange, periodoLabel } = useDateRange()

  const [agendaEditMode, setAgendaEditMode] = useState(false)
  const [agendaBlocks, setAgendaBlocks] = useState<AgendaBlock[]>(() => {
    try {
      const s = localStorage.getItem('agenda_blocks_v1')
      if (s) { const p = JSON.parse(s) as AgendaBlock[]; if (Array.isArray(p)) return DEFAULT_AGENDA_BLOCKS.map(d => ({ ...d, ...(p.find(b => b.id === d.id) ?? {}) })) }
    } catch {}
    return DEFAULT_AGENDA_BLOCKS
  })
  const [dragAgBlock, setDragAgBlock] = useState<AgendaBlockId | null>(null)
  const [dragOverAgBlock, setDragOverAgBlock] = useState<AgendaBlockId | null>(null)
  const salvarAgendaBlocks = (b: AgendaBlock[]) => { setAgendaBlocks(b); localStorage.setItem('agenda_blocks_v1', JSON.stringify(b)) }
  const moveAgUp = (id: AgendaBlockId) => { const i = agendaBlocks.findIndex(b => b.id === id); if (i === 0) return; const nb = [...agendaBlocks];[nb[i-1],nb[i]]=[nb[i],nb[i-1]]; salvarAgendaBlocks(nb) }
  const moveAgDown = (id: AgendaBlockId) => { const i = agendaBlocks.findIndex(b => b.id === id); if (i === agendaBlocks.length-1) return; const nb = [...agendaBlocks];[nb[i],nb[i+1]]=[nb[i+1],nb[i]]; salvarAgendaBlocks(nb) }
  const resizeAg = (id: AgendaBlockId) => salvarAgendaBlocks(agendaBlocks.map(b => b.id === id ? { ...b, size: b.size === 1 ? 2 : 1 } : b))
  const toggleAgBlock = (id: AgendaBlockId) => salvarAgendaBlocks(agendaBlocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b))

  const inicioSemana = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 })
    return addDays(base, semanaOffset * 7)
  }, [semanaOffset])
  const diasDaSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i)), [inicioSemana])
  const agendamentosDaSemana = useMemo(() => {
    const semIni = diasDaSemana[0]
    const semFim = addDays(diasDaSemana[6], 1)
    return lista.filter((a) => {
      if (!a.data_hora) return false
      const inicio = new Date(a.data_hora)
      const durMin = a.duracao_min || 60
      const fim = a.data_hora_fim ? new Date(a.data_hora_fim) : new Date(inicio.getTime() + durMin * 60000)
      return inicio < semFim && fim > semIni
    })
  }, [lista, diasDaSemana])

  // Auto-sync kanban from agendamentos + pré-vendas
  useEffect(() => {
    const { items, changed } = syncKanbanFromSources(kanban, preVendasSync, lista)
    if (changed) salvarKanban(items)
  }, [lista, preVendasSync]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kanban helpers
  const moverEtapa = (itemId: string, novaEtapa: KanbanEtapa) =>
    salvarKanban(kanban.map(k => k.id === itemId ? { ...k, etapa: novaEtapa, updated_at: new Date().toISOString() } : k))
  const removerKanban = (itemId: string) => salvarKanban(kanban.filter(k => k.id !== itemId))
  const proximaEtapa = (etapaAtual: KanbanEtapa): KanbanEtapa | null => {
    const idx = ETAPAS.findIndex(e => e.key === etapaAtual)
    return idx < ETAPAS.length - 1 ? ETAPAS[idx + 1].key : null
  }
  const onDragStart = (e: React.DragEvent, id: string) => { setDragItem(id); e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e: React.DragEvent, etapa: KanbanEtapa) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverEtapa(etapa) }
  const onDragLeave = () => setDragOverEtapa(null)
  const onDrop = (e: React.DragEvent, etapa: KanbanEtapa) => { e.preventDefault(); if (dragItem) moverEtapa(dragItem, etapa); setDragItem(null); setDragOverEtapa(null) }
  const kanbanPorEtapa = useMemo(() => {
    const map: Record<KanbanEtapa, KanbanItem[]> = { orcamento: [], agendado: [], na_oficina: [], em_andamento: [], finalizado: [], entregue: [] }
    kanban.forEach(k => { if (map[k.etapa]) map[k.etapa].push(k) })
    return map
  }, [kanban])

  // Load services from Supabase
  useEffect(() => {
    if (user) {
      carregarServicos()
    }
  }, [user])

  const carregarServicos = async () => {
    try {
      if (!user) return
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', user.id)
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
      setServicos([])
    }
  }

  const adicionar = () => {
    if (!form.nome_cliente || !form.data_hora) return
    const valor = parseFloat(form.valor || '0')
    const desconto = parseFloat(form.desconto || '0')
    const novo: Agendamento = {
      id: uid(), user_id: '', cliente_id: null,
      venda_id: form.vendaId || null,
      nome_cliente: form.nome_cliente, telefone_cliente: form.telefone_cliente,
      servico: form.servico, titulo: form.titulo,
      data_hora: form.data_hora, data_hora_fim: form.data_hora_fim,
      duracao_min: 60, status: 'pendente',
      observacoes: form.observacoes, valor, desconto,
      cor: form.cor || '#4285F4',
      created_at: new Date().toISOString(),
    }
    salvar([novo, ...lista])
    setModal(false)
    setForm(initForm())
  }

  const remover = (id: string) => salvar(lista.filter((a) => a.id !== id))

  const enviarWhatsApp = (a: Agendamento) => {
    const dataStr = a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    const texto = `*Agendamento*${a.titulo ? ` - ${a.titulo}` : ''}\nCliente: ${a.nome_cliente}\n${a.servico ? `Serviço: ${a.servico}\n` : ''}Data: ${dataStr}${a.valor ? `\nValor: ${fmt(a.valor - (a.desconto || 0))}` : ''}${a.observacoes ? `\nObs: ${a.observacoes}` : ''}`
    const tel = sanitizePhone(a.telefone_cliente || '')
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const filtradas = useMemo(() => lista.filter((a) => {
    const t = buscaDebounced.toLowerCase()
    const matchBusca = a.nome_cliente.toLowerCase().includes(t) || a.servico.toLowerCase().includes(t) || (a.titulo || '').toLowerCase().includes(t)
    const matchData = isInRange((a.data_hora || '').slice(0, 10))
    return matchBusca && matchData
  }), [lista, buscaDebounced, isInRange])

  const hojeStr = format(hoje, 'yyyy-MM-dd')
  const agendHoje = useMemo(() => lista.filter(a => (a.data_hora || '').startsWith(hojeStr)).length, [lista, hojeStr])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAgendaEditMode(v => !v)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-colors ${agendaEditMode ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
            {agendaEditMode ? <><Check size={14} /> Concluir</> : <><Pencil size={14} /> Editar blocos</>}
          </button>
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>
      </div>


      {/* Blocos ocultos */}
      {agendaEditMode && agendaBlocks.some(b => !b.visible) && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Blocos ocultos — clique para restaurar</p>
          <div className="flex flex-wrap gap-2">
            {agendaBlocks.filter(b => !b.visible).map(b => (
              <button key={b.id} onClick={() => toggleAgBlock(b.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors">
                <EyeOff size={12} /> {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de blocos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {agendaBlocks.map((block, idx) => {
          if (!block.visible && !agendaEditMode) return null
          const isFirst = idx === 0
          const isLast = idx === agendaBlocks.length - 1
          let content: React.ReactNode = null

          if (block.id === 'filtro') {
            content = (
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Filter size={12} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Período — {periodoLabel}</span>
                </div>
                <DateRangeFilter preset={preset} onChange={setPreset} customInicio={customInicio} customFim={customFim} onCustomInicioChange={setCustomInicio} onCustomFimChange={setCustomFim} />
              </div>
            )
          } else if (block.id === 'stats') {
            content = (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hoje', value: agendHoje, Icon: CalendarDays, color: 'text-primary-600', iconBg: 'bg-primary-100' },
                  { label: 'No período', value: filtradas.length, Icon: Clock, color: 'text-violet-600', iconBg: 'bg-violet-100' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 ${item.iconBg} rounded-xl flex items-center justify-center`}><item.Icon size={16} className={item.color} /></div>
                      <p className="text-[10px] sm:text-xs font-medium text-gray-400">{item.label}</p>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            )
          } else if (block.id === 'calendario') {
            content = (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={20} className="text-primary-600" />
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Agenda semanal</h3>
                      <p className="text-[11px] text-gray-400">
                        {format(diasDaSemana[0], "d MMM", { locale: ptBR })} — {format(diasDaSemana[6], "d MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSemanaOffset(s => s - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18} className="text-gray-500" /></button>
                    <button onClick={() => setSemanaOffset(0)} className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">Hoje</button>
                    <button onClick={() => setSemanaOffset(s => s + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18} className="text-gray-500" /></button>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100 pb-2 mb-0">
                      <div />
                      {diasDaSemana.map((dia) => {
                        const ehHoje = isToday(dia)
                        return (
                          <div key={dia.toISOString()} className="text-center">
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${ehHoje ? 'text-primary-600' : 'text-gray-400'}`}>{format(dia, 'EEE', { locale: ptBR })}</p>
                            <p className={`text-lg font-bold mt-0.5 leading-none ${ehHoje ? 'w-8 h-8 mx-auto bg-primary-500 text-white rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{format(dia, 'd')}</p>
                          </div>
                        )
                      })}
                    </div>
                    {(() => {
                      const ROW_H = 48; const HORA_INICIO = 7; const TOTAL_HORAS = 14; const defaultEventColor = '#4285F4'
                      return (
                        <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                          <div className="grid grid-cols-[50px_repeat(7,1fr)]" style={{ minHeight: ROW_H * TOTAL_HORAS }}>
                            <div className="relative">
                              {Array.from({ length: TOTAL_HORAS }, (_, i) => i + HORA_INICIO).map((hora) => (
                                <div key={hora} className="text-[10px] font-medium text-gray-400 pr-2 text-right -mt-1.5 select-none" style={{ height: ROW_H, paddingTop: 2 }}>{`${String(hora).padStart(2, '0')}:00`}</div>
                              ))}
                            </div>
                            {diasDaSemana.map((dia) => {
                              const dStr = format(dia, 'yyyy-MM-dd'); const ehHoje = isToday(dia)
                              const diaStart = new Date(`${dStr}T00:00:00`); const diaEnd = new Date(diaStart.getTime() + 86400000)
                              const BIZ_START = 8, BIZ_END = 18
                              const eventsDia = agendamentosDaSemana.filter((a) => { const ini = new Date(a.data_hora); const durM = a.duracao_min || 60; const fim = a.data_hora_fim ? new Date(a.data_hora_fim) : new Date(ini.getTime() + durM * 60000); return ini < diaEnd && fim > diaStart })
                              return (
                                <div key={dia.toISOString()} className={`relative ${ehHoje ? 'bg-primary-50/30' : ''}`}>
                                  {Array.from({ length: TOTAL_HORAS }, (_, i) => (<div key={i} className="border-t border-l border-gray-100" style={{ height: ROW_H }} />))}
                                  {eventsDia.map((ag, evIdx) => {
                                    const inicio = new Date(ag.data_hora); const durMin = ag.duracao_min || 60
                                    const fim = ag.data_hora_fim ? new Date(ag.data_hora_fim) : new Date(inicio.getTime() + durMin * 60000)
                                    const isMultiDay = inicio.toDateString() !== fim.toDateString()
                                    const isFirstDay = inicio.toDateString() === diaStart.toDateString()
                                    const isLastDay = fim.toDateString() === diaStart.toDateString()
                                    let effStart: number, effEnd: number
                                    if (!isMultiDay) { effStart = inicio.getHours() + inicio.getMinutes() / 60; effEnd = fim.getHours() + fim.getMinutes() / 60 }
                                    else if (isFirstDay) { effStart = inicio.getHours() + inicio.getMinutes() / 60; effEnd = BIZ_END }
                                    else if (isLastDay) { effStart = BIZ_START; effEnd = fim.getHours() + fim.getMinutes() / 60 }
                                    else { effStart = BIZ_START; effEnd = BIZ_END }
                                    const top = Math.max((effStart - HORA_INICIO) * ROW_H, 0)
                                    const bottom = Math.min((effEnd - HORA_INICIO) * ROW_H, TOTAL_HORAS * ROW_H)
                                    const height = Math.max(bottom - top, ROW_H * 0.5)
                                    const eventColor = ag.cor || defaultEventColor
                                    return (
                                      <div key={ag.id || evIdx} title={`${ag.nome_cliente}${ag.servico ? ' • ' + ag.servico : ''}${ag.valor ? ' • ' + fmt(ag.valor) : ''}`}
                                        className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-default"
                                        style={{ top, height, zIndex: 10 + evIdx, backgroundColor: eventColor, borderLeft: `3px solid ${eventColor}`, filter: ag.status === 'cancelado' ? 'opacity(0.4) grayscale(1)' : undefined }}>
                                        <div className="px-1.5 py-1 text-white">
                                          <p className="text-[10px] font-bold leading-tight truncate">{ag.nome_cliente || 'Agendamento'}</p>
                                          <p className="text-[9px] opacity-80 leading-tight">{isFirstDay ? format(inicio, 'HH:mm') : `${BIZ_START}:00`} – {isLastDay || !isMultiDay ? format(fim, 'HH:mm') : `${BIZ_END}:00`}</p>
                                          {height > ROW_H && ag.servico && <p className="text-[9px] opacity-70 leading-tight truncate mt-0.5">{ag.servico}</p>}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                  {[{ label: 'Pendente', color: 'bg-amber-300' }, { label: 'Confirmado', color: 'bg-blue-300' }, { label: 'Em andamento', color: 'bg-primary-400' }, { label: 'Concluído', color: 'bg-emerald-300' }, { label: 'Cancelado', color: 'bg-red-300' }].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s.color}`} /><span className="text-[10px] text-gray-400">{s.label}</span></div>
                  ))}
                </div>
              </div>
            )
          } else if (block.id === 'lista') {
            content = (
              <div className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, serviço ou título..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
                </div>
                {filtradas.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CalendarDays size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhum resultado' : 'Nenhum agendamento'}</p>
                    <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Crie um novo agendamento'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtradas.map((a) => {
                      const st = STATUS_MAP[a.status]
                      const dataInicio = a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
                      const dataFim = a.data_hora_fim ? new Date(a.data_hora_fim).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
                      return (
                        <div key={a.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 ${a.status === 'cancelado' ? 'opacity-50' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 ${st.bg} rounded-lg flex items-center justify-center shrink-0`}><Clock size={16} className={st.color} /></div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{a.titulo || a.nome_cliente}</p>
                                <p className="text-[11px] sm:text-xs text-gray-400 truncate">{a.titulo ? `${a.nome_cliente} · ` : ''}{a.servico}{a.servico ? ' · ' : ''}{dataInicio}{dataFim ? ` → ${dataFim}` : ''}{a.valor ? ` · ${fmt(a.valor - (a.desconto || 0))}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                              {a.telefone_cliente && <button onClick={() => enviarWhatsApp(a)} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                              <button onClick={() => remover(a.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          {a.observacoes && <p className="text-[10px] text-gray-400 mt-1 pl-[42px] sm:pl-11 truncate">Obs: {a.observacoes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          } else if (block.id === 'kanban') {
            content = (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Kanban de Serviços</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Arraste os cards para mover entre etapas</p>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0 pb-4">
                  <div className="flex gap-3 min-w-[1100px]">
                    {ETAPAS.map((etapa) => {
                      const items = kanbanPorEtapa[etapa.key]
                      const isDragOver = dragOverEtapa === etapa.key
                      return (
                        <div key={etapa.key} onDragOver={(e) => onDragOver(e, etapa.key)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, etapa.key)}
                          className={`flex-1 min-w-[180px] rounded-2xl border-2 transition-colors ${isDragOver ? 'border-primary-400 bg-primary-50/40' : `${etapa.border} bg-white/60`}`}>
                          <div className={`px-3 py-3 rounded-t-2xl ${etapa.bg}`}>
                            <div className="flex items-center justify-between">
                              <h3 className={`text-xs font-bold ${etapa.color} uppercase tracking-wider`}>{etapa.label}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${etapa.bg} ${etapa.color} border ${etapa.border}`}>{items.length}</span>
                            </div>
                          </div>
                          <div className="p-2 space-y-2 min-h-[120px]">
                            {items.length === 0 && <div className="text-center py-6"><p className="text-[10px] text-gray-300 font-medium">Nenhum veículo</p></div>}
                            {items.map((item) => {
                              const prox = proximaEtapa(item.etapa)
                              return (
                                <div key={item.id} draggable onDragStart={(e) => onDragStart(e, item.id)}
                                  className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${dragItem === item.id ? 'opacity-50' : ''}`}>
                                  <div className="flex items-start gap-2">
                                    <GripVertical size={14} className="text-gray-300 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 truncate">{item.nome_cliente}</p>
                                      {item.servico && <p className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5"><Wrench size={9} className="shrink-0" /> {item.servico}</p>}
                                      {item.placa && <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5"><Car size={9} className="shrink-0" /> {item.placa}{item.veiculo ? ` • ${item.veiculo}` : ''}</p>}
                                      {item.telefone_cliente && <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5"><Phone size={9} className="shrink-0" /> {item.telefone_cliente}</p>}
                                      {item.valor > 0 && <p className="text-[10px] font-bold text-emerald-600 mt-1">{fmt(item.valor)}</p>}
                                      {item.origem_tipo !== 'manual' && (
                                        <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${item.origem_tipo === 'prevenda' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>{item.origem_tipo === 'prevenda' ? 'Pré-venda' : 'Agenda'}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50">
                                    {prox && (<button onClick={() => moverEtapa(item.id, prox)} className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"><ChevronRight size={12} /> {ETAPAS.find(e => e.key === prox)?.label}</button>)}
                                    <button onClick={() => removerKanban(item.id)} className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
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
              </div>
            )
          }

          if (!content) return null

          return (
            <div
              key={block.id}
              draggable={agendaEditMode}
              onDragStart={agendaEditMode ? (e) => { setDragAgBlock(block.id); e.dataTransfer.effectAllowed = 'move' } : undefined}
              onDragOver={agendaEditMode ? (e) => { e.preventDefault(); setDragOverAgBlock(block.id) } : undefined}
              onDrop={agendaEditMode ? (e) => {
                e.preventDefault()
                if (dragAgBlock && dragAgBlock !== block.id) {
                  const nb = [...agendaBlocks]; const fi = nb.findIndex(b => b.id === dragAgBlock); const ti = nb.findIndex(b => b.id === block.id); const [m] = nb.splice(fi, 1); nb.splice(ti, 0, m); salvarAgendaBlocks(nb)
                }
                setDragAgBlock(null); setDragOverAgBlock(null)
              } : undefined}
              onDragEnd={() => { setDragAgBlock(null); setDragOverAgBlock(null) }}
              className={`relative col-span-1 ${block.size === 2 ? 'sm:col-span-2' : ''} transition-all ${
                agendaEditMode ? 'cursor-grab active:cursor-grabbing animate-wiggle pt-5' : ''
              } ${agendaEditMode && !block.visible ? 'opacity-40' : ''} ${
                dragAgBlock === block.id ? 'opacity-50 scale-[0.98]' : ''
              } ${dragOverAgBlock === block.id && dragAgBlock !== block.id ? 'ring-2 ring-primary-400 ring-offset-2 rounded-2xl' : ''}`}
            >
              {agendaEditMode && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-xl whitespace-nowrap">
                  <span className="text-[9px] font-bold text-white/50 px-1">{block.label}</span>
                  <span className="w-px h-3 bg-white/20" />
                  <button title="Mover para cima" onClick={() => moveAgUp(block.id)} disabled={isFirst} className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded-full active:scale-90"><ChevronUp size={12} /></button>
                  <button title="Mover para baixo" onClick={() => moveAgDown(block.id)} disabled={isLast} className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded-full active:scale-90"><ChevronDown size={12} /></button>
                  <span className="w-px h-3 bg-white/20" />
                  <button title={block.size === 2 ? 'Reduzir (½)' : 'Expandir'} onClick={() => resizeAg(block.id)} className="px-1.5 py-0.5 text-white/70 hover:text-white text-[10px] font-bold rounded-full active:scale-90">{block.size === 2 ? '½' : '⬛'}</button>
                  <span className="w-px h-3 bg-white/20" />
                  <button title={block.visible ? 'Ocultar' : 'Mostrar'} onClick={() => toggleAgBlock(block.id)} className="p-1 text-white/70 hover:text-white rounded-full active:scale-90">{block.visible ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                </div>
              )}
              {content}
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Novo Agendamento</h2>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Vincular a uma venda */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Link2 size={12} /> Vincular a uma venda (opcional)
                </label>
                <select
                  value={form.vendaId}
                  onChange={(e) => {
                    const vId = e.target.value
                    if (vId) {
                      const v = vendas.find(vd => vd.id === vId)
                      if (v) {
                        setForm(prev => ({
                          ...prev,
                          vendaId: vId,
                          nome_cliente: v.nome_cliente,
                          servico: v.descricao,
                          titulo: v.descricao || v.nome_cliente,
                          valor: String(v.valor_total || v.valor),
                          desconto: String(v.desconto || 0),
                          servicoSelecionado: '',
                        }))
                        return
                      }
                    }
                    setForm(prev => ({ ...prev, vendaId: '' }))
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Sem vínculo — preencher manualmente</option>
                  {vendas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome_cliente} — {v.descricao || 'Sem descrição'} — {fmt(v.valor_total || v.valor)} — {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                    </option>
                  ))}
                </select>
                {form.vendaId && (
                  <p className="text-[10px] text-primary-600 font-medium mt-1 flex items-center gap-1">
                    <Link2 size={10} /> Vinculado a venda de {vendas.find(v => v.id === form.vendaId)?.nome_cliente}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título do agendamento</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Polimento Honda Civic" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <ClientePicker
                value={form.nome_cliente}
                telefone={form.telefone_cliente}
                onChange={(nome, tel) => setForm({ ...form, nome_cliente: nome, telefone_cliente: tel || form.telefone_cliente })}
              />
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                <input type="tel" value={form.telefone_cliente} onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Serviço</label>
                <div className="relative">
                  <select
                    value={form.servicoSelecionado}
                    onChange={(e) => {
                      const selectedService = e.target.value
                      setForm({ ...form, servicoSelecionado: selectedService })
                      
                      // Auto-fill title and price if service is selected
                      if (selectedService && selectedService !== 'custom') {
                        const service = servicos.find(s => s.id === selectedService)
                        if (service) {
                          setForm(prev => ({
                            ...prev,
                            servico: service.nome,
                            titulo: service.nome,
                            valor: service.preco_padrao.toString()
                          }))
                        }
                      } else if (selectedService === 'custom') {
                        // Clear fields for custom service
                        setForm(prev => ({
                          ...prev,
                          servico: '',
                          titulo: '',
                          valor: ''
                        }))
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um serviço...</option>
                    {servicos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome} - {fmt(servico.preco_padrao)}
                      </option>
                    ))}
                    <option value="custom">Outro serviço (digitar manualmente)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {form.servicoSelecionado === 'custom' && (
                  <input
                    type="text"
                    value={form.servico}
                    onChange={(e) => setForm({ ...form, servico: e.target.value })}
                    placeholder="Digite o nome do serviço..."
                    className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data/hora inicial *</label>
                  <input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data/hora final</label>
                  <input type="datetime-local" value={form.data_hora_fim} onChange={(e) => setForm({ ...form, data_hora_fim: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto (R$)</label>
                  <input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição / Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações do agendamento..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>
              {/* Cor do agendamento */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cor na agenda</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_AGENDA.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, cor: c })}
                      className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {/* Resumo */}
              {form.valor && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-600 mb-2">Resumo do agendamento</p>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Data</span><span>{form.data_hora ? new Date(form.data_hora).toLocaleString('pt-BR') : '-'}</span></div>
                  {form.servico && <div className="flex justify-between text-xs"><span className="text-gray-500">Serviço</span><span>{form.servico}</span></div>}
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Sub-total</span><span>{fmt(parseFloat(form.valor) || 0)}</span></div>
                  {parseFloat(form.desconto || '0') > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="text-red-500">-{fmt(parseFloat(form.desconto))}</span></div>}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-emerald-600">{fmt(Math.max((parseFloat(form.valor) || 0) - (parseFloat(form.desconto || '0')), 0))}</span></div>
                  <p className="text-[10px] text-gray-400 mt-2">Ao configurar com pagamento, o sistema criará automaticamente uma venda vinculada.</p>
                </div>
              )}
              <button onClick={adicionar} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors">
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
