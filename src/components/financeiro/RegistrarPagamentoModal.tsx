import { useState } from 'react'
import { X } from 'lucide-react'
import type { Colaborador, TipoPagamentoColaborador } from '../../types'
import { fmt } from '../../lib/utils'

interface Props {
  colaborador: Colaborador
  mesReferencia: string
  onSave: (data: { tipo: TipoPagamentoColaborador; valor: number; data_pagamento: string; observacoes: string }) => void
  onClose: () => void
}

const TIPOS: { value: TipoPagamentoColaborador; label: string }[] = [
  { value: 'salario', label: 'Salário' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'outro', label: 'Outro' },
]

export default function RegistrarPagamentoModal({ colaborador, mesReferencia, onSave, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoPagamentoColaborador>('salario')
  const [valor, setValor] = useState(tipo === 'salario' ? String(colaborador.salario || '') : '')
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [obs, setObs] = useState('')

  const handleTipoChange = (t: TipoPagamentoColaborador) => {
    setTipo(t)
    if (t === 'salario') setValor(String(colaborador.salario || ''))
    else setValor('')
  }

  const handleSave = () => {
    const v = parseFloat(valor)
    if (!v || v <= 0) return
    onSave({ tipo, valor: v, data_pagamento: dataPagamento, observacoes: obs.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Registrar pagamento</h3>
            <p className="text-xs text-gray-400 mt-0.5">{colaborador.nome} · {mesReferencia}</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Tipo</label>
            <div className="flex gap-1.5 flex-wrap">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTipoChange(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    tipo === t.value
                      ? 'bg-primary-500 text-on-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {tipo === 'salario' && colaborador.salario > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">Base cadastrada: {fmt(colaborador.salario)}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data do pagamento</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={e => setDataPagamento(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Obs */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Opcional..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!valor || parseFloat(valor) <= 0}
            className="w-full py-3 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar pagamento
          </button>
        </div>
      </div>
    </div>
  )
}
