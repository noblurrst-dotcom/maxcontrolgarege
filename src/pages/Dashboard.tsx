import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
} from 'lucide-react'
import type { Checklist } from '../types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getSaudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'bom dia'
  if (hora < 18) return 'boa tarde'
  return 'boa noite'
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Card wrapper reutilizável estilo Omie
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
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


export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [, setChecklists] = useState<Checklist[]>([])
  const [, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date())

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'
  const hoje = new Date()
  const diaSemana = format(hoje, "EEEE", { locale: ptBR })
  const dataFormatada = format(hoje, "d 'de' MMMM", { locale: ptBR })
  const mesNum = hoje.getMonth()
  const anoNum = hoje.getFullYear()

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

  // Dados do localStorage
  const vendas = useMemo(() => { try { return JSON.parse(localStorage.getItem('vendas') || '[]') } catch { return [] } }, [])
  const agendamentos = useMemo(() => { try { return JSON.parse(localStorage.getItem('agendamentos') || '[]') } catch { return [] } }, [])
  const clientes = useMemo(() => { try { return JSON.parse(localStorage.getItem('clientes') || '[]') } catch { return [] } }, [])
  const financeiro = useMemo(() => { try { return JSON.parse(localStorage.getItem('financeiro') || '[]') } catch { return [] } }, [])
  
  // Métricas financeiras do mês
  const isMes = (d: string) => { const dt = new Date(d); return dt.getMonth() === mesNum && dt.getFullYear() === anoNum }
  const vendasMes = useMemo(() => vendas.filter((v: any) => isMes(v.data_venda)).reduce((a: number, v: any) => a + (v.valor || 0), 0), [vendas])
  const entradasMes = useMemo(() => financeiro.filter((f: any) => f.tipo === 'entrada' && isMes(f.data)).reduce((a: number, f: any) => a + (f.valor || 0), 0), [financeiro])
  const saidasMes = useMemo(() => financeiro.filter((f: any) => f.tipo === 'saida' && isMes(f.data)).reduce((a: number, f: any) => a + (f.valor || 0), 0), [financeiro])
  const saldoMes = vendasMes + entradasMes - saidasMes

  // Top 5 clientes por gasto em vendas
  const topClientes = useMemo(() => {
    const map: Record<string, { nome: string; total: number; count: number }> = {}
    vendas.forEach((v: any) => {
      const key = v.nome_cliente || 'Sem nome'
      if (!map[key]) map[key] = { nome: key, total: 0, count: 0 }
      map[key].total += v.valor || 0
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [vendas])

  // Taxa de comparecimento (agendamentos concluídos / total deste mês)
  const agendMes = useMemo(() => agendamentos.filter((a: any) => isMes(a.data_hora || a.created_at)), [agendamentos])
  const agendConcluidos = agendMes.filter((a: any) => a.status === 'concluido').length
  const taxaComparecimento = agendMes.length > 0 ? Math.round((agendConcluidos / agendMes.length) * 100) : 0


  // Vendas por forma de pagamento
  const vendasPorForma = useMemo(() => {
    const map: Record<string, number> = {}
    vendas.filter((v: any) => isMes(v.data_venda)).forEach((v: any) => {
      const fp = v.forma_pagamento || 'outro'
      map[fp] = (map[fp] || 0) + (v.valor || 0)
    })
    return map
  }, [vendas])

  // Agendamentos no dia (para calendário)
  const agendamentosNoDia = (dia: Date) => {
    const dStr = format(dia, 'yyyy-MM-dd')
    return agendamentos.filter((a: any) => (a.data_hora || '').startsWith(dStr)).length
  }




  
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
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
        <Calendario
          mesAtual={mesAtual}
          setMesAtual={setMesAtual}
          agendamentosNoDia={agendamentosNoDia}
        />
        <GraficoVendas vendasMes={vendasMes} />
        <ResumoFinanceiro entradas={vendasMes + entradasMes} saidas={saidasMes} saldo={saldoMes} />
      </div>

      
      {/* Taxas e indicadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Taxa de Comparecimento (Agendamentos)</CardTitle>
            <span className="text-xs text-gray-400">Este mês</span>
          </div>
          {agendMes.length > 0 ? (
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-primary-600">{taxaComparecimento}%</span>
                <span className="text-xs text-gray-400 mb-1">{agendConcluidos} de {agendMes.length} agendamentos</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${taxaComparecimento}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Não há dados de comparecimento.</p>
          )}
        </Card>

      </div>

      {/* Vendas por forma de pagamento + Top clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {/* Vendas por forma de pagamento */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Vendas por pagamento</CardTitle>
            <span className="text-xs text-gray-400">Este mês</span>
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

        {/* Top 5 clientes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Trophy size={20} className="text-amber-500" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Top 5 clientes que mais gastaram</h4>
            </div>
            <span className="text-xs text-gray-400">Este mês</span>
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
      </div>

      {/* Sua empresa */}
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
    </div>
  )
}
