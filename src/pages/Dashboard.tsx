import { useEffect, useState, useMemo, useRef } from 'react'
import { snapValue, getSnapCandidates, calcularAlturaTotal, clampBlock, overlaps, autoArranjarBlocks } from '../utils/dashboardLayout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fmt as formatCurrencyUtil } from '../lib/utils'
import { useCloudSync, useCloudSyncSingle } from '../hooks/useCloudSync'
import {
  ShoppingCart,
  CalendarPlus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Trophy,
  ArrowRight,
  Pencil,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  RotateCcw,
  LayoutGrid,
  X,
  Wand2,
  FileText,
} from 'lucide-react'
import { useBrand } from '../contexts/BrandContext'
import { useSubUsuario } from '../contexts/SubUsuarioContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'
import AgendaSemanal from '../components/AgendaSemanal'
import { getFeriadosDoAno, getFeriadoDoDia } from '../utils/feriados'

function getSaudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'bom dia'
  if (hora < 18) return 'boa tarde'
  return 'boa noite'
}

const formatCurrency = formatCurrencyUtil

// Constantes da Agenda Semanal
const AGENDA_ROW_H = 48
const AGENDA_HORA_INICIO = 7

const DASHBOARD_VERSION = 5

function calcularAlturaCalendario(mesAtual: Date): number {
  const feriados = getFeriadosDoAno(mesAtual.getFullYear())
  const mesStr = String(mesAtual.getMonth() + 1).padStart(2, '0')
  const feriadosDoMes = feriados.filter(f => f.data.startsWith(mesStr + '-'))

  const HEADER_H = 52
  const GRID_H = 6 * 44
  const LEGENDA_H = 36
  const TITULO_FERIADOS_H = feriadosDoMes.length > 0 ? 28 : 0
  const FERIADO_H = 28
  const PADDING_H = 40

  return HEADER_H + GRID_H + LEGENDA_H + TITULO_FERIADOS_H + feriadosDoMes.length * FERIADO_H + PADDING_H
}

// Card wrapper reutilizável estilo Omie
function Card({ children, className = '', destino }: { children: React.ReactNode; className?: string; destino?: string }) {
  return (
    <div className={`card-responsive relative group h-full flex flex-col ${className}`}>
      {children}
      {destino && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <ArrowRight size={12} className="text-gray-400" />
          </div>
        </div>
      )}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-gray-900 mb-4">{children}</h3>
}


