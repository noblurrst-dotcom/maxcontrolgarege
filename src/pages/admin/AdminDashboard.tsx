import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, TrendingUp, TrendingDown, UserPlus, AlertTriangle, Loader2, RefreshCw, Trophy, ArrowRight } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import toast from '../../lib/toast'

interface Metricas {
  total_contas: number
  ativas_30d: number
  ativas_7d: number
  ativas_1d: number
  novas_mes: number
  novas_mes_anterior: number
  churn: number
  cadastros_dia: { dia: string; total: number }[]
  uso_modulos: Record<string, number>
  top10: { id: string; email: string; nome: string; atividade: number }[]
  em_risco: { id: string; email: string; nome: string; atividade_anterior: number; atividade_atual: number }[]
}

const MODULO_LABELS: Record<string, string> = {
  vendas: 'Vendas',
  agendamentos: 'Agendamentos',
  clientes: 'Clientes',
  servicos: 'Serviços',
  financeiro: 'Financeiro',
  kanban_items: 'Kanban',
}

const CACHE_TTL = 2 * 60 * 1000 // 2min

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const cacheRef = useRef<{ data: Metricas; ts: number } | null>(null)

  const carregar = async (forceRefresh = false) => {
    // Check cache
    if (!forceRefresh && cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setMetricas(cacheRef.current.data)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_metricas_gerais')
      if (error) throw error
      const result = data as Metricas
      setMetricas(result)
      cacheRef.current = { data: result, ts: Date.now() }
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err)
      toast.error('Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (loading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!metricas) return null

  const variacaoNovas = metricas.novas_mes_anterior > 0
    ? Math.round(((metricas.novas_mes - metricas.novas_mes_anterior) / metricas.novas_mes_anterior) * 100)
    : metricas.novas_mes > 0 ? 100 : 0

  // Preparar dados do gráfico de uso por módulo
  const usoModulosData = Object.entries(metricas.uso_modulos || {}).map(([key, value]) => ({
    modulo: MODULO_LABELS[key] || key,
    contas: value,
    pct: metricas.ativas_30d > 0 ? Math.round((value / metricas.ativas_30d) * 100) : 0,
  })).sort((a, b) => b.contas - a.contas)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <button onClick={() => carregar(true)} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-start">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* 4 Cards de métrica */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total de contas"
          value={metricas.total_contas}
          icon={Users}
          color="text-gray-900"
          iconBg="bg-gray-100"
        />
        <MetricCard
          label="Ativas (30d)"
          value={metricas.ativas_30d}
          icon={TrendingUp}
          color="text-success-600"
          iconBg="bg-success-100"
          sub={`${metricas.total_contas > 0 ? Math.round((metricas.ativas_30d / metricas.total_contas) * 100) : 0}% do total`}
        />
        <MetricCard
          label="Novas no mês"
          value={metricas.novas_mes}
          icon={UserPlus}
          color="text-blue-600"
          iconBg="bg-blue-100"
          variacao={variacaoNovas}
        />
        <MetricCard
          label="Churn estimado"
          value={metricas.churn}
          icon={TrendingDown}
          color="text-danger-500"
          iconBg="bg-danger-100"
          sub="ativa → inativa no mês"
        />
      </div>

      {/* DAU / WAU / MAU */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{metricas.ativas_1d}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">DAU (hoje)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{metricas.ativas_7d}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">WAU (7d)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{metricas.ativas_30d}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-1">MAU (30d)</p>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de linhas: cadastros/dia */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Novos cadastros (30 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricas.cadastros_dia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="dia"
                  tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => format(new Date(v as string), "dd 'de' MMMM", { locale: ptBR })}
                  formatter={(value: any) => [value, 'Cadastros']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de barras: uso por módulo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Adoção por módulo (30d)</h3>
          <p className="text-[10px] text-gray-400 mb-4">Contas com ≥1 registro no período</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usoModulosData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="modulo" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  formatter={(value: any, _name: any, props: any) => [`${value} contas (${props.payload.pct}%)`, 'Uso']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="contas" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 + Em risco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-warning-500" />
            <h3 className="text-sm font-bold text-gray-900">Top 10 mais ativas do mês</h3>
          </div>
          {metricas.top10.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sem dados no período</p>
          ) : (
            <div className="space-y-2">
              {metricas.top10.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/admin/contas/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i < 3 ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.email}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500 shrink-0">{c.atividade}</span>
                  <ArrowRight size={12} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Em risco */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-danger-500" />
            <h3 className="text-sm font-bold text-gray-900">Contas em risco</h3>
          </div>
          <p className="text-[10px] text-gray-400 -mt-3 mb-4">&gt;5 registros mês passado, &lt;2 neste mês</p>
          {metricas.em_risco.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma conta em risco</p>
          ) : (
            <div className="space-y-2">
              {metricas.em_risco.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/admin/contas/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-danger-50/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 bg-danger-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle size={11} className="text-danger-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-[10px] text-gray-400">{c.atividade_anterior} → {c.atividade_atual} registros</p>
                  </div>
                  <ArrowRight size={12} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color, iconBg, sub, variacao }: {
  label: string
  value: number
  icon: any
  color: string
  iconBg: string
  sub?: string
  variacao?: number
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={color} />
        </div>
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {variacao !== undefined && (
        <p className={`text-[10px] font-bold mt-1 ${variacao >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
          {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao)}% vs mês anterior
        </p>
      )}
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
