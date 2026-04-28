import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShoppingCart, Plus, Search, TrendingUp, Trash2, X, MessageCircle, Lock, Unlock, FileText, PlusCircle, MinusCircle, CalendarDays, Clock, Filter, ChevronDown, ChevronUp, ClipboardCheck, CreditCard, Car, Check } from 'lucide-react'
import { useDateRange } from '../hooks/useDateRange'
import DateRangeFilter from '../components/DateRangeFilter'
import type { Venda, FormaPagamento, Orcamento, OrcamentoItem, Servico, Agendamento, Veiculo } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useBrand } from '../contexts/BrandContext'
import { uid, fmt } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'
import ClientePicker from '../components/ClientePicker'
import ChecklistUnificado from '../components/ChecklistUnificado'
import toast from 'react-hot-toast'
import CapturarPagamentoModal from '../components/CapturarPagamentoModal'
import ColaboradorPicker from '../components/ColaboradorPicker'
// jsPDF carregado dinamicamente via import() para não pesar no bundle inicial

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
]

const PARCELAS = [1,2,3,4,5,6,7,8,9,10,11,12]

const CORES_AGENDA = ['#4285F4', '#33B679', '#F4B400', '#E67C73', '#7986CB', '#8E24AA', '#039BE5', '#616161', '#D50000', '#F09300', '#0B8043', '#3F51B5']

const initForm = () => ({ nome_cliente: '', clienteId: '', descricao: '', valor: '', desconto: '', forma_pagamento: '' as FormaPagamento | '', data_venda: new Date().toISOString().split('T')[0], data_agendamento: '', hora_agendamento: '09:00', hora_agendamento_fim: '10:00', data_agendamento_fim: '', cor_agendamento: '#4285F4', placa_agendamento: '', veiculo_agendamento: '', parcelas: '1', funcionario: '', colaborador_id: '' as string | null, observacoes: '', servicoSelecionado: '' })

