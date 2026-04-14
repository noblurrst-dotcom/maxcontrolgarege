import { useState, useMemo } from 'react'
import { DollarSign, Plus, TrendingUp, TrendingDown, CreditCard, X, Trash2, Search, CheckCircle2, Clock, Landmark } from 'lucide-react'
import type { ContaFinanceira, FormaPagamento } from '../types'
import { uid, fmt } from '../lib/utils'
import { useDebounce } from '../hooks/useDebounce'
import { useCloudSync } from '../hooks/useCloudSync'

const CATEGORIAS_ENTRADA = ['Serviço', 'Venda', 'Comissão', 'Investimento', 'Outros']
const CATEGORIAS_SAIDA = ['Material', 'Aluguel', 'Salário', 'Fornecedor', 'Água/Luz', 'Internet', 'Manutenção', 'Outros']
const FORMAS: { value: FormaPagamento | ''; label: string }[] = [
  { value: '', label: 'Nenhuma' },
  { value: 'pix', label: 'Pix' }, { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' }, { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' }, { value: 'transferencia', label: 'Transferência' },
]

interface ContaBancaria { id: string; nome: string; banco: string; saldo: number; tipo: string; ativo: boolean }

const initForm = () => ({ categoria: '', descricao: '', valor: '', data: new Date().toISOString().split('T')[0], pago: true, conta_bancaria: '', forma_pagamento: '' as FormaPagamento | '' })

