import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
  ChevronUp,
  ChevronDown,
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
} from 'lucide-react'
import type { Checklist } from '../types'
import { useBrand } from '../contexts/BrandContext'
import { useSubUsuario } from '../contexts/SubUsuarioContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'

function getSaudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'bom dia'
  if (hora < 18) return 'boa tarde'
  return 'boa noite'
}

const formatCurrency = formatCurrencyUtil

// Card wrapper reutilizável estilo Omie
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-responsive ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-gray-900 mb-4">{children}</h3>
}

// === Feriados Brasileiros ===
interface Feriado {
  data: string // MM-DD
  nome: string
  tipo: 'nacional' | 'regional'
}

const FERIADOS_FIXOS: Feriado[] = [
  // Nacionais
  { data: '01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { data: '04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { data: '05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { data: '09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { data: '10-12', nome: 'Nossa Sra. Aparecida', tipo: 'nacional' },
  { data: '11-02', nome: 'Finados', tipo: 'nacional' },
  { data: '11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { data: '11-20', nome: 'Consciência Negra', tipo: 'nacional' },
  { data: '12-25', nome: 'Natal', tipo: 'nacional' },
  // Regionais / pontos facultativos comuns
  { data: '01-25', nome: 'Aniversário de São Paulo', tipo: 'regional' },
  { data: '03-08', nome: 'Dia Internacional da Mulher', tipo: 'regional' },
  { data: '06-12', nome: 'Dia dos Namorados', tipo: 'regional' },
  { data: '06-24', nome: 'São João', tipo: 'regional' },
  { data: '07-09', nome: 'Revolução Constitucionalista (SP)', tipo: 'regional' },
  { data: '07-26', nome: 'Dia dos Avós', tipo: 'regional' },
  { data: '08-11', nome: 'Dia dos Pais', tipo: 'regional' },
  { data: '10-15', nome: 'Dia do Professor', tipo: 'regional' },
  { data: '10-31', nome: 'Dia do Saci / Halloween', tipo: 'regional' },
  { data: '12-24', nome: 'Véspera de Natal', tipo: 'regional' },
  { data: '12-31', nome: 'Véspera de Ano Novo', tipo: 'regional' },
]

// Páscoa via algoritmo de Meeus
function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function getFeriadosMoveis(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano)
  const d = (offset: number) => {
    const dt = new Date(pascoa)
    dt.setDate(dt.getDate() + offset)
    return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }
  return [
    { data: d(-47), nome: 'Carnaval (terça)', tipo: 'nacional' },
    { data: d(-48), nome: 'Carnaval (segunda)', tipo: 'nacional' },
    { data: d(-2), nome: 'Sexta-feira Santa', tipo: 'nacional' },
    { data: d(0), nome: 'Páscoa', tipo: 'nacional' },
    { data: d(60), nome: 'Corpus Christi', tipo: 'nacional' },
  ]
}

function getFeriadosDoAno(ano: number): Feriado[] {
  return [...FERIADOS_FIXOS, ...getFeriadosMoveis(ano)]
}

function getFeriadoDoDia(dia: Date, feriados: Feriado[]): Feriado | undefined {
  const chave = `${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
  return feriados.find(f => f.data === chave)
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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 capitalize">
          {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
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
              className={`relative text-sm py-2 rounded-xl font-medium transition-all ${
                ehHoje
                  ? 'bg-primary-500 text-dark-900 font-bold shadow-md shadow-primary-500/30'
                  : feriado?.tipo === 'nacional'
                    ? 'bg-red-50 text-red-600 font-semibold hover:bg-red-100'
                    : feriado?.tipo === 'regional'
                      ? 'bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100'
                      : ehDomingo
                        ? 'text-red-400 hover:bg-gray-50'
                        : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {format(dia, 'd')}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                {feriado?.tipo === 'nacional' && !ehHoje && <span className="w-1 h-1 bg-red-500 rounded-full" />}
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
          <span className="w-2 h-2 bg-red-500 rounded-full" />
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
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.tipo === 'nacional' ? 'bg-red-500' : 'bg-blue-500'}`} />
              <span className="text-[11px] text-gray-500 font-medium w-5">{f.data.split('-')[1]}</span>
              <span className="text-[11px] text-gray-700">{f.nome}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${f.tipo === 'nacional' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{f.tipo === 'nacional' ? 'Nacional' : 'Regional'}</span>
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
    { label: 'Dinheiro', color: 'bg-emerald-400' },
    { label: 'Boleto', color: 'bg-amber-400' },
  ]

  return (
    <Card>
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

      <div className="flex items-end gap-3 h-36">
        {diasSemana.map((dia, i) => (
          <div key={dia} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex flex-col justify-end h-28">
              <div
                className={`w-full rounded-t-lg transition-all ${
                  valores[i] > 0 ? 'bg-primary-500' : 'bg-gray-100'
                }`}
                style={{ height: `${Math.max((valores[i] / max) * 100, 6)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{dia}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Componente do Resumo Financeiro
function ResumoFinanceiro({ entradas, saidas, saldo }: { entradas: number; saidas: number; saldo: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Resumo financeiro</CardTitle>
        <span className="text-xs text-gray-400">Este mês</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Entradas</p>
              <p className="text-[10px] text-gray-400">Vendas + receitas</p>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-600">{formatCurrency(entradas)}</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Saídas</p>
              <p className="text-[10px] text-gray-400">Despesas do mês</p>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-red-500">{formatCurrency(saidas)}</p>
        </div>

        <div className={`flex items-center justify-between p-3 rounded-xl ${saldo >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
              <CreditCard size={18} className={saldo >= 0 ? 'text-blue-600' : 'text-amber-600'} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Saldo</p>
              <p className="text-[10px] text-gray-400">Entradas - Saídas</p>
            </div>
          </div>
          <p className={`text-base sm:text-lg font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>
    </Card>
  )
}


type BlockId = 'calendario' | 'grafico_vendas' | 'resumo_financeiro' | 'agenda_semanal' | 'vendas_pagamento' | 'top_clientes' | 'sua_empresa'

interface BlockConfig {
  id: BlockId
  label: string
  visible: boolean
  span: 1 | 2 | 3 | 4
  rows: 1 | 2 | 3 | 4
}

const DEFAULT_BLOCKS: BlockConfig[] = [
  { id: 'calendario', label: 'Calendário', visible: true, span: 4, rows: 1 },
  { id: 'grafico_vendas', label: 'Gráfico de Vendas', visible: true, span: 4, rows: 1 },
  { id: 'resumo_financeiro', label: 'Resumo Financeiro', visible: true, span: 4, rows: 1 },
  { id: 'agenda_semanal', label: 'Agenda Semanal', visible: true, span: 4, rows: 1 },
  { id: 'vendas_pagamento', label: 'Vendas por Pagamento', visible: true, span: 4, rows: 1 },
  { id: 'top_clientes', label: 'Top Clientes', visible: true, span: 4, rows: 1 },
  { id: 'sua_empresa', label: 'Sua Empresa', visible: true, span: 4, rows: 1 },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [, setChecklists] = useState<Checklist[]>([])
  const [, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date())

  // Block customization
  const { data: blocksCloud, save: salvarBlocksCloud } = useCloudSyncSingle<{ blocks: BlockConfig[] }>({ table: 'dashboard_blocks', storageKey: 'dashboard_blocks', defaultValue: { blocks: DEFAULT_BLOCKS }, dataField: 'blocks' })
  const blocks = useMemo(() => {
    const saved = (blocksCloud as any) as BlockConfig[] | undefined
    const raw: BlockConfig[] = Array.isArray(saved) && saved.length > 0
      ? DEFAULT_BLOCKS.map(d => { const s = (saved as any[]).find((b: any) => b.id === d.id); if (!s) return d; const span = (s.span ?? (s.size === 1 ? 2 : 4)) as 1|2|3|4; const rows = (s.rows ?? 1) as 1|2|3|4; return { ...d, visible: (s.visible ?? d.visible) as boolean, span, rows } as BlockConfig })
      : [...DEFAULT_BLOCKS]
    // Deduplica por id — previne duplicatas vindas de dados corrompidos
    const seen = new Set<string>()
    return raw.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true })
  }, [blocksCloud])
  const [editMode, setEditMode] = useState(false)
  const [dragBlock, setDragBlock] = useState<BlockId | null>(null)
  const [dragOverBlock, setDragOverBlock] = useState<BlockId | null>(null)

  const salvarBlocks = (b: BlockConfig[]) => { salvarBlocksCloud(b as any) }

  const toggleVisible = (id: BlockId) => {
    salvarBlocks(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b))
  }

  const onBlockDragStart = (e: React.DragEvent, id: BlockId, label: string) => {
    setDragBlock(id)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'width:120px;height:36px;background:#1a1a1a;color:white;font-size:11px;font-weight:600;border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:0.9;position:fixed;top:-100px;'
    ghost.textContent = label
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 60, 18)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }
  const onBlockDragOver = (e: React.DragEvent, id: BlockId) => {
    e.preventDefault()
    setDragOverBlock(id)
  }
  const onBlockDrop = (e: React.DragEvent, targetId: BlockId) => {
    e.preventDefault()
    if (!dragBlock || dragBlock === targetId) { setDragBlock(null); setDragOverBlock(null); return }
    const newBlocks = [...blocks]
    const fromIdx = newBlocks.findIndex(b => b.id === dragBlock)
    const toIdx = newBlocks.findIndex(b => b.id === targetId)
    const [moved] = newBlocks.splice(fromIdx, 1)
    newBlocks.splice(toIdx, 0, moved)
    salvarBlocks(newBlocks)
    setDragBlock(null)
    setDragOverBlock(null)
  }

  const resetBlocks = () => salvarBlocks([...DEFAULT_BLOCKS])
  const moveBlockUp = (id: BlockId) => { const idx = blocks.findIndex(b => b.id === id); if (idx === 0) return; const nb = [...blocks];[nb[idx - 1], nb[idx]] = [nb[idx], nb[idx - 1]]; salvarBlocks(nb) }
  const moveBlockDown = (id: BlockId) => { const idx = blocks.findIndex(b => b.id === id); if (idx === blocks.length - 1) return; const nb = [...blocks];[nb[idx], nb[idx + 1]] = [nb[idx + 1], nb[idx]]; salvarBlocks(nb) }
  const gridRef = useRef<HTMLDivElement>(null)
  const resizeDataRef = useRef<{ id: BlockId; startX: number; startY: number; startSpan: 1|2|3|4; currentSpan: 1|2|3|4; startRows: 1|2|3|4; currentRows: 1|2|3|4 } | null>(null)
  const [liveSpans, setLiveSpans] = useState<Partial<Record<BlockId, 1|2|3|4>>>({})
  const [liveRows, setLiveRows] = useState<Partial<Record<BlockId, 1|2|3|4>>>({})
  const [isResizing, setIsResizing] = useState(false)

  const { brand } = useBrand()
  const { subUsuarioAtivo } = useSubUsuario()
  const nomeUsuario = subUsuarioAtivo?.nome || brand.nome_usuario || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'
  const hoje = new Date()
  const diaSemana = format(hoje, "EEEE", { locale: ptBR })
  const dataFormatada = format(hoje, "d 'de' MMMM", { locale: ptBR })

  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange, periodoLabel } = useDateRange()

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

  // Dados sincronizados via cloud
  const { data: vendas } = useCloudSync<any>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos } = useCloudSync<any>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: clientes } = useCloudSync<any>({ table: 'clientes', storageKey: 'clientes' })
  const { data: financeiro } = useCloudSync<any>({ table: 'financeiro', storageKey: 'financeiro' })
  
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




  
  // Render a block by ID
  const renderBlock = (id: BlockId) => {
    switch (id) {
      case 'calendario': return <Calendario mesAtual={mesAtual} setMesAtual={setMesAtual} agendamentosNoDia={agendamentosNoDia} />
      case 'grafico_vendas': return <GraficoVendas vendasMes={vendasMes} />
      case 'resumo_financeiro': return <ResumoFinanceiro entradas={vendasMes + entradasMes} saidas={saidasMes} saldo={saldoMes} />
      case 'agenda_semanal': return renderAgendaSemanal()
      case 'vendas_pagamento': return renderVendasPagamento()
      case 'top_clientes': return renderTopClientes()
      case 'sua_empresa': return renderEmpresa()
      default: return null
    }
  }

  const renderAgendaSemanal = () => (
    <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarPlus size={20} className="text-primary-600" />
            <div>
              <h3 className="text-base font-bold text-gray-900">Agenda semanal</h3>
              <p className="text-[11px] text-gray-400">
                {format(diasDaSemana[0], "d MMM", { locale: ptBR })} — {format(diasDaSemana[6], "d MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSemanaOffset(s => s - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setSemanaOffset(0)}
              className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button onClick={() => setSemanaOffset(s => s + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Grid semanal estilo Google Calendar */}
        <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5">
          <div className="min-w-[640px]">
            {/* Header com dias da semana */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100 pb-2 mb-0">
              <div /> {/* espaço para coluna de horários */}
              {diasDaSemana.map((dia) => {
                const ehHoje = isToday(dia)
                return (
                  <div key={dia.toISOString()} className="text-center">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${ehHoje ? 'text-primary-600' : 'text-gray-400'}`}>
                      {format(dia, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 leading-none ${
                      ehHoje ? 'w-8 h-8 mx-auto bg-primary-500 text-white rounded-full flex items-center justify-center' : 'text-gray-700'
                    }`}>
                      {format(dia, 'd')}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Time slots — Google Calendar style */}
            {(() => {
              const ROW_H = 48
              const HORA_INICIO = 7
              const TOTAL_HORAS = 14
              const defaultEventColor = '#4285F4'
              return (
                <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  <div className="grid grid-cols-[50px_repeat(7,1fr)]" style={{ minHeight: ROW_H * TOTAL_HORAS }}>
                    {/* Coluna de horários */}
                    <div className="relative">
                      {Array.from({ length: TOTAL_HORAS }, (_, i) => i + HORA_INICIO).map((hora) => (
                        <div key={hora} className="text-[10px] font-medium text-gray-400 pr-2 text-right -mt-1.5 select-none" style={{ height: ROW_H, paddingTop: 2 }}>
                          {`${String(hora).padStart(2, '0')}:00`}
                        </div>
                      ))}
                    </div>
                    {/* Colunas dos dias */}
                    {diasDaSemana.map((dia) => {
                      const dStr = format(dia, 'yyyy-MM-dd')
                      const ehHoje = isToday(dia)
                      const diaStart = new Date(`${dStr}T00:00:00`)
                      const diaEnd = new Date(diaStart.getTime() + 86400000)
                      const BIZ_START = 8, BIZ_END = 18
                      const eventsDia = agendamentosDaSemana.filter((a: any) => {
                        const ini = new Date(a.data_hora)
                        const durM = a.duracao_min || 60
                        const fim = a.data_hora_fim ? new Date(a.data_hora_fim) : new Date(ini.getTime() + durM * 60000)
                        return ini < diaEnd && fim > diaStart
                      })
                      return (
                        <div key={dia.toISOString()} className={`relative ${ehHoje ? 'bg-primary-50/30' : ''}`}>
                          {/* Grid lines */}
                          {Array.from({ length: TOTAL_HORAS }, (_, i) => (
                            <div key={i} className="border-t border-l border-gray-100" style={{ height: ROW_H }} />
                          ))}
                          {/* Events absolutely positioned */}
                          {eventsDia.map((ag: any, idx: number) => {
                            const inicio = new Date(ag.data_hora)
                            const durMin = ag.duracao_min || 60
                            const fim = ag.data_hora_fim ? new Date(ag.data_hora_fim) : new Date(inicio.getTime() + durMin * 60000)
                            const isMultiDay = inicio.toDateString() !== fim.toDateString()
                            const isFirstDay = inicio.toDateString() === diaStart.toDateString()
                            const isLastDay = fim.toDateString() === diaStart.toDateString()
                            let effStart: number, effEnd: number
                            if (!isMultiDay) {
                              effStart = inicio.getHours() + inicio.getMinutes() / 60
                              effEnd = fim.getHours() + fim.getMinutes() / 60
                            } else if (isFirstDay) {
                              effStart = inicio.getHours() + inicio.getMinutes() / 60
                              effEnd = BIZ_END
                            } else if (isLastDay) {
                              effStart = BIZ_START
                              effEnd = fim.getHours() + fim.getMinutes() / 60
                            } else {
                              effStart = BIZ_START
                              effEnd = BIZ_END
                            }
                            const top = Math.max((effStart - HORA_INICIO) * ROW_H, 0)
                            const bottom = Math.min((effEnd - HORA_INICIO) * ROW_H, TOTAL_HORAS * ROW_H)
                            const height = Math.max(bottom - top, ROW_H * 0.5)
                            const eventColor = ag.cor || defaultEventColor
                            const horaIni = format(inicio, 'HH:mm')
                            const horaFim = format(fim, 'HH:mm')
                            return (
                              <div
                                key={ag.id || idx}
                                title={`${ag.nome_cliente}${ag.servico ? ' • ' + ag.servico : ''}${ag.valor ? ' • ' + formatCurrency(ag.valor) : ''}`}
                                className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-default"
                                style={{ top, height, zIndex: 10 + idx, backgroundColor: eventColor, borderLeft: `3px solid ${eventColor}`, filter: ag.status === 'cancelado' ? 'opacity(0.4) grayscale(1)' : undefined }}
                              >
                                <div className="px-1.5 py-1 text-white">
                                  <p className="text-[10px] font-bold leading-tight truncate">{ag.nome_cliente || 'Agendamento'}</p>
                                  <p className="text-[9px] opacity-80 leading-tight">{isFirstDay ? horaIni : `${BIZ_START}:00`} – {isLastDay || !isMultiDay ? horaFim : `${BIZ_END}:00`}</p>
                                  {height > ROW_H && ag.servico && (
                                    <p className="text-[9px] opacity-70 leading-tight truncate mt-0.5">{ag.servico}</p>
                                  )}
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

        {/* Legenda de status */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
          {[
            { label: 'Pendente', color: 'bg-amber-300' },
            { label: 'Confirmado', color: 'bg-blue-300' },
            { label: 'Em andamento', color: 'bg-primary-400' },
            { label: 'Concluído', color: 'bg-emerald-300' },
            { label: 'Cancelado', color: 'bg-red-300' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
    </Card>
  )

  const renderVendasPagamento = () => (
    <Card>
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
              { key: 'dinheiro', label: 'Dinheiro', color: 'bg-emerald-400' },
              { key: 'boleto', label: 'Boleto', color: 'bg-amber-400' },
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
    <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-amber-500" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Top 5 clientes que mais gastaram</h4>
          </div>
          <span className="text-xs text-gray-400">{periodoLabel}</span>
        </div>
        {topClientes.length > 0 ? (
          <div className="space-y-3">
            {topClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                  {c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                  <p className="text-[10px] text-gray-400">{c.count} transaç{c.count === 1 ? 'ão' : 'ões'} • {formatCurrency(c.total)}</p>
                </div>
                {i === 0 && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Top 1</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma venda registrada ainda</p>
            <button
              onClick={() => navigate('/vendas')}
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              Registrar primeira venda
              <ArrowRight size={14} />
            </button>
          </div>
        )}
    </Card>
  )

  const renderEmpresa = () => (
    <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-primary-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Sua empresa</h4>
            <p className="text-xs text-gray-400">{clientes.length} clientes • {vendas.length} vendas • {agendamentos.length} agendamentos</p>
          </div>
        </div>
    </Card>
  )

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Saudação + Ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá {nomeUsuario}, {getSaudacao()}!
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">
            Hoje é dia {dataFormatada}, {diaSemana}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap shrink-0 active:scale-95 ${
              editMode
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            {editMode ? <Check size={14} /> : <Pencil size={14} />}
            {editMode ? 'Concluir' : 'Editar painel'}
          </button>
          {!editMode && (
            <>
              <button
                onClick={() => navigate('/vendas')}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-[11px] sm:text-xs font-bold transition-colors shadow-sm whitespace-nowrap shrink-0 active:scale-95"
              >
                <ShoppingCart size={14} />
                Nova Venda
              </button>
              <button
                onClick={() => navigate('/agenda')}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap shrink-0 active:scale-95"
              >
                <CalendarPlus size={14} />
                Agendamento
              </button>
            </>
          )}
          {editMode && (
            <button
              onClick={resetBlocks}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap shrink-0 active:scale-95"
            >
              <RotateCcw size={14} />
              Resetar
            </button>
          )}
        </div>
      </div>

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

      {/* Hidden blocks panel (edit mode) */}
      {editMode && blocks.some(b => !b.visible) && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Blocos ocultos — clique para restaurar</p>
          <div className="flex flex-wrap gap-2">
            {blocks.filter(b => !b.visible).map(b => (
              <button
                key={b.id}
                onClick={() => toggleVisible(b.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <EyeOff size={12} /> {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic blocks */}
      <div ref={gridRef} className="grid gap-6" style={{ gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(4, minmax(0, 1fr))', gridAutoFlow: 'dense' }}>
        {blocks.map((block, idx) => {
          if (!block.visible && !editMode) return null
          const content = renderBlock(block.id)
          if (!content) return null
          const isFirst = idx === 0
          const isLast = idx === blocks.length - 1
          const span = (liveSpans[block.id] ?? block.span ?? 4) as 1|2|3|4
          const rows = (liveRows[block.id] ?? block.rows ?? 1) as 1|2|3|4
          return (
            <div
              key={block.id}
              draggable={editMode}
              onDragStart={editMode ? (e) => onBlockDragStart(e, block.id, block.label) : undefined}
              onDragOver={editMode ? (e) => onBlockDragOver(e, block.id) : undefined}
              onDrop={editMode ? (e) => onBlockDrop(e, block.id) : undefined}
              onDragEnd={() => { setDragBlock(null); setDragOverBlock(null) }}
              style={{ gridColumn: window.innerWidth < 768 ? 'span 4 / span 4' : `span ${span} / span ${span}`, ...(rows > 1 ? { minHeight: (rows - 1) * 280 } : {}) }}
              className={`relative flex flex-col transition-all ${
                editMode ? `cursor-grab active:cursor-grabbing ${isResizing ? '' : 'animate-wiggle'} pt-5` : ''
              } ${editMode && !block.visible ? 'opacity-40' : ''} ${
                dragBlock === block.id ? 'opacity-50 scale-[0.98]' : ''
              } ${dragOverBlock === block.id && dragBlock !== block.id ? 'ring-2 ring-primary-400 ring-offset-2 rounded-2xl' : ''}`}
            >
              {editMode && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-gray-900/95 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-xl whitespace-nowrap">
                  <span className="text-[9px] font-bold text-white/50 px-1">{block.label}</span>
                  <span className="w-px h-3 bg-white/20" />
                  <button title="Mover para cima" onClick={() => moveBlockUp(block.id)} disabled={isFirst} className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded-full transition-colors active:scale-90"><ChevronUp size={12} /></button>
                  <button title="Mover para baixo" onClick={() => moveBlockDown(block.id)} disabled={isLast} className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded-full transition-colors active:scale-90"><ChevronDown size={12} /></button>
                  <span className="w-px h-3 bg-white/20" />
                  <span className="text-[9px] text-white/40 px-1 tabular-nums">{span}×{rows}</span>
                  <span className="w-px h-3 bg-white/20" />
                  <button title={block.visible ? 'Ocultar bloco' : 'Mostrar bloco'} onClick={() => toggleVisible(block.id)} className="p-1 text-white/70 hover:text-white rounded-full transition-colors active:scale-90">{block.visible ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                </div>
              )}
              {content}
              {editMode && (
                <div
                  className="absolute bottom-1 right-1 w-9 h-9 bg-gray-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-nwse-resize z-30 select-none"
                  style={{ touchAction: 'none' }}
                  title="Arrastar para redimensionar"
                  onPointerDown={(e) => {
                    e.preventDefault(); e.stopPropagation()
                    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                    setIsResizing(true)
                    resizeDataRef.current = { id: block.id, startX: e.clientX, startY: e.clientY, startSpan: span, currentSpan: span, startRows: rows, currentRows: rows }
                  }}
                  onPointerMove={(e) => {
                    if (!resizeDataRef.current || resizeDataRef.current.id !== block.id) return
                    const grid = gridRef.current; if (!grid) return
                    const gap = parseInt(window.getComputedStyle(grid).columnGap) || 24
                    const rect = grid.getBoundingClientRect()
                    const colWidth = (rect.width - gap * 3) / 4
                    const deltaX = e.clientX - resizeDataRef.current.startX
                    const newSpan = Math.max(1, Math.min(4, resizeDataRef.current.startSpan + Math.round((deltaX + colWidth * 0.1) / colWidth))) as 1|2|3|4
                    const newRows = Math.max(1, Math.min(4, resizeDataRef.current.startRows + Math.round((e.clientY - resizeDataRef.current.startY) / 280))) as 1|2|3|4
                    resizeDataRef.current.currentSpan = newSpan
                    resizeDataRef.current.currentRows = newRows
                    requestAnimationFrame(() => {
                      setLiveSpans(prev => ({ ...prev, [block.id]: newSpan }))
                      setLiveRows(prev => ({ ...prev, [block.id]: newRows }))
                    })
                  }}
                  onPointerUp={(e) => {
                    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                    setIsResizing(false)
                    const rdata = resizeDataRef.current
                    if (rdata && rdata.id === block.id) {
                      salvarBlocks(blocks.map(b => b.id === block.id ? { ...b, span: rdata.currentSpan, rows: rdata.currentRows } : b))
                      setLiveSpans(prev => { const n = { ...prev }; delete n[rdata.id]; return n })
                      setLiveRows(prev => { const n = { ...prev }; delete n[rdata.id]; return n })
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
    </div>
  )
}