export default function Vendas() {
  useBrand()
  const { user } = useAuth()
  const [tab, setTab] = useState<'vendas' | 'orcamento'>('vendas')
  const [searchParams, setSearchParams] = useSearchParams()
  const [servicos, setServicos] = useState<Servico[]>([])
  const { data: vendas, save: salvarVendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })
  const { data: agendamentos, save: salvarAgendamentos } = useCloudSync<Agendamento>({ table: 'agendamentos', storageKey: 'agendamentos' })
  const { data: todosVeiculos } = useCloudSync<Veiculo>({ table: 'veiculos', storageKey: 'veiculos' })
  const { data: kanbanItems, save: salvarKanban } = useCloudSync<any>({ table: 'kanban_items', storageKey: 'kanban_items' })
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [filtroPagamento, setFiltroPagamento] = useState<'todos' | 'pendente' | 'parcial' | 'pago' | 'cortesia' | 'cancelada'>('todos')
  const [modal, setModal] = useState(false)
  const [detalhe, setDetalhe] = useState<Venda | null>(null)
  const [editDetalhe, setEditDetalhe] = useState<{ valor: string; desconto: string; forma_pagamento: FormaPagamento; parcelas: string; descontoTipo: 'valor' | 'percentual' } | null>(null)
  const [form, setForm] = useState(initForm())
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor')
  const [mostrarChecklist, setMostrarChecklist] = useState(false)
  const [mostrarChecklistOrc, setMostrarChecklistOrc] = useState(false)
  const [checklistSalvo, setChecklistSalvo] = useState(false)
  const [vendaPagModal, setVendaPagModal] = useState(false)
  const { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, isInRange, periodoLabel } = useDateRange()

  // Load services from Supabase
  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const { data, error } = await supabase.from('servicos').select('*').eq('user_id', user.id).order('nome')
          if (!error) setServicos(data || [])
        } catch (e) { console.error('Erro ao carregar serviços:', e) }
      })()
    }
  }, [user])

  // Orçamento state
  const { data: orcamentos, save: salvarOrcamentos } = useCloudSync<Orcamento>({ table: 'orcamentos', storageKey: 'orcamentos' })
  const [orcModal, setOrcModal] = useState(false)
  const [orcDetalhe, setOrcDetalhe] = useState<Orcamento | null>(null)

  // Detecta ?novo=venda|orcamento vindo do Painel e abre o modal correspondente
  useEffect(() => {
    const novo = searchParams.get('novo')
    if (!novo) return
    if (novo === 'venda') {
      setModal(true)
    } else if (novo === 'orcamento') {
      setOrcModal(true)
      setTab('orcamento')
    }
    searchParams.delete('novo')
    setSearchParams(searchParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [orcForm, setOrcForm] = useState({ nome_cliente: '', telefone_cliente: '', desconto: '', validade: '', observacoes: '' })
  const [orcItens, setOrcItens] = useState<OrcamentoItem[]>([{ descricao: '', quantidade: 1, valor_unitario: 0 }])

  // Conversão com agendamento
  const [convModal, setConvModal] = useState(false)
  const [convOrc, setConvOrc] = useState<Orcamento | null>(null)
  const [convData, setConvData] = useState('')
  const [convHora, setConvHora] = useState('09:00')
  const [convCor, setConvCor] = useState('#4285F4')
  const [convHoraFim, setConvHoraFim] = useState('10:00')
  const [convDataFim, setConvDataFim] = useState('')

  const salvar = (l: Venda[]) => { salvarVendas(l) }
  const salvarOrc = (l: Orcamento[]) => { salvarOrcamentos(l) }

  // Orçamento helpers
  const orcSubtotal = orcItens.reduce((a, i) => a + i.quantidade * i.valor_unitario, 0)
  const orcDesc = parseFloat(orcForm.desconto || '0')
  const orcTotal = Math.max(orcSubtotal - orcDesc, 0)

  const adicionarOrc = () => {
    if (!orcForm.nome_cliente || orcItens.every(i => !i.descricao)) return
    const validItens = orcItens.filter(i => i.descricao)
    const novo: Orcamento = {
      id: uid(), user_id: '', cliente_id: null, nome_cliente: orcForm.nome_cliente,
      telefone_cliente: orcForm.telefone_cliente, itens: validItens,
      valor_total: orcTotal, status: 'pendente', validade: orcForm.validade || '',
      observacoes: orcForm.observacoes, checklist_id: null, created_at: new Date().toISOString(),
    }
    salvarOrc([novo, ...orcamentos])
    setOrcModal(false)
    setOrcForm({ nome_cliente: '', telefone_cliente: '', desconto: '', validade: '', observacoes: '' })
    setOrcItens([{ descricao: '', quantidade: 1, valor_unitario: 0 }])
  }

  const removerOrc = (id: string) => { salvarOrc(orcamentos.filter(p => p.id !== id)); setOrcDetalhe(null) }

  const abrirConversao = (pv: Orcamento) => {
    setConvOrc(pv)
    setConvData(new Date().toISOString().split('T')[0])
    setConvHora('09:00')
    setConvCor('#4285F4')
    setConvHoraFim('10:00')
    setConvDataFim('')
    setConvModal(true)
  }

  const confirmarConversao = () => {
    if (!convOrc || !convData) return
    const orc = convOrc
    const descItens = orc.itens.map(i => i.descricao).join(', ')

    // Criar venda
    const nova: Venda = {
      id: uid(), user_id: '', cliente_id: null, nome_cliente: orc.nome_cliente,
      descricao: descItens, valor: orc.valor_total,
      desconto: 0, valor_total: orc.valor_total, valor_pago: 0,
      forma_pagamento: null, status_pagamento: 'pendente',
      data_venda: convData, status: 'aberta',
      parcelas: 1, funcionario: '', observacoes: `Convertido de orçamento. ${orc.observacoes}`,
      checklist_id: null, created_at: new Date().toISOString(),
    }
    salvar([nova, ...vendas])
    salvarOrc(orcamentos.map(p => p.id === orc.id ? { ...p, status: 'aprovado' as const } : p))

    // Criar agendamento
    const dataHoraInicio = `${convData}T${convHora}:00`
    let dataHoraFim: string
    if ((convDataFim || convData) && convHoraFim) {
      dataHoraFim = `${convDataFim || convData}T${convHoraFim}:00`
    } else {
      const fimAuto = new Date(dataHoraInicio)
      fimAuto.setHours(fimAuto.getHours() + 1)
      dataHoraFim = fimAuto.toISOString().slice(0, 19)
    }
    const duracaoMin = Math.max(Math.round((new Date(dataHoraFim).getTime() - new Date(dataHoraInicio).getTime()) / 60000), 30)

    const agendamento: Agendamento = {
      id: uid(),
      user_id: '',
      cliente_id: null,
      venda_id: nova.id,
      nome_cliente: orc.nome_cliente,
      telefone_cliente: orc.telefone_cliente || '',
      servico: descItens,
      titulo: descItens,
      data_hora: dataHoraInicio,
      data_hora_fim: dataHoraFim,
      duracao_min: duracaoMin,
      status: 'pendente',
      observacoes: orc.observacoes || '',
      desconto: 0,
      valor: orc.valor_total,
      cor: convCor,
      created_at: new Date().toISOString(),
    }
    salvarAgendamentos([agendamento, ...agendamentos])

    setConvModal(false)
    setConvOrc(null)
    setConvHoraFim('10:00')
    setConvDataFim('')
    setOrcDetalhe(null)
    setTab('vendas')
  }


  const adicionar = async () => {
    if (!form.nome_cliente || !form.valor) return
    const valor = parseFloat(form.valor)
    const descRaw = parseFloat(form.desconto || '0')
    const desconto = descontoTipo === 'percentual' ? valor * (descRaw / 100) : descRaw
    const valorTotal = Math.max(valor - desconto, 0)
    const vendaId = uid()
    const temPagamento = !!form.forma_pagamento
    const nova: Venda = {
      id: vendaId, user_id: '', cliente_id: null, nome_cliente: form.nome_cliente,
      descricao: form.descricao, valor, desconto, valor_total: valorTotal,
      valor_pago: temPagamento ? valorTotal : 0,
      forma_pagamento: form.forma_pagamento || null,
      status_pagamento: temPagamento ? 'pago' : 'pendente',
      data_venda: form.data_venda,
      data_agendamento: form.data_agendamento || undefined,
      hora_agendamento: form.data_agendamento ? form.hora_agendamento : undefined,
      status: 'fechada', parcelas: parseInt(form.parcelas),
      funcionario: form.funcionario, colaborador_id: form.colaborador_id || null, observacoes: form.observacoes,
      checklist_id: null, created_at: new Date().toISOString(),
    }
    salvar([nova, ...vendas])

    // Se tem forma_pagamento → criar pagamento + financeiro via RPC
    if (temPagamento) {
      supabase.rpc('capturar_pagamento', {
        p_venda_id: vendaId,
        p_valor: valorTotal,
        p_forma_pagamento: form.forma_pagamento,
        p_parcelas: parseInt(form.parcelas) || 1,
        p_data_pagamento: form.data_venda,
        p_observacoes: null,
        p_criar_financeiro: true,
      }).then(({ error }) => {
        if (error) console.error('Erro ao criar pagamento:', error.message)
      })
    }

    // Se data de agendamento preenchida → criar agendamento automaticamente
    if (form.data_agendamento) {
      const dataHoraInicio = `${form.data_agendamento}T${form.hora_agendamento || '09:00'}:00`
      let dataHoraFim: string
      if (form.data_agendamento_fim && form.hora_agendamento_fim) {
        dataHoraFim = `${form.data_agendamento_fim}T${form.hora_agendamento_fim}:00`
      } else {
        const fimAuto = new Date(dataHoraInicio)
        fimAuto.setHours(fimAuto.getHours() + 1)
        dataHoraFim = fimAuto.toISOString().slice(0, 19)
      }
      const duracaoMin = Math.max(Math.round((new Date(dataHoraFim).getTime() - new Date(dataHoraInicio).getTime()) / 60000), 30)
      const novoAg: Agendamento = {
        id: uid(), user_id: '', cliente_id: null, venda_id: vendaId,
        nome_cliente: form.nome_cliente, telefone_cliente: '',
        placa: form.placa_agendamento || '', veiculo: form.veiculo_agendamento || '',
        servico: form.descricao, titulo: form.descricao,
        data_hora: dataHoraInicio,
        data_hora_fim: dataHoraFim,
        duracao_min: duracaoMin, status: 'pendente',
        observacoes: form.observacoes, desconto, valor: valorTotal,
        cor: form.cor_agendamento || '#4285F4', created_at: new Date().toISOString(),
      }
      salvarAgendamentos([novoAg, ...agendamentos])
      // Criar item no kanban na etapa Agendado
      const novoKanban = {
        id: uid(), user_id: '', etapa: 'agendado',
        nome_cliente: form.nome_cliente, telefone_cliente: '', placa: '', veiculo: '',
        servico: form.descricao, valor: valorTotal, observacoes: form.observacoes,
        origem_tipo: 'agendamento', origem_id: novoAg.id,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      salvarKanban([novoKanban, ...kanbanItems])
    }

    setModal(false)
    setForm(initForm())
    setMostrarChecklist(false)
    setChecklistSalvo(false)
  }

  const remover = (id: string) => { salvar(vendas.filter((v) => v.id !== id)); setDetalhe(null) }
  const toggleStatus = (id: string) => salvar(vendas.map((v) => v.id === id ? { ...v, status: v.status === 'aberta' ? 'fechada' as const : 'aberta' as const } : v))

  const enviarWhatsApp = (v: Venda) => {
    const formaPagLabel = v.forma_pagamento ? FORMAS.find(f => f.value === v.forma_pagamento)?.label : 'Pendente'
    const texto = `*Venda* - ${v.nome_cliente}\n${v.descricao}\nValor: ${fmt(v.valor_total || v.valor)}\nPagamento: ${formaPagLabel}\nData: ${new Date(v.data_venda).toLocaleDateString('pt-BR')}${v.parcelas > 1 ? `\nParcelas: ${v.parcelas}x` : ''}${v.desconto ? `\nDesconto: ${fmt(v.desconto)}` : ''}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const filtradas = useMemo(() => {
    const result = vendas.filter((v) => {
      const t = buscaDebounced.toLowerCase()
      const matchBusca = v.nome_cliente.toLowerCase().includes(t) || v.descricao.toLowerCase().includes(t)
      const matchPag = filtroPagamento === 'todos' || (v.status_pagamento || 'pago') === filtroPagamento
      return matchBusca && matchPag && isInRange(v.data_venda)
    })
    // Sort: pendentes → parciais → resto por data desc
    const ORDER: Record<string, number> = { pendente: 0, parcial: 1, pago: 2, cortesia: 3, cancelada: 4 }
    result.sort((a, b) => {
      const oa = ORDER[a.status_pagamento || 'pago'] ?? 2
      const ob = ORDER[b.status_pagamento || 'pago'] ?? 2
      if (oa !== ob) return oa - ob
      return new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
    })
    return result
  }, [vendas, buscaDebounced, filtroPagamento, isInRange])

  // Contadores de status_pagamento (no período)
  const contagensPag = useMemo(() => {
    const base = vendas.filter(v => isInRange(v.data_venda))
    return {
      todos: base.length,
      pendente: base.filter(v => (v.status_pagamento || 'pago') === 'pendente').length,
      parcial: base.filter(v => v.status_pagamento === 'parcial').length,
      pago: base.filter(v => (v.status_pagamento || 'pago') === 'pago').length,
      cortesia: base.filter(v => v.status_pagamento === 'cortesia').length,
      cancelada: base.filter(v => v.status_pagamento === 'cancelada').length,
    }
  }, [vendas, isInRange])

  const { totalHoje, totalPeriodo, abertas, totalPendente } = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0]
    return {
      totalHoje: vendas.filter((v) => v.data_venda === hoje).reduce((a, v) => a + (v.valor_total || v.valor), 0),
      totalPeriodo: vendas.filter((v) => isInRange(v.data_venda)).reduce((a, v) => a + (v.valor_total || v.valor), 0),
      abertas: vendas.filter(v => v.status === 'aberta').length,
      totalPendente: vendas.filter(v => isInRange(v.data_venda) && (v.status_pagamento === 'pendente' || v.status_pagamento === 'parcial')).reduce((a, v) => a + ((v.valor_total || v.valor) - (v.valor_pago || 0)), 0),
    }
  }, [vendas, isInRange])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{vendas.length} venda{vendas.length !== 1 ? 's' : ''}{abertas > 0 ? ` · ${abertas} aberta${abertas !== 1 ? 's' : ''}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setOrcModal(true); setTab('orcamento') }} className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-bold transition-colors">
            <FileText size={14} /> Novo Orçamento
          </button>
          <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-full text-xs font-bold transition-colors shadow-sm">
            <Plus size={16} /> Nova Venda
          </button>
        </div>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('vendas')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${tab === 'vendas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <ShoppingCart size={14} /> Vendas
        </button>
        <button onClick={() => setTab('orcamento')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${tab === 'orcamento' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileText size={14} /> Orçamento{orcamentos.length > 0 ? ` (${orcamentos.length})` : ''}
        </button>
      </div>

      {tab === 'vendas' && (<>
      {/* Filtros: busca + status venda + chips pagamento */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou descrição..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
        </div>
        {/* Chips de status de pagamento */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'todos', label: 'Todas', count: contagensPag.todos, color: 'bg-gray-100 text-gray-700' },
            { key: 'pendente', label: 'Pendentes', count: contagensPag.pendente, color: 'bg-warning-100 text-warning-700' },
            { key: 'parcial', label: 'Parciais', count: contagensPag.parcial, color: 'bg-blue-100 text-blue-700' },
            { key: 'pago', label: 'Pagas', count: contagensPag.pago, color: 'bg-success-100 text-success-700' },
            { key: 'cortesia', label: 'Cortesia', count: contagensPag.cortesia, color: 'bg-gray-100 text-gray-500' },
            { key: 'cancelada', label: 'Canceladas', count: contagensPag.cancelada, color: 'bg-danger-100 text-danger-600' },
          ] as const).map(chip => (
            <button
              key={chip.key}
              onClick={() => setFiltroPagamento(chip.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                filtroPagamento === chip.key
                  ? chip.color + ' ring-2 ring-offset-1 ring-gray-300'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {chip.label}{chip.count > 0 ? ` (${chip.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total hoje', value: fmt(totalHoje), color: 'text-success-600', iconBg: 'bg-success-100' },
          { label: periodoLabel, value: fmt(totalPeriodo), color: 'text-primary-600', iconBg: 'bg-primary-100' },
          { label: 'A receber', value: fmt(totalPendente), color: 'text-warning-600', iconBg: 'bg-warning-100' },
          { label: 'No período', value: filtradas.length, color: 'text-violet-600', iconBg: 'bg-violet-100' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 ${item.iconBg} rounded-xl flex items-center justify-center`}><TrendingUp size={16} className={`sm:hidden ${item.color}`} /><TrendingUp size={18} className={`hidden sm:block ${item.color}`} /></div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-400">{item.label}</p>
            </div>
            <p className={`text-lg sm:text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <ShoppingCart size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Registre sua primeira venda'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((v) => {
            const semPagamento = !v.status_pagamento || v.status_pagamento === 'pendente'
            const parcial = v.status_pagamento === 'parcial'
            return (
            <div key={v.id} className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 active:bg-gray-50 transition-colors cursor-pointer border ${
              semPagamento ? 'border-warning-300 ring-1 ring-warning-100' : 'border-gray-100'
            }`} onClick={() => setDetalhe(v)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.status === 'aberta' ? 'bg-warning-100' : 'bg-success-100'}`}>
                    {v.status === 'aberta' ? <Unlock size={16} className="text-warning-600" /> : <Lock size={16} className="text-success-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.nome_cliente}</p>
                      {v.status_pagamento && v.status_pagamento !== 'pago' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          v.status_pagamento === 'pendente' ? 'bg-warning-100 text-warning-700' :
                          v.status_pagamento === 'parcial' ? 'bg-blue-100 text-blue-700' :
                          v.status_pagamento === 'cortesia' ? 'bg-gray-100 text-gray-500' :
                          v.status_pagamento === 'cancelada' ? 'bg-danger-100 text-danger-600' : ''
                        }`}>
                          {v.status_pagamento === 'pendente' ? '⚠ Pagamento pendente' : v.status_pagamento === 'parcial' ? '⚠ Pagamento parcial' : v.status_pagamento === 'cortesia' ? 'Cortesia' : v.status_pagamento === 'cancelada' ? 'Cancelada' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-400 truncate">{v.descricao}{v.forma_pagamento ? ` · ${FORMAS.find((f) => f.value === v.forma_pagamento)?.label}` : ''} · {new Date(v.data_venda).toLocaleDateString('pt-BR')}{v.parcelas > 1 ? ` · ${v.parcelas}x` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                  <p className={`text-sm font-bold ${semPagamento ? 'text-warning-600' : parcial ? 'text-blue-600' : 'text-success-600'}`}>{fmt(v.valor_total || v.valor)}</p>
                  <button onClick={(e) => { e.stopPropagation(); enviarWhatsApp(v) }} className="p-1.5 text-gray-300 hover:text-green-500 transition-colors hidden sm:block"><MessageCircle size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); remover(v.id) }} className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              {semPagamento && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-warning-700 bg-warning-50 rounded-md px-2 py-1">
                  ⚠ Esta venda ainda não tem pagamento registrado. Clique para capturar.
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
      </>)}

      {/* Modal Nova Venda */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setModal(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Nova Venda</h2>
              <button onClick={() => setModal(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-4">
              <ClientePicker
                value={form.nome_cliente}
                onChange={(nome, _tel, _veic, _placa, clienteId) => setForm(prev => ({
                  ...prev,
                  nome_cliente: nome,
                  clienteId: clienteId || '',
                  // se trocou de cliente, limpa veículo selecionado
                  placa_agendamento: clienteId !== prev.clienteId ? '' : prev.placa_agendamento,
                  veiculo_agendamento: clienteId !== prev.clienteId ? '' : prev.veiculo_agendamento,
                }))}
              />
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Serviço</label>
                <div className="relative">
                  <select
                    value={form.servicoSelecionado}
                    onChange={(e) => {
                      const sel = e.target.value
                      if (sel && sel !== 'custom') {
                        const srv = servicos.find(s => s.id === sel)
                        if (srv) {
                          setForm(prev => ({ ...prev, servicoSelecionado: sel, descricao: srv.nome, valor: srv.preco_padrao.toString() }))
                          return
                        }
                      }
                      if (sel === 'custom') {
                        setForm(prev => ({ ...prev, servicoSelecionado: 'custom', descricao: '', valor: '' }))
                        return
                      }
                      setForm(prev => ({ ...prev, servicoSelecionado: '' }))
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um serviço...</option>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome} - {fmt(s.preco_padrao)}</option>
                    ))}
                    <option value="custom">Outro (digitar manualmente)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {(form.servicoSelecionado === 'custom' || form.servicoSelecionado === '') && (
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder="Ex: Polimento completo + Higienização"
                    className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto</label>
                  <div className="flex gap-1">
                    <input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: e.target.value })} placeholder="0,00" className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-l-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    <div className="flex border border-gray-200 rounded-r-xl overflow-hidden">
                      <button type="button" onClick={() => setDescontoTipo('valor')} className={`px-2.5 py-2.5 text-[11px] font-bold transition-colors ${descontoTipo === 'valor' ? 'bg-primary-500 text-on-primary' : 'bg-white text-gray-400 hover:text-gray-600'}`}>R$</button>
                      <button type="button" onClick={() => setDescontoTipo('percentual')} className={`px-2.5 py-2.5 text-[11px] font-bold transition-colors ${descontoTipo === 'percentual' ? 'bg-primary-500 text-on-primary' : 'bg-white text-gray-400 hover:text-gray-600'}`}>%</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Pagamento</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as FormaPagamento | '' })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value="">Sem pagamento agora</option>
                    {FORMAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Parcelas</label>
                  <select value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    {PARCELAS.map((p) => <option key={p} value={p}>{p}x</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data de Pagamento *</label>
                  <input type="date" value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <ColaboradorPicker
                  value={form.funcionario}
                  colaboradorId={form.colaborador_id}
                  onChange={(id, nome) => setForm({ ...form, colaborador_id: id, funcionario: nome })}
                  label="Colaborador"
                  placeholder="Opcional"
                />
              </div>
              {/* Agendamento automático */}
              <div className="border border-blue-100 bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <CalendarDays size={13} /> Agendamento (opcional)
                </p>
                {/* Entrada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Data de entrada</label>
                    <input type="date" value={form.data_agendamento}
                      onChange={(e) => setForm({ ...form, data_agendamento: e.target.value, data_agendamento_fim: form.data_agendamento_fim || e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Hora de entrada</label>
                    <input type="time" value={form.hora_agendamento}
                      onChange={(e) => setForm({ ...form, hora_agendamento: e.target.value })}
                      disabled={!form.data_agendamento}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50" />
                  </div>
                </div>
                {/* Saída */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Data de saída</label>
                    <input type="date" value={form.data_agendamento_fim}
                      onChange={(e) => setForm({ ...form, data_agendamento_fim: e.target.value })}
                      disabled={!form.data_agendamento}
                      min={form.data_agendamento}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Hora de saída</label>
                    <input type="time" value={form.hora_agendamento_fim}
                      onChange={(e) => setForm({ ...form, hora_agendamento_fim: e.target.value })}
                      disabled={!form.data_agendamento}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50" />
                  </div>
                </div>
                {/* Veículo do cliente — picker inteligente */}
                {form.data_agendamento && (() => {
                  const veiculosCliente = form.clienteId
                    ? todosVeiculos.filter(v => v.cliente_id === form.clienteId)
                    : []

                  // Auto-seleciona se for o único veículo
                  if (veiculosCliente.length === 1 && !form.placa_agendamento) {
                    const v = veiculosCliente[0]
                    setTimeout(() => setForm(prev => ({
                      ...prev,
                      placa_agendamento: v.placa,
                      veiculo_agendamento: `${v.marca} ${v.modelo}`.trim(),
                    })), 0)
                  }

                  // Caso: cliente tem 2+ veículos → mostrar picker
                  if (veiculosCliente.length > 1) {
                    return (
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                          Veículo do cliente <span className="text-gray-400">({veiculosCliente.length} disponíveis)</span>
                        </label>
                        <div className="space-y-2">
                          {veiculosCliente.map(v => {
                            const selecionado = form.placa_agendamento === v.placa
                            return (
                              <button key={v.id} type="button"
                                onClick={() => setForm({
                                  ...form,
                                  placa_agendamento: v.placa,
                                  veiculo_agendamento: `${v.marca} ${v.modelo}`.trim(),
                                })}
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
                  }

                  // Caso: cliente tem 1 veículo (já auto-selecionado) → mostra info compacta
                  if (veiculosCliente.length === 1 && form.placa_agendamento) {
                    const v = veiculosCliente[0]
                    return (
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-primary-50 border border-primary-200 rounded-xl">
                        <Car size={16} className="text-primary-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{v.placa} · {[v.marca, v.modelo].filter(Boolean).join(' ')}</p>
                          <p className="text-[10px] text-gray-500">Veículo do cliente</p>
                        </div>
                      </div>
                    )
                  }

                  // Caso: cliente sem veículo cadastrado OU sem cliente selecionado → inputs manuais
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Placa</label>
                        <input type="text" value={form.placa_agendamento}
                          onChange={(e) => setForm({ ...form, placa_agendamento: e.target.value.toUpperCase() })}
                          placeholder="ABC-1234" maxLength={8}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none uppercase" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Modelo</label>
                        <input type="text" value={form.veiculo_agendamento}
                          onChange={(e) => setForm({ ...form, veiculo_agendamento: e.target.value })}
                          placeholder="Ex: Toyota Corolla"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
                      </div>
                    </div>
                  )
                })()}
                {/* Cor */}
                {form.data_agendamento && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cor na agenda</label>
                    <div className="flex flex-wrap gap-2">
                      {CORES_AGENDA.map((c) => (
                        <button key={c} type="button"
                          onClick={() => setForm({ ...form, cor_agendamento: c })}
                          className={`w-7 h-7 rounded-full transition-all ${form.cor_agendamento === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações da venda..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>

              {/* Checklist opcional */}
              <div className={`border rounded-xl overflow-hidden transition-all ${
                mostrarChecklist ? 'border-success-200' : 'border-gray-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setMostrarChecklist(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={16} className={mostrarChecklist ? 'text-success-500' : 'text-gray-400'} />
                    <span className="text-sm font-semibold text-gray-700">
                      Checklist de inspeção
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      opcional
                    </span>
                    {checklistSalvo && (
                      <span className="text-[10px] text-success-600 bg-success-50 px-2 py-0.5 rounded-full font-bold">
                        ✓ Salvo
                      </span>
                    )}
                  </div>
                  {mostrarChecklist
                    ? <ChevronUp size={16} className="text-gray-400" />
                    : <ChevronDown size={16} className="text-gray-400" />
                  }
                </button>

                {mostrarChecklist && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <ChecklistUnificado
                      tipo="venda"
                      nomeCliente={form.nome_cliente}
                      origem={{
                        id: 'pendente',
                        user_id: user?.id || '',
                        cliente_id: null,
                        nome_cliente: form.nome_cliente,
                        descricao: form.descricao,
                        valor: parseFloat(form.valor) || 0,
                        desconto: 0,
                        valor_total: parseFloat(form.valor) || 0,
                        forma_pagamento: form.forma_pagamento || 'pix',
                        data_venda: form.data_venda,
                        parcelas: parseInt(form.parcelas) || 1,
                        funcionario: form.funcionario,
                        observacoes: form.observacoes,
                        checklist_id: null,
                        created_at: new Date().toISOString(),
                      } as Venda}
                      onSalvo={() => {
                        setChecklistSalvo(true)
                        setMostrarChecklist(false)
                        toast.success('Checklist salvo. Será vinculado à venda ao registrar.')
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Resumo */}
              {form.valor && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-600 mb-2">Resumo da venda</p>
                  {(() => {
                    const subtotal = parseFloat(form.valor) || 0
                    const descRaw = parseFloat(form.desconto || '0')
                    const descValor = descontoTipo === 'percentual' ? subtotal * (descRaw / 100) : descRaw
                    const total = Math.max(subtotal - descValor, 0)
                    return (
                      <>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Sub-total</span><span className="font-semibold">{fmt(subtotal)}</span></div>
                        {descRaw > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto{descontoTipo === 'percentual' ? ` (${descRaw}%)` : ''}</span><span className="font-semibold text-danger-500">-{fmt(descValor)}</span></div>}
                        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-success-600">{fmt(total)}</span></div>
                      </>
                    )
                  })()}
                </div>
              )}
              <button onClick={adicionar} className="w-full py-3 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-sm font-bold transition-colors min-h-[44px]">
                Registrar Venda
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe da Venda */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setDetalhe(null); setEditDetalhe(null) }}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Venda - {detalhe.status === 'fechada' ? 'Fechada' : 'Aberta'}</h2>
              <button onClick={() => { setDetalhe(null); setEditDetalhe(null) }} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><span className="text-sm font-bold text-primary-600">{detalhe.nome_cliente.slice(0,2).toUpperCase()}</span></div>
                <div><p className="text-sm font-bold text-gray-900">{detalhe.nome_cliente}</p><p className="text-xs text-gray-400">Cliente</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-600">Resumo da venda</p>
                  {!editDetalhe && (
                    <button
                      onClick={() => setEditDetalhe({
                        valor: String(detalhe.valor),
                        desconto: String(detalhe.desconto || 0),
                        forma_pagamento: detalhe.forma_pagamento || 'pix',
                        parcelas: String(detalhe.parcelas || 1),
                        descontoTipo: 'valor',
                      })}
                      className="text-[10px] font-bold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Venda do dia</span><span>{new Date(detalhe.data_venda).toLocaleDateString('pt-BR')}</span></div>
                {detalhe.descricao && <div className="flex justify-between text-xs"><span className="text-gray-500">Serviços</span><span>{detalhe.descricao}</span></div>}

                {editDetalhe ? (
                  <div className="space-y-3 pt-2 border-t border-gray-200 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 mb-1 block">Valor (R$)</label>
                        <input type="number" step="0.01" value={editDetalhe.valor} onChange={(e) => setEditDetalhe({ ...editDetalhe, valor: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 mb-1 block">Desconto</label>
                        <div className="flex gap-0.5">
                          <input type="number" step="0.01" value={editDetalhe.desconto} onChange={(e) => setEditDetalhe({ ...editDetalhe, desconto: e.target.value })} className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                          <div className="flex border border-gray-200 rounded-r-lg overflow-hidden">
                            <button type="button" onClick={() => setEditDetalhe({ ...editDetalhe, descontoTipo: 'valor' })} className={`px-2 py-2 text-[10px] font-bold transition-colors ${editDetalhe.descontoTipo === 'valor' ? 'bg-primary-500 text-on-primary' : 'bg-white text-gray-400'}`}>R$</button>
                            <button type="button" onClick={() => setEditDetalhe({ ...editDetalhe, descontoTipo: 'percentual' })} className={`px-2 py-2 text-[10px] font-bold transition-colors ${editDetalhe.descontoTipo === 'percentual' ? 'bg-primary-500 text-on-primary' : 'bg-white text-gray-400'}`}>%</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 mb-1 block">Pagamento</label>
                        <select value={editDetalhe.forma_pagamento} onChange={(e) => setEditDetalhe({ ...editDetalhe, forma_pagamento: e.target.value as FormaPagamento })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                          {FORMAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 mb-1 block">Parcelas</label>
                        <select value={editDetalhe.parcelas} onChange={(e) => setEditDetalhe({ ...editDetalhe, parcelas: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                          {PARCELAS.map((p) => <option key={p} value={p}>{p}x</option>)}
                        </select>
                      </div>
                    </div>
                    {(() => {
                      const edSub = parseFloat(editDetalhe.valor) || 0
                      const edDescRaw = parseFloat(editDetalhe.desconto) || 0
                      const edDescVal = editDetalhe.descontoTipo === 'percentual' ? edSub * (edDescRaw / 100) : edDescRaw
                      return (
                        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                          <span>Novo total</span>
                          <span className="text-success-600">{fmt(Math.max(edSub - edDescVal, 0))}</span>
                        </div>
                      )
                    })()}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditDetalhe(null)}
                        className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const novoValor = parseFloat(editDetalhe.valor) || detalhe.valor
                          const descRaw = parseFloat(editDetalhe.desconto) || 0
                          const novoDesconto = editDetalhe.descontoTipo === 'percentual' ? novoValor * (descRaw / 100) : descRaw
                          const novoTotal = Math.max(novoValor - novoDesconto, 0)
                          const atualizada = {
                            ...detalhe,
                            valor: novoValor,
                            desconto: novoDesconto,
                            valor_total: novoTotal,
                            forma_pagamento: editDetalhe.forma_pagamento,
                            parcelas: parseInt(editDetalhe.parcelas) || 1,
                          }
                          salvar(vendas.map(v => v.id === detalhe.id ? atualizada : v))
                          setDetalhe(atualizada)
                          setEditDetalhe(null)
                        }}
                        className="flex-1 py-2 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-lg text-xs font-bold transition-colors"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Subtotal</span><span>{fmt(detalhe.valor)}</span></div>
                    {detalhe.desconto > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="text-danger-500">-{fmt(detalhe.desconto)}</span></div>}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Valor total</span><span className="text-success-600">{fmt(detalhe.valor_total || detalhe.valor)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Pagamento</span><span>{detalhe.forma_pagamento ? FORMAS.find(f => f.value === detalhe.forma_pagamento)?.label : 'Pendente'}{detalhe.parcelas > 1 ? ` · ${detalhe.parcelas}x` : ''}</span></div>
                  </>
                )}
                {detalhe.funcionario && <div className="flex justify-between text-xs"><span className="text-gray-500">Funcionário</span><span>{detalhe.funcionario}</span></div>}
                {detalhe.observacoes && <div className="text-xs text-gray-500 mt-2"><span className="font-medium">Obs:</span> {detalhe.observacoes}</div>}
              </div>
              {/* Status de pagamento + CTA */}
              {detalhe.status_pagamento && detalhe.status_pagamento !== 'pago' && detalhe.status_pagamento !== 'cortesia' && detalhe.status_pagamento !== 'cancelada' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pagamento</p>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${detalhe.status_pagamento === 'pendente' ? 'bg-warning-100 text-warning-700' : 'bg-blue-100 text-blue-700'}`}>
                      {detalhe.status_pagamento === 'pendente' ? 'Pendente' : 'Parcial'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Pago</span>
                    <span className="font-bold text-success-600">{fmt(detalhe.valor_pago || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-1.5">
                    <span className="text-gray-500 font-bold">Restante</span>
                    <span className="font-bold text-warning-600">{fmt((detalhe.valor_total || detalhe.valor) - (detalhe.valor_pago || 0))}</span>
                  </div>
                  <button
                    onClick={() => setVendaPagModal(true)}
                    className="w-full py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard size={14} /> Capturar pagamento
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { toggleStatus(detalhe.id); setDetalhe({ ...detalhe, status: detalhe.status === 'aberta' ? 'fechada' : 'aberta' }) }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${detalhe.status === 'aberta' ? 'bg-success-500 hover:bg-success-600 text-white' : 'bg-warning-500 hover:bg-warning-600 text-white'}`}>
                  {detalhe.status === 'aberta' ? 'Fechar venda' : 'Reabrir venda'}
                </button>
                <button onClick={() => enviarWhatsApp(detalhe)} className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
              {/* Ações especiais: cortesia + cancelar */}
              {detalhe.status_pagamento !== 'cortesia' && detalhe.status_pagamento !== 'cancelada' && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm('Marcar esta venda como cortesia? Pagamentos existentes serão removidos.')) return
                      const { error } = await supabase.rpc('marcar_cortesia', { p_venda_id: detalhe.id })
                      if (error) { toast.error('Erro: ' + error.message); return }
                      const atualizada = { ...detalhe, status_pagamento: 'cortesia' as const, valor_pago: 0 }
                      salvar(vendas.map(v => v.id === detalhe.id ? atualizada : v))
                      setDetalhe(atualizada)
                      toast.success('Venda marcada como cortesia')
                    }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cortesia
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Cancelar esta venda? Pagamentos e lançamentos financeiros serão removidos.')) return
                      const { error } = await supabase.rpc('cancelar_venda', { p_venda_id: detalhe.id })
                      if (error) { toast.error('Erro: ' + error.message); return }
                      const atualizada = { ...detalhe, status_pagamento: 'cancelada' as const, valor_pago: 0 }
                      salvar(vendas.map(v => v.id === detalhe.id ? atualizada : v))
                      setDetalhe(atualizada)
                      toast.success('Venda cancelada')
                    }}
                    className="flex-1 py-2.5 border border-danger-200 text-danger-500 hover:bg-danger-50 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancelar venda
                  </button>
                </div>
              )}
              {/* Checklist unificado (diagrama + defeitos com foto/descrição + PDF) */}
              <button
                onClick={() => { setMostrarChecklist(!mostrarChecklist); setChecklistSalvo(false) }}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <ClipboardCheck size={14} /> {mostrarChecklist ? 'Ocultar Checklist' : (detalhe.checklist_id ? 'Ver Checklist' : 'Criar Checklist')}
              </button>
              {mostrarChecklist && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <ChecklistUnificado
                    tipo="venda"
                    nomeCliente={detalhe.nome_cliente}
                    origem={detalhe}
                    onSalvo={(checklistId) => {
                      const atualizada = { ...detalhe, checklist_id: checklistId }
                      salvar(vendas.map(v => v.id === detalhe.id ? atualizada : v))
                      setDetalhe(atualizada)
                      setChecklistSalvo(true)
                    }}
                    onClose={() => setMostrarChecklist(false)}
                  />
                </div>
              )}
              <button onClick={() => remover(detalhe.id)} className="w-full py-2.5 border border-danger-200 text-danger-600 hover:bg-danger-50 rounded-xl text-xs font-bold transition-colors">
                Excluir Venda
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
      {/* === Orçamento Tab === */}
      {tab === 'orcamento' && (
        <>
          {orcamentos.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold text-lg">Nenhum orçamento</p>
              <p className="text-gray-400 text-sm mt-1">Crie orçamentos para enviar ao cliente e converter em vendas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orcamentos.map((pv) => {
                const stColor = pv.status === 'aprovado' ? 'bg-success-100 text-success-700' : pv.status === 'recusado' ? 'bg-danger-100 text-danger-600' : 'bg-warning-100 text-warning-700'
                return (
                  <div key={pv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 active:bg-gray-50 transition-colors" onClick={() => setOrcDetalhe(pv)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><FileText size={16} className="text-blue-600" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{pv.nome_cliente}</p>
                          <p className="text-[11px] sm:text-xs text-gray-400 truncate">{pv.itens.length} ite{pv.itens.length === 1 ? 'm' : 'ns'} · {new Date(pv.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${stColor}`}>
                          {pv.status === 'aprovado' ? 'Convertida' : pv.status === 'recusado' ? 'Cancelada' : 'Pendente'}
                        </span>
                        <p className="text-sm font-bold text-gray-900">{fmt(pv.valor_total)}</p>
                        <button onClick={(e) => { e.stopPropagation(); removerOrc(pv.id) }} className="p-1.5 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Novo Orçamento */}
      {orcModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOrcModal(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Novo Orçamento</h2>
              <button onClick={() => setOrcModal(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente *</label>
                  <input type="text" value={orcForm.nome_cliente} onChange={(e) => setOrcForm({ ...orcForm, nome_cliente: e.target.value })} placeholder="Nome do cliente" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                  <input type="tel" value={orcForm.telefone_cliente} onChange={(e) => setOrcForm({ ...orcForm, telefone_cliente: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Itens</label>
                  <button type="button" onClick={() => setOrcItens([...orcItens, { descricao: '', quantidade: 1, valor_unitario: 0 }])} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"><PlusCircle size={12} /> Adicionar</button>
                </div>
                <div className="space-y-2">
                  {orcItens.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input type="text" value={item.descricao} onChange={(e) => { const n = [...orcItens]; n[idx] = { ...n[idx], descricao: e.target.value }; setOrcItens(n) }} placeholder="Serviço" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      <input type="number" min="1" value={item.quantidade} onChange={(e) => { const n = [...orcItens]; n[idx] = { ...n[idx], quantidade: parseInt(e.target.value) || 1 }; setOrcItens(n) }} className="w-14 px-2 py-2 border border-gray-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                      <input type="number" step="0.01" value={item.valor_unitario || ''} onChange={(e) => { const n = [...orcItens]; n[idx] = { ...n[idx], valor_unitario: parseFloat(e.target.value) || 0 }; setOrcItens(n) }} placeholder="R$" className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                      {orcItens.length > 1 && <button type="button" onClick={() => setOrcItens(orcItens.filter((_, i) => i !== idx))} className="p-2 text-gray-300 hover:text-danger-500 transition-colors shrink-0"><MinusCircle size={16} /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Desconto (R$)</label>
                  <input type="number" step="0.01" value={orcForm.desconto} onChange={(e) => setOrcForm({ ...orcForm, desconto: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Validade</label>
                  <input type="date" value={orcForm.validade} onChange={(e) => setOrcForm({ ...orcForm, validade: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={orcForm.observacoes} onChange={(e) => setOrcForm({ ...orcForm, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
              </div>
              {orcSubtotal > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-gray-600 mb-2">Resumo</p>
                  {orcItens.filter(i => i.descricao).map((i, idx) => (
                    <div key={idx} className="flex justify-between text-xs"><span className="text-gray-500">{i.descricao} ({i.quantidade}x {fmt(i.valor_unitario)})</span><span className="font-semibold">{fmt(i.quantidade * i.valor_unitario)}</span></div>
                  ))}
                  {orcDesc > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Desconto</span><span className="font-semibold text-danger-500">-{fmt(orcDesc)}</span></div>}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-success-600">{fmt(orcTotal)}</span></div>
                </div>
              )}
              <button onClick={adicionarOrc} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors">
                Criar Orçamento
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe Orçamento */}
      {orcDetalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOrcDetalhe(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Orçamento</h2>
              <button onClick={() => setOrcDetalhe(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-sm font-bold text-blue-600">{orcDetalhe.nome_cliente.slice(0, 2).toUpperCase()}</span></div>
                <div><p className="text-sm font-bold text-gray-900">{orcDetalhe.nome_cliente}</p>{orcDetalhe.telefone_cliente && <p className="text-xs text-gray-400">{orcDetalhe.telefone_cliente}</p>}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-600 mb-2">Itens do orçamento</p>
                {orcDetalhe.itens.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs"><span className="text-gray-600">{i.descricao} ({i.quantidade}x {fmt(i.valor_unitario)})</span><span className="font-semibold">{fmt(i.quantidade * i.valor_unitario)}</span></div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2"><span>Total</span><span className="text-success-600">{fmt(orcDetalhe.valor_total)}</span></div>
                {orcDetalhe.validade && <p className="text-[10px] text-gray-400">Válido até {new Date(orcDetalhe.validade).toLocaleDateString('pt-BR')}</p>}
                {orcDetalhe.observacoes && <p className="text-[10px] text-gray-400">Obs: {orcDetalhe.observacoes}</p>}
              </div>
              <div className="flex gap-2">
                {orcDetalhe.status === 'pendente' && (
                  <button onClick={() => abrirConversao(orcDetalhe)} className="flex-1 py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <CalendarDays size={14} /> Agendar e Converter
                  </button>
                )}
                <button
                  onClick={() => setMostrarChecklistOrc(v => !v)}
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <ClipboardCheck size={14} /> {mostrarChecklistOrc ? 'Ocultar Checklist' : (orcDetalhe.checklist_id ? 'Ver Checklist' : 'Checklist + PDF')}
                </button>
              </div>
              {mostrarChecklistOrc && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <ChecklistUnificado
                    tipo="orcamento"
                    nomeCliente={orcDetalhe.nome_cliente}
                    telefoneCliente={orcDetalhe.telefone_cliente}
                    origem={orcDetalhe}
                    onSalvo={(checklistId) => {
                      const atualizado = { ...orcDetalhe, checklist_id: checklistId }
                      salvarOrc(orcamentos.map(o => o.id === orcDetalhe.id ? atualizado : o))
                      setOrcDetalhe(atualizado)
                    }}
                    onClose={() => setMostrarChecklistOrc(false)}
                  />
                </div>
              )}
              {orcDetalhe.telefone_cliente && (
                <button onClick={() => { const tel = orcDetalhe.telefone_cliente?.replace(/\D/g, ''); window.open(`https://wa.me/${tel ? '55' + tel : ''}`, '_blank') }} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              )}
              <button onClick={() => removerOrc(orcDetalhe.id)} className="w-full py-2.5 border border-danger-200 text-danger-600 hover:bg-danger-50 rounded-xl text-xs font-bold transition-colors">
                Excluir Orçamento
              </button>
            </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal Conversão com Agendamento */}
      {convModal && convOrc && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setConvModal(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Agendar serviço</h2>
              <button onClick={() => setConvModal(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

            {/* Resumo da orçamento */}
            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1">
              <p className="text-xs font-bold text-gray-700">{convOrc.nome_cliente}</p>
              <p className="text-[11px] text-gray-500">{convOrc.itens.map(i => i.descricao).join(', ')}</p>
              <p className="text-sm font-bold text-success-600">{fmt(convOrc.valor_total)}</p>
            </div>

            <div className="space-y-4">
              {/* Data */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-primary-600" /> Data do serviço *
                </label>
                <input type="date" value={convData} onChange={e => setConvData(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>

              {/* Hora entrada */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                    <Clock size={14} className="text-primary-600" /> Hora de entrada
                  </label>
                  <input type="time" value={convHora} onChange={e => setConvHora(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div />
              </div>

              {/* Saída */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Data de saída</label>
                  <input type="date" value={convDataFim || convData}
                    onChange={e => setConvDataFim(e.target.value)}
                    min={convData}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Hora de saída</label>
                  <input type="time" value={convHoraFim}
                    onChange={e => setConvHoraFim(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              {/* Cor do agendamento */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Cor na agenda</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_AGENDA.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConvCor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${convCor === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-gray-400">
                O serviço será agendado e aparecerá na Agenda e no Kanban como <strong>"Agendado"</strong>.
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setConvModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarConversao} disabled={!convData} className="flex-1 px-4 py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                <CalendarDays size={14} /> Confirmar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal capturar pagamento (a partir de uma venda) */}
      {detalhe && (
        <CapturarPagamentoModal
          open={vendaPagModal}
          onClose={() => setVendaPagModal(false)}
          venda={detalhe}
          onSuccess={(vendaId, _pagId) => {
            // Recarregar venda atualizada localmente
            // A RPC atualiza o banco, mas o useCloudSync local precisa refletir
            // Buscar dados atualizados do Supabase
            supabase.from('vendas').select('*').eq('id', vendaId).single().then(({ data }) => {
              if (data) {
                salvar(vendas.map(v => v.id === vendaId ? data as Venda : v))
                setDetalhe(data as Venda)
              }
            })
          }}
        />
      )}
    </div>
  )
}