export default function Financeiro() {
  const { data: contas, save: salvar } = useCloudSync<ContaFinanceira>({ table: 'financeiro', storageKey: 'financeiro' })
  const { data: bancos, save: salvarBancos } = useCloudSync<ContaBancaria>({ table: 'contas_bancarias', storageKey: 'contas_bancarias' })
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 300)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [modal, setModal] = useState<'entrada' | 'saida' | null>(null)
  const [modalBanco, setModalBanco] = useState(false)
  const [form, setForm] = useState(initForm())
  const [formBanco, setFormBanco] = useState({ nome: '', banco: '', tipo: 'corrente', saldo: '' })

  const adicionar = () => {
    if (!form.descricao || !form.valor || !modal) return
    const nova: ContaFinanceira = {
      id: uid(), user_id: '', tipo: modal,
      categoria: form.categoria || (modal === 'entrada' ? 'Serviço' : 'Material'),
      descricao: form.descricao, valor: parseFloat(form.valor),
      data: form.data, pago: form.pago,
      conta_bancaria: form.conta_bancaria, forma_pagamento: form.forma_pagamento,
      created_at: new Date().toISOString(),
    }
    salvar([nova, ...contas])
    setModal(null)
    setForm(initForm())
  }

  const adicionarBanco = () => {
    if (!formBanco.nome) return
    const novo: ContaBancaria = { id: uid(), nome: formBanco.nome, banco: formBanco.banco, saldo: parseFloat(formBanco.saldo || '0'), tipo: formBanco.tipo, ativo: true }
    salvarBancos([novo, ...bancos])
    setModalBanco(false)
    setFormBanco({ nome: '', banco: '', tipo: 'corrente', saldo: '' })
  }

  const remover = (id: string) => salvar(contas.filter((c) => c.id !== id))
  const removerBanco = (id: string) => salvarBancos(bancos.filter(b => b.id !== id))
  const togglePago = (id: string) => salvar(contas.map(c => c.id === id ? { ...c, pago: !c.pago } : c))

  const { entradas, saidas, saldo, pendentes } = useMemo(() => {
    const mesAtual = new Date().getMonth()
    const anoAtual = new Date().getFullYear()
    const contasMes = contas.filter((c) => { const d = new Date(c.data); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual })
    const ent = contasMes.filter((c) => c.tipo === 'entrada').reduce((a, c) => a + c.valor, 0)
    const sai = contasMes.filter((c) => c.tipo === 'saida').reduce((a, c) => a + c.valor, 0)
    return { entradas: ent, saidas: sai, saldo: ent - sai, pendentes: contas.filter(c => !c.pago).length }
  }, [contas])

  const filtradas = useMemo(() => contas.filter(c => {
    const matchBusca = c.descricao.toLowerCase().includes(buscaDebounced.toLowerCase()) || c.categoria.toLowerCase().includes(buscaDebounced.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchBusca && matchTipo
  }), [contas, buscaDebounced, filtroTipo])

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-400 mt-0.5">{contas.length} lançamento{contas.length !== 1 ? 's' : ''}{pendentes > 0 ? ` · ${pendentes} pendente${pendentes !== 1 ? 's' : ''}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('entrada')} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold transition-colors">
            <Plus size={14} /> Entrada
          </button>
          <button onClick={() => setModal('saida')} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold transition-colors">
            <Plus size={14} /> Saída
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-emerald-600" /></div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-400">Entradas</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">{fmt(entradas)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-100 rounded-xl flex items-center justify-center"><TrendingDown size={16} className="text-red-500" /></div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-400">Saídas</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-red-500">{fmt(saidas)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}><CreditCard size={16} className={saldo >= 0 ? 'text-blue-600' : 'text-amber-600'} /></div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-400">Saldo</p>
          </div>
          <p className={`text-lg sm:text-xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(saldo)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-100 rounded-xl flex items-center justify-center"><Clock size={16} className="text-amber-600" /></div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-400">Pendentes</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-600">{pendentes}</p>
        </div>
      </div>

      {/* Contas bancárias */}
      {bancos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900"><Landmark size={14} className="inline mr-1" />Contas bancárias</p>
            <button onClick={() => setModalBanco(true)} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"><Plus size={12} /> Nova conta</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {bancos.map(b => (
              <div key={b.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">{b.nome}</p>
                  <p className="text-[10px] text-gray-400">{b.banco || b.tipo}</p>
                  <p className="text-sm font-bold text-primary-600 mt-1">{fmt(b.saldo)}</p>
                </div>
                <button onClick={() => removerBanco(b.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {bancos.length === 0 && (
        <button onClick={() => setModalBanco(true)} className="w-full bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-4 text-center hover:bg-gray-50 transition-colors">
          <Landmark size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-500">Cadastrar conta bancária</p>
          <p className="text-[10px] text-gray-400">Gerencie saldos e vincule lançamentos</p>
        </button>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição ou categoria..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="todos">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <DollarSign size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">{busca ? 'Nenhum resultado' : 'Nenhum lançamento registrado'}</p>
          <p className="text-gray-400 text-sm mt-1">{busca ? 'Tente outro termo' : 'Adicione entradas e saídas'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((c) => (
            <div key={c.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 flex items-center justify-between ${!c.pago ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.tipo === 'entrada' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {c.tipo === 'entrada' ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.descricao}</p>
                  <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                    {c.categoria} · {new Date(c.data).toLocaleDateString('pt-BR')}
                    {c.forma_pagamento ? ` · ${FORMAS.find(f => f.value === c.forma_pagamento)?.label}` : ''}
                    {c.conta_bancaria ? ` · ${bancos.find(b => b.id === c.conta_bancaria)?.nome || ''}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                <button onClick={() => togglePago(c.id)} className={`p-1.5 transition-colors ${c.pago ? 'text-emerald-500' : 'text-amber-400 hover:text-emerald-500'}`} title={c.pago ? 'Pago' : 'Marcar como pago'}>
                  {c.pago ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                </button>
                <p className={`text-sm font-bold ${c.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.tipo === 'entrada' ? '+' : '-'} {fmt(c.valor)}
                </p>
                <button onClick={() => remover(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Entrada/Saída */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nova {modal === 'entrada' ? 'Entrada' : 'Saída'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value="">Selecione</option>
                    {(modal === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Forma de pagamento</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as any })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    {FORMAS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição *</label>
                <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Polimento completo" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              </div>
              {bancos.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Vincular à conta bancária</label>
                  <select value={form.conta_bancaria} onChange={(e) => setForm({ ...form, conta_bancaria: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value="">Nenhuma</option>
                    {bancos.map(b => <option key={b.id} value={b.id}>{b.nome} ({b.banco || b.tipo})</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pago" checked={form.pago} onChange={(e) => setForm({ ...form, pago: e.target.checked })} className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                <label htmlFor="pago" className="text-xs font-medium text-gray-500">Já foi pago/recebido</label>
              </div>
              <button onClick={adicionar} className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-colors ${modal === 'entrada' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                Salvar {modal === 'entrada' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta Bancária */}
      {modalBanco && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalBanco(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nova Conta Bancária</h2>
              <button onClick={() => setModalBanco(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome da conta *</label>
                <input type="text" value={formBanco.nome} onChange={(e) => setFormBanco({ ...formBanco, nome: e.target.value })} placeholder="Ex: Conta principal" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Banco</label>
                  <input type="text" value={formBanco.banco} onChange={(e) => setFormBanco({ ...formBanco, banco: e.target.value })} placeholder="Ex: Nubank" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                  <select value={formBanco.tipo} onChange={(e) => setFormBanco({ ...formBanco, tipo: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="carteira">Carteira</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Saldo inicial (R$)</label>
                <input type="number" step="0.01" value={formBanco.saldo} onChange={(e) => setFormBanco({ ...formBanco, saldo: e.target.value })} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <button onClick={adicionarBanco} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-sm font-bold transition-colors">
                Cadastrar Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
