import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, Building2, Briefcase, User } from 'lucide-react'
import type { Colaborador, TipoColaborador } from '../types'
import { useCloudSync } from '../hooks/useCloudSync'

interface Props {
  value: string
  colaboradorId?: string | null
  onChange: (colaboradorId: string | null, nomeColaborador: string) => void
  label?: string
  placeholder?: string
}

const TIPO_LABEL: Record<TipoColaborador, string> = {
  clt: 'CLT',
  freelancer_pj: 'PJ',
  freelancer_autonomo: 'Autônomo',
}

const TIPO_BADGE: Record<TipoColaborador, string> = {
  clt: 'bg-blue-100 text-blue-700',
  freelancer_pj: 'bg-green-100 text-green-700',
  freelancer_autonomo: 'bg-violet-100 text-violet-700',
}

const TIPO_ICON: Record<TipoColaborador, typeof Building2> = {
  clt: Building2,
  freelancer_pj: Briefcase,
  freelancer_autonomo: User,
}

export default function ColaboradorPicker({ value, colaboradorId, onChange, label = 'Colaborador', placeholder = 'Buscar colaborador...' }: Props) {
  const { data: colaboradores } = useCloudSync<Colaborador>({ table: 'funcionarios', storageKey: 'funcionarios' })
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
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

  const ativos = useMemo(() => colaboradores.filter(c => c.ativo), [colaboradores])

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase()
    if (!t) return ativos.slice(0, 10)
    return ativos.filter(c =>
      c.nome.toLowerCase().includes(t) ||
      (c.cargo || '').toLowerCase().includes(t)
    ).slice(0, 10)
  }, [ativos, busca])

  const selecionado = useMemo(() => {
    if (colaboradorId) return colaboradores.find(c => c.id === colaboradorId)
    if (value) return colaboradores.find(c => c.nome === value)
    return null
  }, [colaboradores, colaboradorId, value])

  const limpar = () => {
    onChange(null, '')
    setBusca('')
  }

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={selecionado ? selecionado.nome : value}
          onChange={(e) => {
            onChange(null, e.target.value)
            setBusca(e.target.value)
            if (!aberto) setAberto(true)
          }}
          onFocus={() => setAberto(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selecionado && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TIPO_BADGE[selecionado.tipo]}`}>
              {TIPO_LABEL[selecionado.tipo]}
            </span>
          )}
          {(selecionado || value) ? (
            <button type="button" onClick={limpar} className="p-0.5 text-gray-400 hover:text-gray-600">
              <span className="text-xs">✕</span>
            </button>
          ) : (
            <ChevronDown size={14} className="text-gray-400 pointer-events-none" />
          )}
        </div>
      </div>

      {aberto && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {ativos.length > 3 && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
          )}
          {filtrados.length > 0 ? (
            <div className="py-1">
              {filtrados.map(c => {
                const Icon = TIPO_ICON[c.tipo] || User
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id, c.nome)
                      setAberto(false)
                      setBusca('')
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                      selecionado?.id === c.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TIPO_BADGE[c.tipo]}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.nome}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {c.cargo || TIPO_LABEL[c.tipo]}
                        {c.comissao_percentual > 0 ? ` · ${c.comissao_percentual}%` : ''}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${TIPO_BADGE[c.tipo]}`}>
                      {TIPO_LABEL[c.tipo]}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400">
                {ativos.length === 0 ? 'Nenhum colaborador ativo cadastrado' : 'Nenhum resultado'}
              </p>
              {ativos.length === 0 && (
                <p className="text-[10px] text-gray-400 mt-1">Cadastre em Financeiro → Colaboradores</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
