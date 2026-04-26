import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, Plus, Search, Clock, Trash2, X, MessageCircle, Link2, Car, DollarSign, FileText, Settings2, Calendar, Check, CreditCard, AlertCircle } from 'lucide-react'
import { format, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Agendamento, Servico, Venda, Veiculo } from '../types'
import { uid, fmt, sanitizePhone } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'
import ClientePicker from '../components/ClientePicker'
import AgendaSemanal from '../components/AgendaSemanal'
import AgendaMensal from '../components/AgendaMensal'
import CapturarPagamentoModal from '../components/CapturarPagamentoModal'

const CORES_AGENDA = ['#4285F4', '#33B679', '#F4B400', '#E67C73', '#7986CB', '#8E24AA', '#039BE5', '#616161', '#D50000', '#F09300', '#0B8043', '#3F51B5']

const initForm = () => ({ nome_cliente: '', telefone_cliente: '', placa: '', veiculo: '', servico: '', servicoSelecionado: '', titulo: '', data_hora: '', data_hora_fim: '', valor: '', desconto: '', observacoes: '', vendaId: '', cor: '#4285F4', clienteId: '' })


export default function Agenda() {
  const { user } = useAuth()
  const { data: lista, save: salvar } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: todosVeiculos } = useCloudSync<Veiculo>({ table: 'veiculos', storageKey: 'veiculos' })
  const [servicos, setServicos] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm())
  const [agDetalhe, setAgDetalhe] = useState<Agendamento | null>(null)
  const [camposOpcionais, setCamposOpcionais] = useState<Set<string>>(new Set())
  const toggleCampo = (campo: string) => setCamposOpcionais(prev => { const n = new Set(prev); n.has(campo) ? n.delete(campo) : n.add(campo); return n })
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000)
    return () => clearInterval(interval)
  }, [])
  const [semanaOffset, setSemanaOffset] = useState(0)
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(new Date())

  // Pagamento modal
  const [pagModal, setPagModal] = useState(false)
  const [pagAgendamento, setPagAgendamento] = useState<Agendamento | null>(null)
  const [pagVenda, setPagVenda] = useState<Venda | null>(null)

  const STATUS_FLOW: Agendamento['status'][] = ['pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado']
  const STATUS_LABELS: Record<Agendamento['status'], string> = { pendente: 'Pendente', confirmado: 'Confirmado', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' }
  const STATUS_COLORS: Record<Agendamento['status'], string> = { pendente: 'bg-amber-100 text-amber-700', confirmado: 'bg-blue-100 text-blue-700', em_andamento: 'bg-purple-100 text-purple-700', concluido: 'bg-emerald-100 text-emerald-700', cancelado: 'bg-red-100 text-red-700' }

  const mudarStatus = (ag: Agendamento, novoStatus: Agendamento['status']) => {
    const atualizado = { ...ag, status: novoStatus }
    salvar(lista.map(a => a.id === ag.id ? atualizado : a))
    setAgDetalhe(atualizado)
  }

  const abrirCapturarPagamento = (ag: Agendamento) => {
    const vendaAssociada = ag.venda_id ? vendas.find(v => v.id === ag.venda_id) : undefined
    setPagAgendamento(ag)
    setPagVenda(vendaAssociada || null)
    setPagModal(true)
  }

  const onPagamentoSuccess = (vendaId: string, _pagamentoId: string) => {
    // Atualizar o venda_id no agendamento local se ainda não tinha
    if (agDetalhe && !agDetalhe.venda_id && vendaId) {
      const atualizado = { ...agDetalhe, venda_id: vendaId }
      salvar(lista.map(a => a.id === agDetalhe.id ? atualizado : a))
      setAgDetalhe(atualizado)
    }
  }

  // Visualização: semanal ou mensal, persistida em localStorage
  const [visualizacao, setVisualizacao] = useState<'semanal' | 'mensal'>(() => {
    const saved = localStorage.getItem('agenda_visualizacao')
    return saved === 'mensal' ? 'mensal' : 'semanal'
  })
  useEffect(() => {
    localStorage.setItem('agenda_visualizacao', visualizacao)
  }, [visualizacao])

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
    const duracaoMin = form.data_hora && form.data_hora_fim
      ? Math.max(Math.round((new Date(form.data_hora_fim).getTime() - new Date(form.data_hora).getTime()) / 60000), 30)
      : 60
    const novo: Agendamento = {
      id: uid(), user_id: '', cliente_id: null,
      venda_id: form.vendaId || null,
      nome_cliente: form.nome_cliente, telefone_cliente: form.telefone_cliente,
      placa: form.placa || '', veiculo: form.veiculo || '',
      servico: form.servico, titulo: form.titulo,
      data_hora: form.data_hora, data_hora_fim: form.data_hora_fim,
      duracao_min: duracaoMin, status: 'pendente',
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

  // Agendamentos filtrados por busca (para a lista na vista semanal)
  const filtradas = useMemo(() => lista.filter((a) => {
    const t = buscaDebounced.toLowerCase()
    return a.nome_cliente.toLowerCase().includes(t) || a.servico.toLowerCase().includes(t) || (a.titulo || '').toLowerCase().includes(t)
  }), [lista, buscaDebounced])

  // Abrir modal com data preenchida (clique em célula do mensal)
  const abrirModalComData = (dataISO: string) => {
    setForm({ ...initForm(), data_hora: `${dataISO}T09:00` })
    setModal(true)
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header: título + tabs + botão */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">{format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-full text-xs font-bold transition-colors shadow-sm self-start md:self-auto">
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 self-start">
          <button
            onClick={() => setVisualizacao('semanal')}
            aria-selected={visualizacao === 'semanal'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              visualizacao === 'semanal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays size={14} /> Agenda
          </button>
          <button
            onClick={() => setVisualizacao('mensal')}
            aria-selected={visualizacao === 'mensal'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              visualizacao === 'mensal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar size={14} /> Calendário
          </button>
        </div>
      </div>

      {/* Conteúdo: vista semanal ou mensal */}
      {visualizacao === 'semanal' ? (
        <div className="space-y-4">
          <AgendaSemanal
            diasDaSemana={diasDaSemana}
            agendamentosDaSemana={agendamentosDaSemana}
            semanaOffset={semanaOffset}
            onSemanaChange={setSemanaOffset}
            onEventoClick={setAgDetalhe}
            vendas={vendas}
          />
          {/* Lista de agendamentos com busca */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, serviço ou título..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
            </div>
            {filtradas.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-900 font-semibold">{busca ? 'Nenhum resultado' : 'Nenhum agendamento'}</p>
                <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Crie um novo agendamento'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {filtradas.map((a) => {
                  const dataInicio = a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
                  const dataFim = a.data_hora_fim ? new Date(a.data_hora_fim).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
                  return (
                    <div key={a.id} onClick={() => setAgDetalhe(a)} className={`rounded-xl border border-gray-100 p-3 sm:p-4 cursor-pointer hover:border-gray-200 transition-colors ${a.status === 'cancelado' ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Clock size={16} className="text-gray-500" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900 truncate">{a.titulo || a.nome_cliente}</p>
                              {(() => {
                                const v = a.venda_id ? vendas.find(x => x.id === a.venda_id) : undefined
                                const sp = v?.status_pagamento
                                if (a.status === 'concluido' && !v) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-600 shrink-0">$ Pendente</span>
                                if (sp === 'pendente') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-600 shrink-0">$ Pendente</span>
                                if (sp === 'parcial') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-600 shrink-0">$ Parcial</span>
                                return null
                              })()}
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-400 truncate">{a.titulo ? `${a.nome_cliente} · ` : ''}{a.servico}{a.servico ? ' · ' : ''}{dataInicio}{dataFim ? ` → ${dataFim}` : ''}{a.valor ? ` · ${fmt(a.valor - (a.desconto || 0))}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                          {a.telefone_cliente && <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(a) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>}
                          <button onClick={(e) => { e.stopPropagation(); remover(a.id) }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {a.observacoes && <p className="text-[10px] text-gray-400 mt-1 pl-[42px] sm:pl-11 truncate">Obs: {a.observacoes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <AgendaMensal
          mesAtual={mesAtual}
          setMesAtual={setMesAtual}
          agendamentos={lista}
          onDiaClick={abrirModalComData}
          onAgendamentoClick={setAgDetalhe}
        />
      )}

      {agDetalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAgDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: agDetalhe.cor || '#4285F4' }} />
                <h2 className="text-lg font-bold text-gray-900">{agDetalhe.titulo || agDetalhe.nome_cliente}</h2>
              </div>
              <button onClick={() => setAgDetalhe(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {CORES_AGENDA.map((c) => (
                  <button key={c} type="button"
                    onClick={() => {
                      const atualizado = { ...agDetalhe, cor: c }
                      salvar(lista.map(a => a.id === agDetalhe.id ? atualizado : a))
                      setAgDetalhe(atualizado)
                    }}
                    className={`w-7 h-7 rounded-full transition-all ${agDetalhe.cor === c || (!agDetalhe.cor && c === '#4285F4') ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-600">{agDetalhe.nome_cliente.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{agDetalhe.nome_cliente}</p>
                    {agDetalhe.telefone_cliente && <p className="text-xs text-gray-400">{agDetalhe.telefone_cliente}</p>}
                  </div>
                </div>
                {(agDetalhe.placa || agDetalhe.veiculo) && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 mt-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0"><Car size={18} className="text-gray-500" /></div>
                    <div>
                      {agDetalhe.veiculo && <p className="text-sm font-semibold text-gray-900">{agDetalhe.veiculo}</p>}
                      {agDetalhe.placa && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{agDetalhe.placa}</p>}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Serviço</p>
                {agDetalhe.servico && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Serviço</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[60%]">{agDetalhe.servico}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entrada</span>
                  <span className="font-semibold">{new Date(agDetalhe.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {agDetalhe.data_hora_fim && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Saída</span>
                    <span className="font-semibold">{new Date(agDetalhe.data_hora_fim).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {agDetalhe.duracao_min > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duração</span>
                    <span className="font-semibold">{agDetalhe.duracao_min >= 60 ? `${Math.floor(agDetalhe.duracao_min / 60)}h${agDetalhe.duracao_min % 60 ? agDetalhe.duracao_min % 60 + 'min' : ''}` : `${agDetalhe.duracao_min}min`}</span>
                  </div>
                )}
              </div>
              {(agDetalhe.valor > 0 || agDetalhe.desconto > 0) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Financeiro</p>
                  {agDetalhe.valor > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Valor</span>
                      <span className="font-semibold">{fmt(agDetalhe.valor)}</span>
                    </div>
                  )}
                  {agDetalhe.desconto > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Desconto</span>
                      <span className="font-semibold text-red-500">-{fmt(agDetalhe.desconto)}</span>
                    </div>
                  )}
                  {agDetalhe.valor > 0 && (
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                      <span>Total</span>
                      <span className="text-emerald-600">{fmt(Math.max(agDetalhe.valor - (agDetalhe.desconto || 0), 0))}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Status */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FLOW.map(s => (
                    <button
                      key={s}
                      onClick={() => mudarStatus(agDetalhe, s)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        agDetalhe.status === s
                          ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-gray-300'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pagamento */}
              {(() => {
                const vendaAssociada = agDetalhe.venda_id ? vendas.find(v => v.id === agDetalhe.venda_id) : undefined
                const statusPag = vendaAssociada?.status_pagamento
                const STATUS_PAG_COLORS: Record<string, string> = {
                  pendente: 'bg-amber-100 text-amber-700',
                  parcial: 'bg-blue-100 text-blue-700',
                  pago: 'bg-emerald-100 text-emerald-700',
                  cortesia: 'bg-gray-100 text-gray-500',
                  cancelada: 'bg-red-100 text-red-600',
                }
                const STATUS_PAG_LABELS: Record<string, string> = {
                  pendente: 'Pendente',
                  parcial: 'Parcial',
                  pago: 'Pago',
                  cortesia: 'Cortesia',
                  cancelada: 'Cancelada',
                }
                return (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pagamento</p>
                      {statusPag && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_PAG_COLORS[statusPag] || ''}`}>
                          {STATUS_PAG_LABELS[statusPag] || statusPag}
                        </span>
                      )}
                    </div>
                    {vendaAssociada && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold">{fmt(vendaAssociada.valor_total)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Pago</span>
                          <span className="font-bold text-emerald-600">{fmt(vendaAssociada.valor_pago || 0)}</span>
                        </div>
                        {vendaAssociada.valor_total - (vendaAssociada.valor_pago || 0) > 0 && (
                          <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5">
                            <span className="text-gray-500 font-bold">Restante</span>
                            <span className="font-bold text-amber-600">{fmt(vendaAssociada.valor_total - (vendaAssociada.valor_pago || 0))}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* CTA: capturar pagamento */}
                    {((!vendaAssociada && agDetalhe.status === 'concluido') ||
                      (vendaAssociada && (statusPag === 'pendente' || statusPag === 'parcial'))) && (
                      <button
                        onClick={() => abrirCapturarPagamento(agDetalhe)}
                        className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CreditCard size={14} />
                        {vendaAssociada ? 'Adicionar pagamento' : 'Capturar pagamento'}
                      </button>
                    )}
                    {/* Banner: agendamento concluído sem pagamento e sem venda */}
                    {!vendaAssociada && agDetalhe.status === 'concluido' && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700">Esse atendimento ainda não tem pagamento registrado.</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {agDetalhe.observacoes && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 mb-1">Observações</p>
                  <p className="text-sm text-amber-800">{agDetalhe.observacoes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {agDetalhe.telefone_cliente && (
                  <button onClick={() => { const tel = agDetalhe.telefone_cliente.replace(/\D/g, ''); window.open(`https://wa.me/55${tel}`, '_blank') }} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                )}
                <button onClick={() => { remover(agDetalhe.id); setAgDetalhe(null) }} className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setModal(false); setCamposOpcionais(new Set()) }}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <CalendarDays size={18} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Adicionar agendamento</h2>
                  <p className="text-[11px] text-gray-400">Preencha os dados para adicionar o agendamento</p>
                </div>
              </div>
              <button onClick={() => { setModal(false); setCamposOpcionais(new Set()) }} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Data inicial + Hora inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data inicial <span className="text-red-400">*</span></label>
                  <input type="date" value={form.data_hora ? form.data_hora.split('T')[0] : ''}
                    onChange={(e) => {
                      const time = form.data_hora ? form.data_hora.split('T')[1] || '' : ''
                      setForm({ ...form, data_hora: time ? `${e.target.value}T${time}` : e.target.value })
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Hora inicial <span className="text-red-400">*</span></label>
                  <input type="time" value={form.data_hora ? form.data_hora.split('T')[1]?.slice(0, 5) || '' : ''}
                    onChange={(e) => {
                      const date = form.data_hora ? form.data_hora.split('T')[0] : new Date().toISOString().split('T')[0]
                      setForm({ ...form, data_hora: `${date}T${e.target.value}` })
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              {/* Data saída + Hora saída */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data saída</label>
                  <input type="date" value={form.data_hora_fim ? form.data_hora_fim.split('T')[0] : ''}
                    onChange={(e) => {
                      const time = form.data_hora_fim ? form.data_hora_fim.split('T')[1] || '' : ''
                      setForm({ ...form, data_hora_fim: time ? `${e.target.value}T${time}` : e.target.value })
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Hora saída</label>
                  <input type="time" value={form.data_hora_fim ? form.data_hora_fim.split('T')[1]?.slice(0, 5) || '' : ''}
                    onChange={(e) => {
                      const date = form.data_hora_fim ? form.data_hora_fim.split('T')[0] : (form.data_hora ? form.data_hora.split('T')[0] : new Date().toISOString().split('T')[0])
                      setForm({ ...form, data_hora_fim: `${date}T${e.target.value}` })
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              {/* Cliente */}
              <ClientePicker
                value={form.nome_cliente}
                telefone={form.telefone_cliente}
                onChange={(nome, tel, veiculo, placa, clienteId) => setForm(prev => ({
                  ...prev,
                  nome_cliente: nome,
                  telefone_cliente: tel || prev.telefone_cliente,
                  veiculo: veiculo || '',
                  placa: placa || '',
                  clienteId: clienteId || '',
                }))}
              />

              {/* Veículo do cliente */}
              {(() => {
                const veiculosCliente = form.clienteId ? todosVeiculos.filter(v => v.cliente_id === form.clienteId) : []
                if (veiculosCliente.length === 0) return (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Placa</label>
                      <input type="text" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC-1234" maxLength={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none uppercase font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Veículo</label>
                      <input type="text" value={form.veiculo} onChange={(e) => setForm({ ...form, veiculo: e.target.value })} placeholder="Ex: Honda Civic" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                )
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Veículo do cliente</label>
                    <div className="space-y-2">
                      {veiculosCliente.map((v) => {
                        const selecionado = form.placa === v.placa
                        return (
                          <button key={v.id} type="button"
                            onClick={() => setForm(prev => ({ ...prev, placa: v.placa, veiculo: `${v.marca} ${v.modelo}`.trim() }))}
                            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 transition-all text-left ${
                              selecionado
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selecionado ? 'bg-primary-100' : 'bg-gray-100'}`}>
                              <Car size={18} className={selecionado ? 'text-primary-600' : 'text-gray-400'} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900 truncate">{v.placa}</p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {[v.marca, v.modelo, v.ano].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            {v.cor && (
                              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">{v.cor}</span>
                            )}
                            {selecionado && <Check size={16} className="text-primary-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Título */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título do agendamento (opcional)</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Lavagem completa" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              {/* Serviço */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Serviço</label>
                <div className="relative">
                  <select
                    value={form.servicoSelecionado}
                    onChange={(e) => {
                      const selectedService = e.target.value
                      setForm({ ...form, servicoSelecionado: selectedService })
                      if (selectedService && selectedService !== 'custom') {
                        const service = servicos.find(s => s.id === selectedService)
                        if (service) {
                          setForm(prev => ({ ...prev, servico: service.nome, titulo: prev.titulo || service.nome, valor: service.preco_padrao.toString() }))
                        }
                      } else if (selectedService === 'custom') {
                        setForm(prev => ({ ...prev, servico: '', titulo: '', valor: '' }))
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um serviço...</option>
                    {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} - {fmt(s.preco_padrao)}</option>)}
                    <option value="custom">Outro serviço (digitar manualmente)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {form.servicoSelecionado === 'custom' && (
                  <input type="text" value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} placeholder="Digite o nome do serviço..." className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                )}
              </div>

              {/* Vincular a venda */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Link2 size={12} /> Vincular a uma venda (opcional)
                </label>
                <select value={form.vendaId}
                  onChange={(e) => {
                    const vId = e.target.value
                    if (vId) {
                      const v = vendas.find(vd => vd.id === vId)
                      if (v) { setForm(prev => ({ ...prev, vendaId: vId, nome_cliente: v.nome_cliente, servico: v.descricao, titulo: v.descricao || v.nome_cliente, valor: String(v.valor_total || v.valor), desconto: String(v.desconto || 0), servicoSelecionado: '' })); return }
                    }
                    setForm(prev => ({ ...prev, vendaId: '' }))
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">Sem vínculo</option>
                  {vendas.map((v) => <option key={v.id} value={v.id}>{v.nome_cliente} — {v.descricao || 'Sem descrição'} — {fmt(v.valor_total || v.valor)}</option>)}
                </select>
              </div>

              {/* Separador — Campos opcionais */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-900">Campos opcionais</p>
                <p className="text-[11px] text-gray-400 mb-3">Selecione mais campos para preenchimento</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'desconto', label: 'Desconto', icon: DollarSign },
                    { key: 'descricao', label: 'Descrição', icon: FileText },
                    { key: 'pagamento', label: 'Pagamento', icon: DollarSign },
                    { key: 'cor', label: 'Cor', icon: Settings2 },
                  ].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => toggleCampo(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        camposOpcionais.has(key)
                          ? 'bg-primary-500 text-dark-900'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      <Plus size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos opcionais visíveis */}
              {camposOpcionais.has('desconto') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto (R$)</label>
                  <input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              )}

              {camposOpcionais.has('descricao') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição / Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações do agendamento..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                </div>
              )}

              {camposOpcionais.has('pagamento') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              )}

              {camposOpcionais.has('cor') && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cor na agenda</label>
                  <div className="flex flex-wrap gap-2">
                    {CORES_AGENDA.map((c) => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })}
                        className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo do agendamento */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-900">Resumo do agendamento</p>
                <p className="text-[11px] text-gray-400 mb-3">Informações importantes desse agendamento na agenda</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-600">Data do agendamento:</span>
                    <span className="font-bold text-primary-600">{form.data_hora ? new Date(form.data_hora).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Settings2 size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-600">{form.servico || 'Agendamento sem serviços'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={14} className="text-gray-400 shrink-0" />
                    <span className="text-gray-600">Sub-total ficou</span>
                    <span className="font-bold text-emerald-600">{fmt(Math.max((parseFloat(form.valor) || 0) - (parseFloat(form.desconto || '0')), 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer — Botão */}
            <div className="shrink-0 px-5 py-4 border-t border-gray-100">
              <button onClick={() => { adicionar(); setCamposOpcionais(new Set()) }}
                disabled={!form.nome_cliente || !form.data_hora}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                Adicionar agendamento <Check size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal capturar pagamento */}
      <CapturarPagamentoModal
        open={pagModal}
        onClose={() => setPagModal(false)}
        agendamento={pagAgendamento || undefined}
        venda={pagVenda || undefined}
        onSuccess={onPagamentoSuccess}
      />
    </div>
  )
}