// Componente do Calendário
function Calendario({
  mesAtual,
  setMesAtual,
  agendamentosNoDia,
}: {
  mesAtual: Date
  setMesAtual: (d: Date) => void
  agendamentosNoDia: (d: Date) => number
}) {
  const inicioMes = startOfMonth(mesAtual)
  const fimMes = endOfMonth(mesAtual)
  const dias = eachDayOfInterval({ start: inicioMes, end: fimMes })
  const diaInicioSemana = getDay(inicioMes)
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const feriados = useMemo(() => getFeriadosDoAno(mesAtual.getFullYear()), [mesAtual.getFullYear()])

  const feriadosDoMes = useMemo(() => {
    const mesStr = String(mesAtual.getMonth() + 1).padStart(2, '0')
    return feriados.filter(f => f.data.startsWith(mesStr + '-')).sort((a, b) => a.data.localeCompare(b.data))
  }, [feriados, mesAtual.getMonth()])

  return (
    <Card destino="/agenda">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 capitalize">
          {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setMesAtual(subMonths(mesAtual, 1)) }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMesAtual(addMonths(mesAtual, 1)) }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {diasSemana.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2">
            {d}
          </div>
        ))}
        {Array.from({ length: diaInicioSemana }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {dias.map((dia) => {
          const ehHoje = isToday(dia)
          const temAgendamento = agendamentosNoDia(dia) > 0
          const feriado = getFeriadoDoDia(dia, feriados)
          const ehDomingo = getDay(dia) === 0
          return (
            <button
              key={dia.toISOString()}
              title={feriado ? feriado.nome : undefined}
              className={`relative text-xs sm:text-sm py-2.5 sm:py-2 rounded-xl font-medium transition-all min-h-[44px] ${
                ehHoje
                  ? 'bg-primary-500 text-on-primary font-bold shadow-md shadow-primary-500/30'
                  : feriado?.tipo === 'nacional'
                    ? 'bg-danger-50 text-danger-600 font-semibold hover:bg-danger-100'
                    : feriado?.tipo === 'regional'
                      ? 'bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100'
                      : ehDomingo
                        ? 'text-danger-400 hover:bg-gray-50'
                        : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {format(dia, 'd')}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                {feriado?.tipo === 'nacional' && !ehHoje && <span className="w-1 h-1 bg-danger-500 rounded-full" />}
                {feriado?.tipo === 'regional' && !ehHoje && <span className="w-1 h-1 bg-blue-500 rounded-full" />}
                {temAgendamento && <span className="w-1 h-1 bg-primary-500 rounded-full" />}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-danger-500 rounded-full" />
          <span className="text-[10px] text-gray-400">Nacional</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-[10px] text-gray-400">Regional</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-primary-500 rounded-full" />
          <span className="text-[10px] text-gray-400">Agendamento</span>
        </div>
      </div>

      {/* Feriados do mês */}
      {feriadosDoMes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Feriados de {format(mesAtual, 'MMMM', { locale: ptBR })}</p>
          {feriadosDoMes.map((f) => (
            <div key={f.data + f.nome} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.tipo === 'nacional' ? 'bg-danger-500' : 'bg-blue-500'}`} />
              <span className="text-[11px] text-gray-500 font-medium w-5">{f.data.split('-')[1]}</span>
              <span className="text-[11px] text-gray-700">{f.nome}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${f.tipo === 'nacional' ? 'bg-danger-50 text-danger-500' : 'bg-blue-50 text-blue-500'}`}>{f.tipo === 'nacional' ? 'Nacional' : 'Regional'}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Componente do Gráfico de Vendas
function GraficoVendas({ vendasMes }: { vendasMes: number }) {
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const valores = [0, 0, vendasMes, 0, 0, 0, 0]
  const max = Math.max(...valores, 1)

  const formasPagamento = [
    { label: 'Pix', color: 'bg-primary-500' },
    { label: 'Crédito', color: 'bg-blue-400' },
    { label: 'Débito', color: 'bg-violet-400' },
    { label: 'Dinheiro', color: 'bg-success-400' },
    { label: 'Boleto', color: 'bg-warning-400' },
  ]

  return (
    <Card destino="/vendas">
      <div className="flex items-center justify-between mb-1">
        <CardTitle>Resumo das vendas</CardTitle>
        <span className="text-sm font-bold text-primary-600">
          {formatCurrency(vendasMes)}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        {formasPagamento.map((f) => (
          <div key={f.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${f.color}`} />
            <span className="text-[11px] text-gray-500">{f.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-3 flex-1 min-h-0">
        {diasSemana.map((dia, i) => (
          <div key={dia} className="flex-1 flex flex-col items-center gap-1.5 h-full">
            <div className="w-full flex flex-col justify-end flex-1 min-h-0">
              <div
                className={`w-full rounded-t-lg transition-all ${
                  valores[i] > 0 ? 'bg-primary-500' : 'bg-gray-100'
                }`}
                style={{ height: `${Math.max((valores[i] / max) * 100, 6)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-medium shrink-0">{dia}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Componente do Resumo Financeiro
function ResumoFinanceiro({ entradas, saidas, saldo }: { entradas: number; saidas: number; saldo: number }) {
  return (
    <Card destino="/financeiro">
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Resumo financeiro</CardTitle>
        <span className="text-xs text-gray-400">Este mês</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-success-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-success-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-success-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Entradas</p>
              <p className="text-[10px] text-gray-400">Vendas + receitas</p>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-success-600">{formatCurrency(entradas)}</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-danger-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-danger-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={18} className="text-danger-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Saídas</p>
              <p className="text-[10px] text-gray-400">Despesas do mês</p>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-danger-500">{formatCurrency(saidas)}</p>
        </div>

        <div className={`flex items-center justify-between p-3 rounded-xl ${saldo >= 0 ? 'bg-blue-50' : 'bg-warning-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100' : 'bg-warning-100'}`}>
              <CreditCard size={18} className={saldo >= 0 ? 'text-blue-600' : 'text-warning-600'} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Saldo</p>
              <p className="text-[10px] text-gray-400">Entradas - Saídas</p>
            </div>
          </div>
          <p className={`text-base sm:text-lg font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-warning-600'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>
    </Card>
  )
}


type BlockId = 'calendario' | 'grafico_vendas' | 'resumo_financeiro' | 'agenda_semanal' | 'vendas_pagamento' | 'top_clientes' | 'sua_empresa' | 'agendamentos_hoje'

const BLOCK_NAVEGACAO: Partial<Record<BlockId, string>> = {
  calendario:        '/agenda',
  grafico_vendas:    '/vendas',
  resumo_financeiro: '/financeiro',
  agenda_semanal:    '/agenda',
  vendas_pagamento:  '/vendas',
  top_clientes:      '/clientes',
  sua_empresa:       '/configuracoes',
  agendamentos_hoje: '/agenda',
}

interface BlockConfig {
  id: BlockId
  label: string
  visible: boolean
  x: number
  y: number
  w: number
  h: number
}

function getDefaultBlocks(cw: number, agendaH: number = 852): BlockConfig[] {
  const half = Math.floor((cw - 8) / 2)
  const agH = agendaH
  return [
    { id: 'calendario',        label: 'Calendário',           visible: true, x: 0,        y: 0,             w: half, h: agH },
    { id: 'agenda_semanal',    label: 'Agenda Semanal',       visible: true, x: half + 8, y: 0,             w: half, h: agH },
    { id: 'grafico_vendas',    label: 'Gráfico de Vendas',    visible: true, x: 0,        y: agH + 8,       w: half, h: 320 },
    { id: 'resumo_financeiro', label: 'Resumo Financeiro',    visible: true, x: half + 8, y: agH + 8,       w: half, h: 320 },
    { id: 'vendas_pagamento',  label: 'Vendas por Pagamento', visible: true, x: 0,        y: agH + 336,     w: half, h: 280 },
    { id: 'top_clientes',      label: 'Top Clientes',         visible: true, x: half + 8, y: agH + 336,     w: half, h: 280 },
    { id: 'sua_empresa',       label: 'Sua Empresa',          visible: true, x: 0,        y: agH + 624,     w: half, h: 160 },
    { id: 'agendamentos_hoje', label: 'Agendamentos Hoje',    visible: true, x: half + 8, y: agH + 624,     w: half, h: 160 },
  ]
}
const DEFAULT_BLOCKS = getDefaultBlocks(1200)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mesAtual, setMesAtual] = useState(new Date())
  const gridRef = useRef<HTMLDivElement>(null)
  const calendarioRef = useRef<HTMLDivElement>(null)
  const agendaRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [alturaRealCalendario, setAlturaRealCalendario] = useState(0)
  const [alturaRealAgenda, setAlturaRealAgenda] = useState(0)
  const [alturaAgendaOverride, setAlturaAgendaOverride] = useState<number>(0)
  useEffect(() => {
    const update = () => { if (gridRef.current) setContainerWidth(gridRef.current.offsetWidth) }
    update()
    const ro = new ResizeObserver(update)
    if (gridRef.current) ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])
  const getContainerWidth = () => gridRef.current?.clientWidth ?? containerWidth ?? 0

  // Medir altura real do calendário via ResizeObserver
  useEffect(() => {
    if (!calendarioRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 100) setAlturaRealCalendario(Math.round(h))
      }
    })
    ro.observe(calendarioRef.current)
    return () => ro.disconnect()
  }, [])

  // Medir altura real da agenda via ResizeObserver
  useEffect(() => {
    if (!agendaRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 100) setAlturaRealAgenda(Math.round(h))
      }
    })
    ro.observe(agendaRef.current)
    return () => ro.disconnect()
  }, [])

  // Sincronizar altura da agenda com a do calendário
  useEffect(() => {
    if (alturaRealCalendario > 100) {
      setAlturaAgendaOverride(alturaRealCalendario)
    }
  }, [alturaRealCalendario])

  // Altura real da primeira linha = max entre calendário e agenda medidos
  const alturaRealLinhaTopo = (alturaRealCalendario > 100 && alturaRealAgenda > 100)
    ? Math.max(alturaRealCalendario, alturaRealAgenda)
    : 0

  // Block customization
  const { data: blocksCloud, save: salvarBlocksCloud } = useCloudSyncSingle<{ blocks: BlockConfig[] }>({ table: 'dashboard_blocks', storageKey: 'dashboard_blocks', defaultValue: { blocks: DEFAULT_BLOCKS }, dataField: 'blocks' })
  const [editMode, setEditMode] = useState(false)
  const [showCardManager, setShowCardManager] = useState(false)

  const salvarBlocks = (b: BlockConfig[]) => { salvarBlocksCloud([...b, { _version: DASHBOARD_VERSION }] as any) }

  const toggleVisible = (id: BlockId) => {
    salvarBlocks(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b))
  }

  const resetBlocks = () => salvarBlocks([...getDefaultBlocks(getContainerWidth() || window.innerWidth, alturaLinhaCalendario)])

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const resizeDataRef = useRef<{ id: BlockId; startClientX: number; startClientY: number; startW: number; startH: number; curW: number; curH: number } | null>(null)
  const dragDataRef = useRef<{ id: BlockId; offsetX: number; offsetY: number; curX: number; curY: number } | null>(null)
  const [liveW, setLiveW] = useState<Partial<Record<BlockId, number>>>({})
  const [liveH, setLiveH] = useState<Partial<Record<BlockId, number>>>({})
  const [livePos, setLivePos] = useState<Partial<Record<BlockId, { x: number; y: number }>>>({})
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({})
  const [dragActiveId, setDragActiveId] = useState<BlockId | null>(null)
  const [resizeActiveId, setResizeActiveId] = useState<BlockId | null>(null)

  const { brand } = useBrand()
  const { subUsuarioAtivo } = useSubUsuario()
  const nomeUsuario = subUsuarioAtivo?.nome || brand.nome_usuario || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'
  const hoje = new Date()
  const diaSemana = format(hoje, "EEEE", { locale: ptBR })
  const dataFormatada = format(hoje, "d 'de' MMMM", { locale: ptBR })

  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange, periodoLabel } = useDateRange()

  // Dados sincronizados via cloud
  const { data: vendas } = useCloudSync<any>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos } = useCloudSync<any>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: clientes } = useCloudSync<any>({ table: 'clientes', storageKey: 'clientes' })
  const { data: financeiro } = useCloudSync<any>({ table: 'financeiro', storageKey: 'financeiro' })
  const { data: preVendas } = useCloudSync<any>({ table: 'pre_vendas', storageKey: 'pre_vendas' })
  
  // Métricas financeiras do período
  const vendasMes = useMemo(() => vendas.filter((v: any) => isInRange(v.data_venda)).reduce((a: number, v: any) => a + (v.valor || 0), 0), [vendas, isInRange])
  const entradasMes = useMemo(() => financeiro.filter((f: any) => f.tipo === 'entrada' && isInRange(f.data)).reduce((a: number, f: any) => a + (f.valor || 0), 0), [financeiro, isInRange])
  const saidasMes = useMemo(() => financeiro.filter((f: any) => f.tipo === 'saida' && isInRange(f.data)).reduce((a: number, f: any) => a + (f.valor || 0), 0), [financeiro, isInRange])
  const saldoMes = vendasMes + entradasMes - saidasMes

  // Top 5 clientes por gasto no período
  const topClientes = useMemo(() => {
    const map: Record<string, { nome: string; total: number; count: number }> = {}
    vendas.filter((v: any) => isInRange(v.data_venda)).forEach((v: any) => {
      const key = v.nome_cliente || 'Sem nome'
      if (!map[key]) map[key] = { nome: key, total: 0, count: 0 }
      map[key].total += v.valor || 0
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [vendas, isInRange])

  // Semana atual para calendário semanal
  const [semanaOffset, setSemanaOffset] = useState(0)
  const inicioSemana = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 }) // Começa na segunda
    return addDays(base, semanaOffset * 7)
  }, [semanaOffset])
  const diasDaSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i)), [inicioSemana])

  // Agendamentos da semana para o calendário semanal
  const agendamentosDaSemana = useMemo(() => {
    const semIni = diasDaSemana[0]
    const semFim = addDays(diasDaSemana[6], 1)
    return agendamentos.filter((a: any) => {
      if (!a.data_hora) return false
      const inicio = new Date(a.data_hora)
      const durMin = a.duracao_min || 60
      const fim = a.data_hora_fim ? new Date(a.data_hora_fim) : new Date(inicio.getTime() + durMin * 60000)
      return inicio < semFim && fim > semIni
    })
  }, [agendamentos, diasDaSemana])

  // Hora final dinâmica da agenda baseada nos agendamentos da semana
  const horaFinalAgenda = useMemo(() => {
    const HORA_MIN = 18
    const HORA_MAX = 22
    if (agendamentosDaSemana.length === 0) return HORA_MIN
    let maiorHora = HORA_MIN
    agendamentosDaSemana.forEach((a: any) => {
      let horaFim: number
      if (a.data_hora_fim) {
        const fim = new Date(a.data_hora_fim)
        horaFim = fim.getHours() + fim.getMinutes() / 60
      } else {
        const inicio = new Date(a.data_hora)
        const durMin = a.duracao_min || 60
        const fim = new Date(inicio.getTime() + durMin * 60000)
        horaFim = fim.getHours() + fim.getMinutes() / 60
      }
      maiorHora = Math.max(maiorHora, Math.ceil(horaFim) + 1)
    })
    return Math.min(maiorHora, HORA_MAX)
  }, [agendamentosDaSemana])

  const alturaCardAgenda = useMemo(() => {
    const totalHoras = horaFinalAgenda - AGENDA_HORA_INICIO
    const gridH = AGENDA_ROW_H * totalHoras
    return gridH + 80 + 44 + 32
  }, [horaFinalAgenda])

  const alturaLinhaCalendario = useMemo(() => {
    const altCal = calcularAlturaCalendario(mesAtual)
    const altAg = alturaCardAgenda
    return Math.max(altCal, altAg)
  }, [mesAtual, alturaCardAgenda])

  const blocks = useMemo(() => {
    const cw = containerWidth || window.innerWidth - 80
    const saved = (blocksCloud as any) as BlockConfig[] | undefined
    const savedVersion = Array.isArray(saved) ? (saved as any[]).find((b: any) => b._version)?._version : undefined
    if (!Array.isArray(saved) || saved.length === 0 || savedVersion !== DASHBOARD_VERSION) {
      return getDefaultBlocks(cw, alturaLinhaCalendario)
    }
    const raw: BlockConfig[] = DEFAULT_BLOCKS.map(d => { const s = (saved as any[]).find((b: any) => b.id === d.id); if (!s) return d; return { ...d, visible: s.visible ?? d.visible, x: s.x ?? d.x, y: s.y ?? d.y, w: s.w ?? d.w, h: s.h ?? d.h } as BlockConfig })
    const seen = new Set<string>()
    const final = raw.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true }).map(b => clampBlock(b, cw))
    const temSobreposicao = final.some((a, i) => final.slice(i + 1).some(b => a.visible && b.visible && overlaps(a, b)))
    if (temSobreposicao && containerWidth > 0) {
      setTimeout(() => salvarBlocks(getDefaultBlocks(containerWidth, alturaLinhaCalendario)), 0)
      return getDefaultBlocks(containerWidth, alturaLinhaCalendario)
    }
    return final
  }, [blocksCloud, containerWidth, alturaLinhaCalendario])

  // Atualizar altura e posição dos blocos quando a altura real muda (view mode)
  // Em edit mode, manter alturaLinhaCalendario (teórica) para permitir resize manual
  useEffect(() => {
    if (!containerWidth) return
    const alturaFonte = (!editMode && alturaRealLinhaTopo > 0)
      ? alturaRealLinhaTopo
      : alturaLinhaCalendario
    if (alturaFonte === 0) return
    const blocoAgenda = blocks.find(b => b.id === 'agenda_semanal')
    const blocoCalendario = blocks.find(b => b.id === 'calendario')
    const agendaDiferente = blocoAgenda && Math.abs(blocoAgenda.h - alturaFonte) > 10
    const calendarioDiferente = blocoCalendario && Math.abs(blocoCalendario.h - alturaFonte) > 10
    if (!agendaDiferente && !calendarioDiferente) return
    const alturaAntiga = blocoAgenda?.h ?? alturaFonte
    const diff = alturaFonte - alturaAntiga
    const novosBlocks = blocks.map(b => {
      if (b.id === 'agenda_semanal' || b.id === 'calendario') {
        return { ...b, h: alturaFonte }
      }
      if (b.y > alturaAntiga / 2) {
        return { ...b, y: b.y + diff }
      }
      return b
    })
    salvarBlocks(novosBlocks)
  }, [alturaLinhaCalendario, alturaRealLinhaTopo, containerWidth, editMode])


  // Vendas por forma de pagamento
  const vendasPorForma = useMemo(() => {
    const map: Record<string, number> = {}
    vendas.filter((v: any) => isInRange(v.data_venda)).forEach((v: any) => {
      const fp = v.forma_pagamento || 'outro'
      map[fp] = (map[fp] || 0) + (v.valor || 0)
    })
    return map
  }, [vendas, isInRange])

  // Agendamentos no dia (para calendário)
  const agendamentosNoDia = (dia: Date) => {
    const dStr = format(dia, 'yyyy-MM-dd')
    return agendamentos.filter((a: any) => (a.data_hora || '').startsWith(dStr)).length
  }

  // Métricas rápidas
  const agendamentosHoje = useMemo(() => {
    const hojeStr = format(new Date(), 'yyyy-MM-dd')
    return agendamentos.filter((a: any) => (a.data_hora || '').startsWith(hojeStr) && a.status !== 'cancelado').length
  }, [agendamentos])

  const vendasMesAtual = useMemo(() => {
    const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fim = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    return vendas.filter((v: any) => v.data_venda >= inicio && v.data_venda <= fim).reduce((a: number, v: any) => a + (v.valor_total || v.valor || 0), 0)
  }, [vendas])

  const orcamentosPendentes = useMemo(() => (preVendas || []).filter((pv: any) => pv.status === 'pendente').length, [preVendas])

  const agendamentosDeHoje = useMemo(() => {
    const hojeStr = format(new Date(), 'yyyy-MM-dd')
    return agendamentos
      .filter((a: any) => (a.data_hora || '').startsWith(hojeStr))
      .sort((a: any, b: any) => a.data_hora.localeCompare(b.data_hora))
      .slice(0, 5)
  }, [agendamentos])




  
  // Render a block by ID
  const renderBlock = (id: BlockId) => {
    switch (id) {
      case 'calendario': return (
        <div ref={calendarioRef} className="h-full">
          <Calendario mesAtual={mesAtual} setMesAtual={setMesAtual} agendamentosNoDia={agendamentosNoDia} />
        </div>
      )
      case 'grafico_vendas': return <GraficoVendas vendasMes={vendasMes} />
      case 'resumo_financeiro': return <ResumoFinanceiro entradas={vendasMes + entradasMes} saidas={saidasMes} saldo={saldoMes} />
      case 'agenda_semanal': return renderAgendaSemanal()
      case 'vendas_pagamento': return renderVendasPagamento()
      case 'top_clientes': return renderTopClientes()
      case 'sua_empresa': return renderEmpresa()
      case 'agendamentos_hoje': return renderAgendamentosHoje()
      default: return null
    }
  }

  const renderAgendaSemanal = () => (
    <div ref={agendaRef} className="h-full">
      <AgendaSemanal
        diasDaSemana={diasDaSemana}
        agendamentosDaSemana={agendamentosDaSemana}
        semanaOffset={semanaOffset}
        onSemanaChange={setSemanaOffset}
        horaFinal={horaFinalAgenda}
      />
    </div>
  )

  const renderVendasPagamento = () => (
    <Card destino="/vendas">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Vendas por pagamento</CardTitle>
          <span className="text-xs text-gray-400">{periodoLabel}</span>
        </div>
        {Object.keys(vendasPorForma).length > 0 ? (
          <div className="space-y-2">
            {[
              { key: 'pix', label: 'Pix', color: 'bg-primary-500' },
              { key: 'credito', label: 'Crédito', color: 'bg-blue-400' },
              { key: 'debito', label: 'Débito', color: 'bg-violet-400' },
              { key: 'dinheiro', label: 'Dinheiro', color: 'bg-success-400' },
              { key: 'boleto', label: 'Boleto', color: 'bg-warning-400' },
              { key: 'transferencia', label: 'Transferência', color: 'bg-rose-400' },
            ].filter(f => vendasPorForma[f.key]).map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${f.color} shrink-0`} />
                <span className="text-xs text-gray-600 w-24">{f.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${f.color} h-2 rounded-full`} style={{ width: `${Math.max((vendasPorForma[f.key] / vendasMes) * 100, 4)}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-20 text-right">{formatCurrency(vendasPorForma[f.key])}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhuma venda registrada este mês.</p>
        )}
    </Card>
  )

  const renderTopClientes = () => (
    <Card destino="/clientes">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-warning-500" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Top 5 clientes que mais gastaram</h4>
          </div>
          <span className="text-xs text-gray-400">{periodoLabel}</span>
        </div>
        {topClientes.length > 0 ? (
          <div className="space-y-3">
            {topClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-warning-100 text-warning-600' : 'bg-gray-100 text-gray-500'}`}>
                  {c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                  <p className="text-[10px] text-gray-400">{c.count} transaç{c.count === 1 ? 'ão' : 'ões'} • {formatCurrency(c.total)}</p>
                </div>
                {i === 0 && <span className="text-[10px] font-bold text-warning-500 bg-warning-50 px-2 py-0.5 rounded-full">Top 1</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma venda registrada ainda</p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/vendas') }}
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              Registrar primeira venda
              <ArrowRight size={14} />
            </button>
          </div>
        )}
    </Card>
  )

  const renderAgendamentosHoje = () => (
    <Card destino="/agenda">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <CalendarPlus size={16} className="text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Hoje</h4>
            <p className="text-[10px] text-gray-400">
              {agendamentosDeHoje.length === 0 ? 'Sem agendamentos' : `${agendamentosDeHoje.length} agendamento${agendamentosDeHoje.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); navigate('/agenda') }} className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
          Ver todos <ArrowRight size={12} />
        </button>
      </div>
      {agendamentosDeHoje.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-gray-400">Nenhum agendamento para hoje</p>
          <button onClick={(e) => { e.stopPropagation(); navigate('/agenda') }} className="mt-2 text-xs font-bold text-primary-600 hover:text-primary-700">+ Novo agendamento</button>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100%-80px)] overflow-y-auto">
          {agendamentosDeHoje.map((ag: any) => {
            const cor = ag.cor || '#4285F4'
            return (
              <div key={ag.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">{ag.nome_cliente}</p>
                  <p className="text-[10px] text-gray-400">
                    {format(new Date(ag.data_hora), 'HH:mm')}
                    {ag.servico && ` • ${ag.servico}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(() => {
                    const v = ag.venda_id ? vendas.find((x: any) => x.id === ag.venda_id) : undefined
                    const sp = v?.status_pagamento
                    if (ag.status === 'concluido' && !v) return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning-50 text-warning-600">$</span>
                    if (sp === 'pendente') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning-50 text-warning-600">$</span>
                    if (sp === 'parcial') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">½</span>
                    return null
                  })()}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    ag.status === 'confirmado' ? 'bg-blue-50 text-blue-600' :
                    ag.status === 'em_andamento' ? 'bg-warning-50 text-warning-600' :
                    ag.status === 'concluido' ? 'bg-success-50 text-success-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {ag.status === 'confirmado' ? 'Confirmado' :
                     ag.status === 'em_andamento' ? 'Em andamento' :
                     ag.status === 'concluido' ? 'Concluído' :
                     'Pendente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )

  const renderEmpresa = () => {
    const totalVendasHoje = vendas.filter((v: any) =>
      (v.data_venda || '').startsWith(format(new Date(), 'yyyy-MM-dd'))
    ).reduce((a: number, v: any) => a + (v.valor_total || v.valor || 0), 0)

    return (
      <Card destino="/configuracoes">
        <div className="flex items-center gap-3 mb-4">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain border border-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary-500/15">
              <Building2 size={22} className="text-primary-500" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-gray-900">{brand.nome_empresa || 'Minha Empresa'}</h4>
            {brand.slogan && <p className="text-[11px] text-gray-400">{brand.slogan}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Clientes', value: clientes.length, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Vendas hoje', value: formatCurrency(totalVendasHoje), color: 'text-success-600', bg: 'bg-success-50' },
            { label: 'Agendamentos', value: agendamentos.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
              <p className="text-[9px] font-medium text-gray-500 mb-0.5">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Saudação + Ações */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            Olá {nomeUsuario}, {getSaudacao()}!
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">
            Hoje é dia {dataFormatada}, {diaSemana}
          </p>
        </div>
        {/*
         * Layout das ações:
         * <sm (320-639): grid 2 cols. Ícones [Pencil][LayoutGrid] dividem 1 linha,
         *   "Nova Venda" col-span-2 (full-width, primário destacado),
         *   [Agendamento][Orçamento] dividem outra linha.
         * sm-lg (640-1023): grid 5 cols (2 ícones + 3 ações).
         * lg+ (1024+): flex inline.
         */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:flex lg:flex-row gap-2 w-full lg:w-auto min-w-0">
          <button
            onClick={() => setShowCardManager(!showCardManager)}
            title="Gerenciar cards"
            className="p-2 rounded-xl transition-colors bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 flex items-center justify-center min-w-0"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            title={editMode ? 'Concluir edição' : 'Editar painel'}
            className={`p-2 rounded-xl transition-colors flex items-center justify-center min-w-0 ${
              editMode
                ? 'bg-success-500 hover:bg-success-600 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            {editMode ? <Check size={16} /> : <Pencil size={16} />}
          </button>
          {!editMode && (
            <>
              <button
                onClick={() => navigate('/vendas')}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-full text-[11px] sm:text-xs font-bold transition-colors shadow-sm whitespace-nowrap active:scale-95 col-span-2 sm:col-span-1 min-w-0"
              >
                <ShoppingCart size={14} />
                <span className="truncate">Nova Venda</span>
              </button>
              <button
                onClick={() => navigate('/agenda')}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap active:scale-95 min-w-0"
              >
                <CalendarPlus size={14} />
                <span className="truncate">Agendamento</span>
              </button>
              <button
                onClick={() => navigate('/vendas')}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap active:scale-95 min-w-0"
              >
                <FileText size={14} />
                <span className="truncate">Orçamento</span>
              </button>
            </>
          )}
          {editMode && (
            <>
              <button
                onClick={() => {
                  const cw = getContainerWidth()
                  if (cw === 0) return
                  salvarBlocks(autoArranjarBlocks(blocks, cw))
                }}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap active:scale-95 col-span-2 sm:col-span-1 min-w-0"
              >
                <Wand2 size={14} />
                <span className="truncate">Organizar</span>
              </button>
              <button
                onClick={resetBlocks}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap active:scale-95 col-span-2 sm:col-span-2 min-w-0"
              >
                <RotateCcw size={14} />
                <span className="truncate">Resetar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Métricas rápidas */}
      {!editMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Agendamentos hoje', value: agendamentosHoje, icon: CalendarPlus, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100', onClick: () => navigate('/agenda') },
            { label: 'Vendas este mês', value: formatCurrency(vendasMesAtual), icon: ShoppingCart, color: 'text-success-600', bg: 'bg-success-50', iconBg: 'bg-success-100', onClick: () => navigate('/vendas') },
            { label: 'Total de clientes', value: clientes.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', iconBg: 'bg-violet-100', onClick: () => navigate('/clientes') },
            { label: 'Orçamentos pendentes', value: orcamentosPendentes, icon: FileText, color: 'text-warning-600', bg: 'bg-warning-50', iconBg: 'bg-warning-100', onClick: () => navigate('/vendas') },
          ].map((item) => (
            <button key={item.label} onClick={item.onClick}
              className={`${item.bg} rounded-2xl p-3 sm:p-4 text-left hover:brightness-95 transition-all active:scale-[0.98] border border-transparent hover:border-gray-100`}>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 ${item.iconBg} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                  <item.icon size={14} className={item.color} />
                </div>
                <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 leading-tight truncate">{item.label}</p>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${item.color}`}>{item.value}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filtro de período */}
      {!editMode && (
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

      {/* Card manager panel */}
      {showCardManager && (
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-700">Cards do painel</p>
            <button onClick={() => setShowCardManager(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {blocks.map(b => (
              <button
                key={b.id}
                onClick={() => toggleVisible(b.id)}
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

      {/* Dynamic blocks */}
      {isMobile ? (
        <div className="flex flex-col gap-4 sm:gap-6">
          {blocks.map((block) => {
            if (!block.visible && !editMode) return null
            const content = renderBlock(block.id)
            if (!content) return null
            const bh = liveH[block.id] ?? block.h
            return (
              <div
                key={block.id}
                style={editMode ? { height: bh } : undefined}
                className={`relative flex flex-col ${editMode ? 'pt-5' : ''} ${!editMode && BLOCK_NAVEGACAO[block.id] ? 'cursor-pointer' : ''} ${editMode && !block.visible ? 'opacity-40' : ''}`}
                onClick={!editMode && BLOCK_NAVEGACAO[block.id] ? () => navigate(BLOCK_NAVEGACAO[block.id]!) : undefined}
              >
                {editMode && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-xl whitespace-nowrap">
                    <span className="text-[9px] font-bold text-white/50 px-1">{block.label}</span>
                    <span className="w-px h-3 bg-white/20" />
                    <button title={block.visible ? 'Ocultar bloco' : 'Mostrar bloco'} onClick={() => toggleVisible(block.id)} className="p-1 text-white/70 hover:text-white rounded-full transition-colors active:scale-90">{block.visible ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                  </div>
                )}
                {content}
                {editMode && (
                  <div style={{ display: 'flex', gap: 6, padding: '4px 8px', marginTop: 4 }}>
                    {(['P', 'M', 'G', 'XG'] as const).map((label, i) => {
                      const heights = [200, 340, 480, 620]
                      return (
                        <button
                          key={label}
                          onClick={() => salvarBlocks(blocks.map(b => b.id === block.id ? { ...b, h: heights[i] } : b))}
                          style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(207,255,4,0.4)', background: 'transparent', color: 'rgba(207,255,4,0.8)', cursor: 'pointer' }}
                        >{label}</button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          ref={gridRef}
          className="relative w-full"
          style={{ height: calcularAlturaTotal(blocks.filter(b => b.visible || editMode), livePos, liveH) }}
        >
          {editMode && snapLines.x !== undefined && (
            <div style={{ position: 'absolute', left: snapLines.x, top: 0, bottom: 0, width: 1, background: 'rgba(207,255,4,0.4)', pointerEvents: 'none', zIndex: 100 }} />
          )}
          {editMode && snapLines.y !== undefined && (
            <div style={{ position: 'absolute', top: snapLines.y, left: 0, right: 0, height: 1, background: 'rgba(207,255,4,0.4)', pointerEvents: 'none', zIndex: 100 }} />
          )}
          {blocks.map((block) => {
            if (!block.visible && !editMode) return null
            const content = renderBlock(block.id)
            if (!content) return null
            const bx = livePos[block.id]?.x ?? block.x
            const by = livePos[block.id]?.y ?? block.y
            const bw = liveW[block.id] ?? block.w
            const bhRaw = liveH[block.id] ?? block.h
            const bh = !editMode && block.id === 'calendario'
              ? 'auto' as any
              : !editMode && block.id === 'agenda_semanal' && alturaAgendaOverride > 0
                ? alturaAgendaOverride
                : bhRaw
            return (
              <div
                key={block.id}
                data-block-id={block.id}
                style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, overflow: block.id === 'agenda_semanal' ? 'visible' : 'hidden', zIndex: dragActiveId === block.id || resizeActiveId === block.id ? 50 : 1, transition: dragActiveId === block.id || resizeActiveId === block.id ? 'none' : 'left 0.15s ease, top 0.15s ease', ...(editMode ? { touchAction: 'none' } : {}) }}
                className={`flex flex-col ${editMode ? 'cursor-grab active:cursor-grabbing select-none ring-2 ring-dashed ring-primary-400/40 rounded-2xl' : BLOCK_NAVEGACAO[block.id] ? 'cursor-pointer' : ''} ${editMode && dragActiveId !== block.id && resizeActiveId !== block.id ? 'animate-wiggle' : ''} ${editMode && !block.visible ? 'opacity-40' : ''}`}
                onClick={!editMode && BLOCK_NAVEGACAO[block.id] ? () => navigate(BLOCK_NAVEGACAO[block.id]!) : undefined}
                onPointerDown={editMode ? (e) => {
                  e.preventDefault()
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  setDragActiveId(block.id)
                  dragDataRef.current = { id: block.id, offsetX: e.clientX - bx, offsetY: e.clientY - by, curX: bx, curY: by }
                } : undefined}
                onPointerMove={editMode ? (e) => {
                  if (!dragDataRef.current || dragDataRef.current.id !== block.id) return
                  const cw = getContainerWidth()
                  if (cw === 0) return
                  const cands = getSnapCandidates(block.id, blocks, cw)
                  let newX = snapValue(Math.max(0, e.clientX - dragDataRef.current.offsetX), cands.x)
                  let newY = snapValue(Math.max(0, e.clientY - dragDataRef.current.offsetY), cands.y)
                  newX = Math.max(0, Math.min(newX, cw - (liveW[block.id] ?? block.w)))
                  newY = Math.max(0, newY)
                  const curW = liveW[block.id] ?? block.w
                  const curH = liveH[block.id] ?? block.h
                  const prevX = livePos[block.id]?.x ?? block.x
                  const prevY = livePos[block.id]?.y ?? block.y
                  const others = blocks.filter(o => o.id !== block.id && o.visible)
                  const testXY = { ...block, x: newX, y: newY, w: curW, h: curH }
                  if (others.some(o => overlaps(testXY, o))) {
                    const testXOnly = { ...block, x: newX, y: prevY, w: curW, h: curH }
                    const testYOnly = { ...block, x: prevX, y: newY, w: curW, h: curH }
                    if (others.some(o => overlaps(testXOnly, o))) newX = prevX
                    if (others.some(o => overlaps(testYOnly, o))) newY = prevY
                  }
                  dragDataRef.current.curX = newX
                  dragDataRef.current.curY = newY
                  setLivePos(prev => ({ ...prev, [block.id]: { x: newX, y: newY } }))
                  setSnapLines({ x: newX !== (e.clientX - dragDataRef.current.offsetX) ? newX : undefined, y: newY !== (e.clientY - dragDataRef.current.offsetY) ? newY : undefined })
                } : undefined}
                onPointerUp={editMode ? (e) => {
                  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                  setDragActiveId(null)
                  const ddata = dragDataRef.current
                  if (ddata && ddata.id === block.id) {
                    const cw2 = getContainerWidth() || 9999
                    const finalBlocks = blocks.map(b => clampBlock({ ...b, x: livePos[b.id]?.x ?? b.x, y: livePos[b.id]?.y ?? b.y, w: liveW[b.id] ?? b.w, h: liveH[b.id] ?? b.h }, cw2))
                    salvarBlocks(finalBlocks)
                    setLivePos({})
                    setLiveW({})
                    setLiveH({})
                    setSnapLines({})
                    dragDataRef.current = null
                  }
                } : undefined}
              >
                {content}
                {editMode && (
                  <div
                    className="absolute bottom-1 right-1 w-9 h-9 bg-gray-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-nwse-resize z-30 select-none"
                    style={{ touchAction: 'none' }}
                    title="Arrastar para redimensionar"
                    onPointerDown={(e) => {
                      e.preventDefault(); e.stopPropagation()
                      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                      setResizeActiveId(block.id)
                      resizeDataRef.current = { id: block.id, startClientX: e.clientX, startClientY: e.clientY, startW: bw, startH: bh, curW: bw, curH: bh }
                    }}
                    onPointerMove={(e) => {
                      if (!resizeDataRef.current || resizeDataRef.current.id !== block.id) return
                      const cw = getContainerWidth()
                      if (cw === 0) return
                      const rawW = Math.max(200, resizeDataRef.current.startW + (e.clientX - resizeDataRef.current.startClientX))
                      const rawH = Math.max(120, resizeDataRef.current.startH + (e.clientY - resizeDataRef.current.startClientY))
                      const cands = getSnapCandidates(block.id, blocks, cw)
                      let newW = Math.max(200, snapValue(block.x + rawW, cands.x) - block.x)
                      let newH = Math.max(120, snapValue(block.y + rawH, cands.y) - block.y)
                      newW = Math.min(newW, cw - block.x)
                      const prevW = liveW[block.id] ?? block.w
                      const prevH = liveH[block.id] ?? block.h
                      const others = blocks.filter(o => o.id !== block.id && o.visible)
                      const testWH = { ...block, w: newW, h: newH }
                      if (others.some(o => overlaps(testWH, o))) {
                        const testWOnly = { ...block, w: newW, h: prevH }
                        const testHOnly = { ...block, w: prevW, h: newH }
                        if (others.some(o => overlaps(testWOnly, o))) newW = prevW
                        if (others.some(o => overlaps(testHOnly, o))) newH = prevH
                      }
                      resizeDataRef.current.curW = newW
                      resizeDataRef.current.curH = newH
                      setLiveW(prev => ({ ...prev, [block.id]: newW }))
                      setLiveH(prev => ({ ...prev, [block.id]: newH }))
                    }}
                    onPointerUp={(e) => {
                      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                      setResizeActiveId(null)
                      setSnapLines({})
                      const rdata = resizeDataRef.current
                      if (rdata && rdata.id === block.id) {
                        const cw2 = getContainerWidth() || 9999
                        const finalBlocks = blocks.map(b => clampBlock({ ...b, x: livePos[b.id]?.x ?? b.x, y: livePos[b.id]?.y ?? b.y, w: liveW[b.id] ?? b.w, h: liveH[b.id] ?? b.h }, cw2))
                        salvarBlocks(finalBlocks)
                        setLivePos({})
                        setLiveW({})
                        setLiveH({})
                        resizeDataRef.current = null
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
      )}
    </div>
  )
}
