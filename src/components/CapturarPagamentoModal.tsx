import { useState, useEffect } from 'react'
import { X, CreditCard, Smartphone, Banknote, ArrowRightLeft, Receipt, Loader2, Trash2 } from 'lucide-react'
import type { Agendamento, Venda, FormaPagamento, Pagamento } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fmt } from '../lib/utils'
import toast from 'react-hot-toast'

const FORMAS: { value: FormaPagamento; label: string; icon: React.ReactNode }[] = [
  { value: 'pix', label: 'Pix', icon: <Smartphone size={18} /> },
  { value: 'credito', label: 'Crédito', icon: <CreditCard size={18} /> },
  { value: 'debito', label: 'Débito', icon: <CreditCard size={18} /> },
  { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote size={18} /> },
  { value: 'boleto', label: 'Boleto', icon: <Receipt size={18} /> },
  { value: 'transferencia', label: 'Transferência', icon: <ArrowRightLeft size={18} /> },
]

const PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

interface Props {
  open: boolean
  onClose: () => void
  agendamento?: Agendamento
  venda?: Venda
  onSuccess: (vendaId: string, pagamentoId: string) => void
}

export default function CapturarPagamentoModal({ open, onClose, agendamento, venda, onSuccess }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loadingPagamentos, setLoadingPagamentos] = useState(false)

  // Form state
  const valorTotal = venda
    ? venda.valor_total
    : agendamento
      ? Math.max((agendamento.valor || 0) - (agendamento.desconto || 0), 0)
      : 0
  const valorJaPago = venda?.valor_pago || 0
  const valorRestante = Math.max(valorTotal - valorJaPago, 0)

  const [valor, setValor] = useState('')
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [parcelas, setParcelas] = useState('1')
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [funcionario, setFuncionario] = useState('')
  const [obs, setObs] = useState('')
  const [lancarFinanceiro, setLancarFinanceiro] = useState(true)

  // Reset on open
  useEffect(() => {
    if (open) {
      setValor(valorRestante > 0 ? String(valorRestante) : '')
      setForma('pix')
      setParcelas('1')
      setDataPagamento(new Date().toISOString().split('T')[0])
      setFuncionario('')
      setObs('')
      setLancarFinanceiro(true)

      // Carregar pagamentos existentes se houver venda
      if (venda?.id) {
        carregarPagamentos(venda.id)
      } else {
        setPagamentos([])
      }
    }
  }, [open, venda?.id, valorRestante])

  const carregarPagamentos = async (vendaId: string) => {
    setLoadingPagamentos(true)
    try {
      const { data, error } = await supabase.rpc('listar_pagamentos', { p_venda_id: vendaId })
      if (!error && data) setPagamentos(data as Pagamento[])
    } catch { /* ignore */ }
    setLoadingPagamentos(false)
  }

  const handleSubmit = async () => {
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (valorNum > valorRestante && valorRestante > 0) {
      toast.error(`Valor máximo: ${fmt(valorRestante)}`)
      return
    }
    if (!user) return

    setLoading(true)
    try {
      const payload: Record<string, any> = {
        valor: valorNum,
        forma_pagamento: forma,
        parcelas: parseInt(parcelas),
        data_pagamento: new Date(`${dataPagamento}T12:00:00`).toISOString(),
        observacoes: obs,
        lancar_financeiro: lancarFinanceiro,
        funcionario,
      }

      if (venda) {
        payload.venda_id = venda.id
      } else if (agendamento) {
        payload.agendamento_id = agendamento.id
        payload.cliente_id = agendamento.cliente_id || null
        payload.nome_cliente = agendamento.nome_cliente
        payload.descricao = [agendamento.titulo, agendamento.servico].filter(Boolean).join(' - ')
        payload.valor_venda = (agendamento.valor || 0)
        payload.desconto = (agendamento.desconto || 0)
        payload.valor_total = valorTotal
        payload.obs_venda = agendamento.observacoes || ''

        if (agendamento.venda_id) {
          payload.venda_id = agendamento.venda_id
        }
      }

      const { data: result, error } = await supabase.rpc('capturar_pagamento', { p_payload: payload })

      if (error) {
        console.error('Erro RPC:', error)
        toast.error(error.message || 'Erro ao capturar pagamento')
        setLoading(false)
        return
      }

      toast.success('Pagamento capturado!')
      onSuccess(result.venda_id, result.pagamento_id)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado')
    }
    setLoading(false)
  }

  const excluirPagamento = async (pag: Pagamento) => {
    if (!confirm(`Excluir pagamento de ${fmt(pag.valor)}?`)) return
    try {
      const { data: result, error } = await supabase.rpc('excluir_pagamento', { p_pagamento_id: pag.id })
      if (error) {
        toast.error(error.message || 'Erro ao excluir')
        return
      }
      toast.success('Pagamento excluído')
      if (venda?.id) carregarPagamentos(venda.id)
      onSuccess(result.venda_id, '')
    } catch { toast.error('Erro inesperado') }
  }

  if (!open) return null

  const nomeCliente = venda?.nome_cliente || agendamento?.nome_cliente || ''
  const descricao = venda?.descricao || [agendamento?.titulo, agendamento?.servico].filter(Boolean).join(' - ') || ''
  const formaLabel = (f: FormaPagamento) => FORMAS.find(x => x.value === f)?.label || f

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Capturar pagamento</h2>
            <p className="text-[11px] text-gray-400 truncate max-w-[280px]">{nomeCliente}{descricao ? ` — ${descricao}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Resumo financeiro */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Valor total</span>
              <span className="font-bold text-gray-900">{fmt(valorTotal)}</span>
            </div>
            {valorJaPago > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Já pago</span>
                <span className="font-bold text-emerald-600">{fmt(valorJaPago)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
              <span className="text-gray-500 font-bold">Restante</span>
              <span className={`font-bold ${valorRestante > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(valorRestante)}</span>
            </div>
          </div>

          {/* Pagamentos já feitos */}
          {pagamentos.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pagamentos registrados</p>
              <div className="space-y-1.5">
                {pagamentos.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs font-bold text-emerald-700">{fmt(p.valor)}</span>
                      <span className="text-[10px] text-emerald-600 ml-2">{formaLabel(p.forma_pagamento)}{p.parcelas > 1 ? ` ${p.parcelas}x` : ''}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <button onClick={() => excluirPagamento(p)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loadingPagamentos && <p className="text-xs text-gray-400 text-center">Carregando pagamentos...</p>}

          {/* Form — só mostra se ainda tem valor restante */}
          {valorRestante > 0 && (
            <>
              {/* Valor */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Valor a receber <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={valorRestante}
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder={String(valorRestante)}
                  />
                </div>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Forma de pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setForma(f.value)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${
                        forma === f.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {f.icon}
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parcelas (só crédito) */}
              {forma === 'credito' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Parcelas</label>
                  <select
                    value={parcelas}
                    onChange={e => setParcelas(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {PARCELAS.map(p => (
                      <option key={p} value={p}>{p}x{p > 1 ? ` de ${fmt(parseFloat(valor || '0') / p)}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data do pagamento */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data do pagamento</label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={e => setDataPagamento(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  placeholder="Opcional..."
                />
              </div>

              {/* Checkbox financeiro */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lancarFinanceiro}
                  onChange={e => setLancarFinanceiro(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-600">Lançar automaticamente no financeiro</span>
              </label>
            </>
          )}

          {valorRestante === 0 && pagamentos.length > 0 && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CreditCard size={20} className="text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-700">Totalmente pago</p>
              <p className="text-xs text-gray-400 mt-1">Todos os pagamentos foram registrados</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors">
            Fechar
          </button>
          {valorRestante > 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading || !valor || parseFloat(valor) <= 0}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              Confirmar pagamento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
