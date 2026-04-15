import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ChecklistCard from '../components/ChecklistCard'
import { Plus, Search, ClipboardList, Loader2, CalendarDays, CheckCircle2, Hash, Filter } from 'lucide-react'
import type { Checklist } from '../types'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'


export default function Checklists() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange } = useDateRange()

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
    const matchBusca = c.placa.toLowerCase().includes(termo) ||
      c.nome_cliente.toLowerCase().includes(termo) ||
      c.servico.toLowerCase().includes(termo)
    return matchBusca && isInRange(c.created_at)
  })

  const totalHoje = checklists.filter((c) => {
    const hoje = new Date().toISOString().split('T')[0]
    return c.created_at.startsWith(hoje)
  }).length

  const totalConcluidos = checklists.filter((c) => c.status === 'concluido' && isInRange(c.created_at)).length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-sm text-gray-400 mt-0.5">Checklists de inspeção dos veículos</p>
        </div>
        <button
          onClick={() => navigate('/novo-checklist')}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm"
        >
          <Plus size={16} />
          Novo Checklist
        </button>
      </div>

      {/* Filtro de período */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={12} className="text-gray-400" />
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Período</span>
        </div>
        <DateRangeFilter
          preset={preset}
          onChange={setPreset}
          customInicio={customInicio}
          customFim={customFim}
          onCustomInicioChange={setCustomInicio}
          onCustomFimChange={setCustomFim}
        />
      </div>

      <>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Hoje', value: totalHoje, Icon: CalendarDays, color: 'text-primary-600', iconBg: 'bg-primary-100' },
              { label: 'Concluídos', value: totalConcluidos, Icon: CheckCircle2, color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
              { label: 'No período', value: checklistsFiltrados.length, Icon: Hash, color: 'text-violet-600', iconBg: 'bg-violet-100' },
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
    </div>
  )
}
