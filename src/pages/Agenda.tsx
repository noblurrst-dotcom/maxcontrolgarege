import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Search, Clock, CheckCircle2, Trash2, X, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Agendamento, Servico } from '../types'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

const STATUS_MAP: Record<Agendamento['status'], { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100' },
  confirmado: { label: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-100' },
  em_andamento: { label: 'Em andamento', color: 'text-primary-600', bg: 'bg-primary-100' },
  concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-100' },
}

const initForm = () => ({ nome_cliente: '', telefone_cliente: '', servico: '', servicoSelecionado: '', titulo: '', data_hora: '', data_hora_fim: '', valor: '', desconto: '', observacoes: '' })

export default function Agenda() {
  const { user } = useAuth()
  const [lista, setLista] = useState<Agendamento[]>(() => { try { return JSON.parse(localStorage.getItem('agendamentos') || '[]') } catch { return [] } })
  const [servicos, setServicos] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | Agendamento['status']>('todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm())
  const hoje = new Date()

  // Load services from Supabase
  useEffect(() => {
    if (user) {
      carregarServicos()
    }
  }, [user])

  const carregarServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', user!.id)
        .order('nome')

      if (error) throw error
      setServicos(data || [])
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
      setServicos([])
    }
  }

  const salvar = (l: Agendamento[]) => { setLista(l); localStorage.setItem('agendamentos', JSON.stringify(l)) }

  const adicionar = () => {
    if (!form.nome_cliente || !form.data_hora) return
    const valor = parseFloat(form.valor || '0')
    const desconto = parseFloat(form.desconto || '0')
    const novo: Agendamento = {
      id: uid(), user_id: '', cliente_id: null,
      nome_cliente: form.nome_cliente, telefone_cliente: form.telefone_cliente,
      servico: form.servico, titulo: form.titulo,
      data_hora: form.data_hora, data_hora_fim: form.data_hora_fim,
      duracao_min: 60, status: 'pendente',
      observacoes: form.observacoes, valor, desconto,
      created_at: new Date().toISOString(),
    }
    salvar([novo, ...lista])
    setModal(false)
    setForm(initForm())
  }

  const mudarStatus = (id: string, status: Agendamento['status']) => salvar(lista.map((a) => a.id === id ? { ...a, status } : a))
  const remover = (id: string) => salvar(lista.filter((a) => a.id !== id))

  const enviarWhatsApp = (a: Agendamento) => {
    const dataStr = a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    const texto = `*Agendamento*${a.titulo ? ` - ${a.titulo}` : ''}\nCliente: ${a.nome_cliente}\n${a.servico ? `Serviço: ${a.servico}\n` : ''}Data: ${dataStr}${a.valor ? `\nValor: ${fmt(a.valor - (a.desconto || 0))}` : ''}${a.observacoes ? `\nObs: ${a.observacoes}` : ''}`
    const tel = a.telefone_cliente?.replace(/\D/g, '')
    window.open(`https://wa.me/${tel ? '55' + tel : ''}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const filtradas = lista.filter((a) => {
    const t = busca.toLowerCase()
    const matchBusca = a.nome_cliente.toLowerCase().includes(t) || a.servico.toLowerCase().includes(t) || (a.titulo || '').toLowerCase().includes(t)
    const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus
    return matchBusca && matchStatus
  })

  const hojeStr = format(hoje, 'yyyy-MM-dd')
  const agendHoje = lista.filter(a => (a.data_hora || '').startsWith(hojeStr)).length
  const pendentes = lista.filter((a) => a.status === 'pendente').length
  const confirmados = lista.filter((a) => a.status === 'confirmado' || a.status === 'em_andamento').length
  const concluidos = lista.filter((a) => a.status === 'concluido').length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm">
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, serviço ou título..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="todos">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="confirmado">Confirmados</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Hoje', value: agendHoje, Icon: CalendarDays, color: 'text-primary-600', iconBg: 'bg-primary-100' },
          { label: 'Pendentes', value: pendentes, Icon: Clock, color: 'text-amber-600', iconBg: 'bg-amber-100' },
          { label: 'Em curso', value: confirmados, Icon: CheckCircle2, color: 'text-blue-600', iconBg: 'bg-blue-100' },
          { label: 'Concluídos', value: concluidos, Icon: CheckCircle2, color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
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
                      <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                        {a.titulo ? `${a.nome_cliente} · ` : ''}{a.servico}{a.servico ? ' · ' : ''}{dataInicio}{dataFim ? ` → ${dataFim}` : ''}
                        {a.valor ? ` · ${fmt(a.valor - (a.desconto || 0))}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                    {a.telefone_cliente && <button onClick={() => enviarWhatsApp(a)} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                    <button onClick={() => remover(a.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                {a.observacoes && <p className="text-[10px] text-gray-400 mt-1 pl-[42px] sm:pl-11 truncate">Obs: {a.observacoes}</p>}
                {a.status !== 'cancelado' && a.status !== 'concluido' && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3 pl-[42px] sm:pl-11">
                    {a.status === 'pendente' && <button onClick={() => mudarStatus(a.id, 'confirmado')} className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Confirmar</button>}
                    {(a.status === 'pendente' || a.status === 'confirmado') && <button onClick={() => mudarStatus(a.id, 'em_andamento')} className="text-[10px] font-bold px-3 py-1 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100">Iniciar</button>}
                    {a.status === 'em_andamento' && <button onClick={() => mudarStatus(a.id, 'concluido')} className="text-[10px] font-bold px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">Concluir</button>}
                    <button onClick={() => mudarStatus(a.id, 'cancelado')} className="text-[10px] font-bold px-3 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">Cancelar</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Novo Agendamento</h2>
              <button onClick={() => setModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título do agendamento</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Polimento Honda Civic" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente *</label>
                  <input type="text" value={form.nome_cliente} onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })} placeholder="Nome do cliente" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="tel" value={form.telefone_cliente} onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
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
