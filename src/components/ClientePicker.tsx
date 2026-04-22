import { useState, useMemo, useRef, useEffect } from 'react'
import { UserPlus, Search, ChevronDown, X } from 'lucide-react'
import type { Cliente, Veiculo } from '../types'
import { uid } from '../lib/utils'
import { useCloudSync } from '../hooks/useCloudSync'

interface Props {
  value: string
  telefone?: string
  onChange: (nome: string, telefone?: string, veiculo?: string, placa?: string) => void
}

export default function ClientePicker({ value, onChange }: Props) {
  const { data: clientes, save: salvarClientes } = useCloudSync<Cliente>({ table: 'clientes', storageKey: 'clientes' })
  const { data: veiculos } = useCloudSync<Veiculo>({ table: 'veiculos', storageKey: 'veiculos' })
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [novoCliente, setNovoCliente] = useState(false)
  const [novoForm, setNovoForm] = useState({ nome: '', telefone: '', veiculo: '', placa: '' })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase()
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(t) ||
      c.telefone.includes(t) ||
      (c.placa || '').toLowerCase().includes(t)
    ).slice(0, 8)
  }, [clientes, busca])

  const salvarNovoCliente = () => {
    if (!novoForm.nome.trim()) return
    const novo: Cliente = {
      id: uid(),
      user_id: '',
      nome: novoForm.nome.trim(),
      telefone: novoForm.telefone,
      email: '',
      cpf_cnpj: '',
      veiculo: novoForm.veiculo,
      placa: novoForm.placa,
      endereco: '',
      aniversario: '',
      observacoes: '',
      total_gasto: 0,
      created_at: new Date().toISOString(),
    }
    const atualizada = [novo, ...clientes]
    salvarClientes(atualizada)
    onChange(novo.nome, novo.telefone)
    setNovoForm({ nome: '', telefone: '', veiculo: '', placa: '' })
    setNovoCliente(false)
    setAberto(false)
  }

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente *</label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setBusca(e.target.value) }}
            onFocus={() => setAberto(true)}
            placeholder="Buscar ou digitar nome do cliente"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-8"
          />
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          type="button"
          onClick={() => { setNovoCliente(true); setAberto(true) }}
          className="px-2.5 py-2.5 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl transition-colors shrink-0"
          title="Cadastrar novo cliente"
        >
          <UserPlus size={16} />
        </button>
      </div>

      {aberto && !novoCliente && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {clientes.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}
          {filtrados.length > 0 ? (
            <div className="py-1">
              {filtrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const veiculosCliente = veiculos.filter(v => v.cliente_id === c.id)
                    const v1 = veiculosCliente[0]
                    onChange(c.nome, c.telefone, v1 ? `${v1.marca} ${v1.modelo}`.trim() : c.veiculo || undefined, v1 ? v1.placa : c.placa || undefined)
                    setAberto(false)
                    setBusca('')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary-600">{c.nome.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {[c.telefone, c.veiculo, c.placa].filter(Boolean).join(' · ') || 'Sem detalhes'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400">Nenhum cliente encontrado</p>
              <button
                type="button"
                onClick={() => { setNovoCliente(true); setNovoForm(prev => ({ ...prev, nome: busca })) }}
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 mt-1"
              >
                + Cadastrar novo cliente
              </button>
            </div>
          )}
        </div>
      )}

      {aberto && novoCliente && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-900">Cadastro rápido de cliente</p>
            <button type="button" onClick={() => { setNovoCliente(false) }} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="space-y-2.5">
            <input
              type="text"
              value={novoForm.nome}
              onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })}
              placeholder="Nome do cliente *"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              autoFocus
            />
            <input
              type="tel"
              value={novoForm.telefone}
              onChange={(e) => setNovoForm({ ...novoForm, telefone: e.target.value })}
              placeholder="Telefone"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={novoForm.veiculo}
                onChange={(e) => setNovoForm({ ...novoForm, veiculo: e.target.value })}
                placeholder="Veículo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <input
                type="text"
                value={novoForm.placa}
                onChange={(e) => setNovoForm({ ...novoForm, placa: e.target.value.toUpperCase() })}
                placeholder="Placa"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="button"
              onClick={salvarNovoCliente}
              disabled={!novoForm.nome.trim()}
              className="w-full py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-dark-900 rounded-lg text-xs font-bold transition-colors"
            >
              Cadastrar e selecionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
