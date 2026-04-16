import { useState, useEffect, useMemo, useRef } from 'react'
import { CalendarDays, Plus, Search, Clock, Trash2, X, MessageCircle, Link2, ChevronLeft, ChevronRight, GripVertical, Eye, EyeOff, Pencil, Check, RotateCcw, LayoutGrid, Wand2 } from 'lucide-react'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Agendamento, Servico, Venda } from '../types'
import { uid, fmt, sanitizePhone } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync, useCloudSyncSingle } from '../hooks/useCloudSync'
import ClientePicker from '../components/ClientePicker'
import { snapValue, getSnapCandidates, calcularAlturaTotal, clampBlock, overlaps, autoArranjarBlocks } from '../utils/dashboardLayout'

const STATUS_MAP: Record<Agendamento['status'], { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100' },
  confirmado: { label: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-100' },
  em_andamento: { label: 'Em andamento', color: 'text-primary-600', bg: 'bg-primary-100' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-100' },
}

const CORES_AGENDA = ['#4285F4', '#33B679', '#F4B400', '#E67C73', '#7986CB', '#8E24AA', '#039BE5', '#616161', '#D50000', '#F09300', '#0B8043', '#3F51B5']

type AgendaBlockId = 'stats' | 'calendario' | 'lista'
interface AgendaBlock { id: AgendaBlockId; label: string; visible: boolean; x: number; y: number; w: number; h: number }
function getDefaultAgendaBlocks(cw: number): AgendaBlock[] {
  const half = Math.floor((cw - 8) / 2)
  return [
    { id: 'stats',      label: 'Estatísticas',             visible: true, x: 0,        y: 0,    w: half, h: 140 },
    { id: 'calendario', label: 'Calendário Semanal',       visible: true, x: half + 8, y: 0,    w: half, h: 588 },
    { id: 'lista',      label: 'Lista de Agendamentos',    visible: true, x: 0,        y: 148,  w: half, h: 440 },
  ]
}
const DEFAULT_AGENDA_BLOCKS = getDefaultAgendaBlocks(1200)

const initForm = () => ({ nome_cliente: '', telefone_cliente: '', servico: '', servicoSelecionado: '', titulo: '', data_hora: '', data_hora_fim: '', valor: '', desconto: '', observacoes: '', vendaId: '', cor: '#4285F4' })

export default function Agenda() {
  const { user } = useAuth()
  const { data: lista, save: salvar } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const [servicos, setServicos] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm())
  const [semanaOffset, setSemanaOffset] = useState(0)
  const hoje = new Date()
  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange } = useDateRange()

  const [agendaEditMode, setAgendaEditMode] = useState(false)
  const [showAgendaCardManager, setShowAgendaCardManager] = useState(false)
  const agendaGridRef = useRef<HTMLDivElement>(null)
  const [agendaContainerWidth, setAgendaContainerWidth] = useState(0)
  useEffect(() => {
    const update = () => { if (agendaGridRef.current) setAgendaContainerWidth(agendaGridRef.current.offsetWidth) }
    update()
    const ro = new ResizeObserver(update)
    if (agendaGridRef.current) ro.observe(agendaGridRef.current)
    return () => ro.disconnect()
  }, [])
  const getAgendaContainerWidth = () => agendaGridRef.current?.clientWidth ?? agendaContainerWidth ?? 0
  const { data: agendaBlocksCloud, save: salvarAgendaBlocksCloud } = useCloudSyncSingle<{ blocks: AgendaBlock[] }>({ table: 'agenda_blocks', storageKey: 'agenda_blocks', defaultValue: { blocks: DEFAULT_AGENDA_BLOCKS }, dataField: 'blocks' })
  const salvarAgendaBlocks = (b: AgendaBlock[]) => { salvarAgendaBlocksCloud(b as any) }
  const agendaBlocks = useMemo(() => {
    const cw = agendaContainerWidth || window.innerWidth - 80
    const saved = (agendaBlocksCloud as any) as AgendaBlock[] | undefined
    const raw: AgendaBlock[] = Array.isArray(saved) && saved.length > 0
      ? DEFAULT_AGENDA_BLOCKS.map(d => { const s = (saved as any[]).find((b: any) => b.id === d.id); if (!s) return d; return { ...d, visible: s.visible ?? d.visible, x: s.x ?? d.x, y: s.y ?? d.y, w: s.w ?? d.w, h: s.h ?? d.h } as AgendaBlock })
      : [...getDefaultAgendaBlocks(cw)]
    const seen = new Set<string>()
    const final = raw.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true }).map(b => clampBlock(b, cw))
    const temSobreposicao = final.some((a, i) => final.slice(i + 1).some(b => a.visible && b.visible && overlaps(a, b)))
    if (temSobreposicao && agendaContainerWidth > 0) {
      setTimeout(() => salvarAgendaBlocks(getDefaultAgendaBlocks(agendaContainerWidth)), 0)
      return getDefaultAgendaBlocks(agendaContainerWidth)
    }
    return final
  }, [agendaBlocksCloud, agendaContainerWidth])
  const toggleAgBlock = (id: AgendaBlockId) => salvarAgendaBlocks(agendaBlocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b))
  const resetAgendaBlocks = () => salvarAgendaBlocks([...getDefaultAgendaBlocks(getAgendaContainerWidth() || window.innerWidth)])
  const agendaResizeDataRef = useRef<{ id: AgendaBlockId; startClientX: number; startClientY: number; startW: number; startH: number; curW: number; curH: number } | null>(null)
  const agendaDragDataRef = useRef<{ id: AgendaBlockId; offsetX: number; offsetY: number; curX: number; curY: number } | null>(null)
  const [agendaLiveW, setAgendaLiveW] = useState<Partial<Record<AgendaBlockId, number>>>({})
  const [agendaLiveH, setAgendaLiveH] = useState<Partial<Record<AgendaBlockId, number>>>({})
  const [agendaLivePos, setAgendaLivePos] = useState<Partial<Record<AgendaBlockId, { x: number; y: number }>>>({})
  const [agendaSnapLines, setAgendaSnapLines] = useState<{ x?: number; y?: number }>({})
  const [agendaDragActiveId, setAgendaDragActiveId] = useState<AgendaBlockId | null>(null)
  const [agendaResizeActiveId, setAgendaResizeActiveId] = useState<AgendaBlockId | null>(null)

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
          <button
            onClick={() => setShowAgendaCardManager(!showAgendaCardManager)}
            title="Gerenciar cards"
            className="p-2 rounded-xl transition-colors bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setAgendaEditMode(v => !v)}
            title={agendaEditMode ? 'Concluir edição' : 'Editar painel'}
            className={`p-2 rounded-xl transition-colors ${agendaEditMode ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'}`}
          >
            {agendaEditMode ? <Check size={16} /> : <Pencil size={16} />}
          </button>
          {agendaEditMode && (
            <>
              <button
                onClick={() => {
                  const cw = getAgendaContainerWidth()
                  if (cw === 0) return
                  salvarAgendaBlocks(autoArranjarBlocks(agendaBlocks, cw))
                }}
                title="Organizar cards"
                className="p-2 rounded-xl transition-colors bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
              >
                <Wand2 size={16} />
              </button>
              <button onClick={resetAgendaBlocks} title="Resetar layout" className="p-2 rounded-xl transition-colors bg-white hover:bg-gray-50 text-gray-600 border border-gray-200">
                <RotateCcw size={16} />
              </button>
            </>
          )}
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>
      </div>


      {/* Card manager panel */}
      {showAgendaCardManager && (
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-700">Cards da agenda</p>
            <button onClick={() => setShowAgendaCardManager(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {agendaBlocks.map(b => (
              <button
                key={b.id}
                onClick={() => toggleAgBlock(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  b.visible
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                {b.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro de período — fora do grid, igual ao Dashboard */}
      {!agendaEditMode && (
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <DateRangeFilter
            preset={preset}
            onChange={setPreset}
            customInicio={customInicio}
            customFim={customFim}
            onCustomInicioChange={setCustomInicio}
            onCustomFimChange={setCustomFim}
          />
        </div>
      )}

      {/* Grid de blocos */}
      <div
        ref={agendaGridRef}
        className="relative w-full"
        style={{ height: calcularAlturaTotal(agendaBlocks.filter(b => b.visible || agendaEditMode), agendaLivePos, agendaLiveH) }}
      >
        {agendaEditMode && agendaSnapLines.x !== undefined && (
          <div style={{ position: 'absolute', left: agendaSnapLines.x, top: 0, bottom: 0, width: 1, background: 'rgba(207,255,4,0.4)', pointerEvents: 'none', zIndex: 100 }} />
        )}
        {agendaEditMode && agendaSnapLines.y !== undefined && (
          <div style={{ position: 'absolute', top: agendaSnapLines.y, left: 0, right: 0, height: 1, background: 'rgba(207,255,4,0.4)', pointerEvents: 'none', zIndex: 100 }} />
        )}
        {agendaBlocks.map((block) => {
          if (!block.visible && !agendaEditMode) return null
          let content: React.ReactNode = null

          if (block.id === 'stats') {
            content = (
              <div className="grid grid-cols-2 gap-3 h-full">
                {[
                  { label: 'Hoje', value: agendHoje, Icon: CalendarDays, color: 'text-primary-600', iconBg: 'bg-primary-100' },
                  { label: 'No período', value: filtradas.length, Icon: Clock, color: 'text-violet-600', iconBg: 'bg-violet-100' },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col h-full">
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
                <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5 flex-1 min-h-0 flex flex-col">
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
                        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
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
              <div className="flex flex-col h-full gap-4">
                <div className="relative shrink-0">
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
                  <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
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
          }

          if (!content) return null

          const bx = agendaLivePos[block.id]?.x ?? block.x
          const by = agendaLivePos[block.id]?.y ?? block.y
          const bw = agendaLiveW[block.id] ?? block.w
          const bh = agendaLiveH[block.id] ?? block.h
          return (
            <div
              key={block.id}
              style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, overflow: 'hidden', zIndex: agendaDragActiveId === block.id || agendaResizeActiveId === block.id ? 50 : 1, transition: agendaDragActiveId === block.id || agendaResizeActiveId === block.id ? 'none' : 'left 0.15s ease, top 0.15s ease', ...(agendaEditMode ? { touchAction: 'none' } : {}) }}
              className={`flex flex-col ${agendaEditMode ? 'cursor-grab active:cursor-grabbing select-none ring-2 ring-dashed ring-primary-400/40 rounded-2xl' : ''} ${agendaEditMode && agendaDragActiveId !== block.id && agendaResizeActiveId !== block.id ? 'animate-wiggle' : ''} ${agendaEditMode && !block.visible ? 'opacity-40' : ''}`}
              onPointerDown={agendaEditMode ? (e) => {
                e.preventDefault()
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                setAgendaDragActiveId(block.id)
                agendaDragDataRef.current = { id: block.id, offsetX: e.clientX - bx, offsetY: e.clientY - by, curX: bx, curY: by }
              } : undefined}
              onPointerMove={agendaEditMode ? (e) => {
                if (!agendaDragDataRef.current || agendaDragDataRef.current.id !== block.id) return
                const cw = getAgendaContainerWidth()
                if (cw === 0) return
                const cands = getSnapCandidates(block.id, agendaBlocks, cw)
                let newX = snapValue(Math.max(0, e.clientX - agendaDragDataRef.current.offsetX), cands.x)
                let newY = snapValue(Math.max(0, e.clientY - agendaDragDataRef.current.offsetY), cands.y)
                newX = Math.max(0, Math.min(newX, cw - (agendaLiveW[block.id] ?? block.w)))
                newY = Math.max(0, newY)
                const curW = agendaLiveW[block.id] ?? block.w
                const curH = agendaLiveH[block.id] ?? block.h
                const prevX = agendaLivePos[block.id]?.x ?? block.x
                const prevY = agendaLivePos[block.id]?.y ?? block.y
                const others = agendaBlocks.filter(o => o.id !== block.id && o.visible)
                const testXY = { ...block, x: newX, y: newY, w: curW, h: curH }
                if (others.some(o => overlaps(testXY, o))) {
                  const testXOnly = { ...block, x: newX, y: prevY, w: curW, h: curH }
                  const testYOnly = { ...block, x: prevX, y: newY, w: curW, h: curH }
                  if (others.some(o => overlaps(testXOnly, o))) newX = prevX
                  if (others.some(o => overlaps(testYOnly, o))) newY = prevY
                }
                agendaDragDataRef.current.curX = newX
                agendaDragDataRef.current.curY = newY
                setAgendaLivePos(prev => ({ ...prev, [block.id]: { x: newX, y: newY } }))
                setAgendaSnapLines({ x: newX !== (e.clientX - agendaDragDataRef.current.offsetX) ? newX : undefined, y: newY !== (e.clientY - agendaDragDataRef.current.offsetY) ? newY : undefined })
              } : undefined}
              onPointerUp={agendaEditMode ? (e) => {
                ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                setAgendaDragActiveId(null)
                const ddata = agendaDragDataRef.current
                if (ddata && ddata.id === block.id) {
                  const cw2 = getAgendaContainerWidth() || 9999
                  const finalBlocks = agendaBlocks.map(b => clampBlock({ ...b, x: agendaLivePos[b.id]?.x ?? b.x, y: agendaLivePos[b.id]?.y ?? b.y, w: agendaLiveW[b.id] ?? b.w, h: agendaLiveH[b.id] ?? b.h }, cw2))
                  salvarAgendaBlocks(finalBlocks)
                  setAgendaLivePos({}); setAgendaLiveW({}); setAgendaLiveH({}); setAgendaSnapLines({})
                  agendaDragDataRef.current = null
                }
              } : undefined}
            >
              <div className="flex-1 min-h-0 overflow-auto">
                {content}
              </div>
              {agendaEditMode && (
                <div
                  className="absolute bottom-1 right-1 w-9 h-9 bg-gray-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-nwse-resize z-30 select-none"
                  style={{ touchAction: 'none' }}
                  title="Arrastar para redimensionar"
                  onPointerDown={(e) => {
                    e.preventDefault(); e.stopPropagation()
                    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                    setAgendaResizeActiveId(block.id)
                    agendaResizeDataRef.current = { id: block.id, startClientX: e.clientX, startClientY: e.clientY, startW: bw, startH: bh, curW: bw, curH: bh }
                  }}
                  onPointerMove={(e) => {
                    if (!agendaResizeDataRef.current || agendaResizeDataRef.current.id !== block.id) return
                    const cw = getAgendaContainerWidth()
                    if (cw === 0) return
                    const rawW = Math.max(200, agendaResizeDataRef.current.startW + (e.clientX - agendaResizeDataRef.current.startClientX))
                    const rawH = Math.max(120, agendaResizeDataRef.current.startH + (e.clientY - agendaResizeDataRef.current.startClientY))
                    const cands = getSnapCandidates(block.id, agendaBlocks, cw)
                    let newW = Math.max(200, snapValue(block.x + rawW, cands.x) - block.x)
                    let newH = Math.max(120, snapValue(block.y + rawH, cands.y) - block.y)
                    newW = Math.min(newW, cw - block.x)
                    const prevW = agendaLiveW[block.id] ?? block.w
                    const prevH = agendaLiveH[block.id] ?? block.h
                    const others = agendaBlocks.filter(o => o.id !== block.id && o.visible)
                    const testWH = { ...block, w: newW, h: newH }
                    if (others.some(o => overlaps(testWH, o))) {
                      const testWOnly = { ...block, w: newW, h: prevH }
                      const testHOnly = { ...block, w: prevW, h: newH }
                      if (others.some(o => overlaps(testWOnly, o))) newW = prevW
                      if (others.some(o => overlaps(testHOnly, o))) newH = prevH
                    }
                    agendaResizeDataRef.current.curW = newW
                    agendaResizeDataRef.current.curH = newH
                    setAgendaLiveW(prev => ({ ...prev, [block.id]: newW }))
                    setAgendaLiveH(prev => ({ ...prev, [block.id]: newH }))
                  }}
                  onPointerUp={(e) => {
                    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                    setAgendaResizeActiveId(null)
                    setAgendaSnapLines({})
                    const rdata = agendaResizeDataRef.current
                    if (rdata && rdata.id === block.id) {
                      const cw2 = getAgendaContainerWidth() || 9999
                      const finalBlocks = agendaBlocks.map(b => clampBlock({ ...b, x: agendaLivePos[b.id]?.x ?? b.x, y: agendaLivePos[b.id]?.y ?? b.y, w: agendaLiveW[b.id] ?? b.w, h: agendaLiveH[b.id] ?? b.h }, cw2))
                      salvarAgendaBlocks(finalBlocks)
                      setAgendaLivePos({}); setAgendaLiveW({}); setAgendaLiveH({})
                      agendaResizeDataRef.current = null
                    }
                  }}
                >
                  <GripVertical size={12} className="text-white/70 -rotate-90" />
                </div>
              )}
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
