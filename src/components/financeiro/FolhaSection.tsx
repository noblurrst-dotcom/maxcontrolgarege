import { useState, useMemo } from 'react'
import { DollarSign, ChevronLeft, ChevronRight, Plus, Trash2, Building2, Briefcase, User } from 'lucide-react'
import { useCloudSync } from '../../hooks/useCloudSync'
import { fmt, uid } from '../../lib/utils'
import type { Colaborador, PagamentoColaborador, TipoColaborador, TipoPagamentoColaborador, Venda } from '../../types'
import RegistrarPagamentoModal from './RegistrarPagamentoModal'

const TIPO_LABEL: Record<TipoColaborador, string> = { clt: 'CLT', freelancer_pj: 'PJ', freelancer_autonomo: 'Autônomo' }
const TIPO_BADGE: Record<TipoColaborador, string> = { clt: 'bg-blue-100 text-blue-700', freelancer_pj: 'bg-green-100 text-green-700', freelancer_autonomo: 'bg-violet-100 text-violet-700' }
const TIPO_ICON: Record<TipoColaborador, typeof Building2> = { clt: Building2, freelancer_pj: Briefcase, freelancer_autonomo: User }
const PAG_LABEL: Record<TipoPagamentoColaborador, string> = { salario: 'Salário', comissao: 'Comissão', bonus: 'Bônus', adiantamento: 'Adiantamento', outro: 'Outro' }

function getMesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMesLabel(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(m) - 1]} ${ano}`
}

function navMes(mes: string, dir: number) {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 1 + dir, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function FolhaSection() {
  const { data: colaboradores } = useCloudSync<Colaborador>({ table: 'funcionarios', storageKey: 'funcionarios' })
  const { data: pagamentos, save: salvarPagamentos } = useCloudSync<PagamentoColaborador>({ table: 'pagamentos_colaboradores', storageKey: 'pagamentos_colaboradores' })
  const { data: vendas } = useCloudSync<Venda>({ table: 'vendas', storageKey: 'vendas' })

  const [mes, setMes] = useState(getMesAtual)
  const [modalPag, setModalPag] = useState<Colaborador | null>(null)

  const ativos = useMemo(() => colaboradores.filter(c => c.ativo), [colaboradores])

  const pagamentosMes = useMemo(() =>
    pagamentos.filter(p => p.mes_referencia === mes),
    [pagamentos, mes]
  )

  const comissoesMes = useMemo(() => {
    const [ano, m] = mes.split('-')
    const vendasMes = vendas.filter(v => {
      if (!v.colaborador_id) return false
      const dv = v.data_venda || v.created_at
      return dv && dv.startsWith(`${ano}-${m}`)
    })
    const mapa: Record<string, number> = {}
    for (const v of vendasMes) {
      const col = colaboradores.find(c => c.id === v.colaborador_id)
      if (!col || !col.comissao_percentual) continue
      const base = v.valor_total || v.valor || 0
      const comissao = base * (col.comissao_percentual / 100)
      mapa[col.id] = (mapa[col.id] || 0) + comissao
    }
    return mapa
  }, [vendas, colaboradores, mes])

  const resumoPorColaborador = useMemo(() => {
    return ativos.map(col => {
      const pagCol = pagamentosMes.filter(p => p.colaborador_id === col.id)
      const totalPago = pagCol.reduce((a, p) => a + p.valor, 0)
      const comissaoCalculada = comissoesMes[col.id] || 0
      const devido = (col.salario || 0) + comissaoCalculada
      return { col, pagCol, totalPago, comissaoCalculada, devido, saldo: devido - totalPago }
    })
  }, [ativos, pagamentosMes, comissoesMes])

  const totais = useMemo(() => {
    const devido = resumoPorColaborador.reduce((a, r) => a + r.devido, 0)
    const pago = resumoPorColaborador.reduce((a, r) => a + r.totalPago, 0)
    return { devido, pago, pendente: devido - pago }
  }, [resumoPorColaborador])

  const registrarPagamento = (col: Colaborador, data: { tipo: TipoPagamentoColaborador; valor: number; data_pagamento: string; observacoes: string }) => {
    const novo: PagamentoColaborador = {
      id: uid(),
      user_id: '',
      colaborador_id: col.id,
      tipo: data.tipo,
      valor: data.valor,
      mes_referencia: mes,
      data_pagamento: data.data_pagamento,
      observacoes: data.observacoes,
      created_at: new Date().toISOString(),
    }
    salvarPagamentos([novo, ...pagamentos])
    setModalPag(null)
  }

  const excluirPagamento = (id: string) => {
    salvarPagamentos(pagamentos.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* Navegação de mês + totais */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMes(m => navMes(m, -1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="text-sm font-bold text-gray-900">{formatMesLabel(mes)}</h3>
          <button onClick={() => setMes(m => navMes(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-400">Devido</p>
            <p className="text-sm font-bold text-gray-900">{fmt(totais.devido)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-400">Pago</p>
            <p className="text-sm font-bold text-success-600">{fmt(totais.pago)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium text-gray-400">Pendente</p>
            <p className={`text-sm font-bold ${totais.pendente > 0 ? 'text-warning-600' : 'text-success-600'}`}>{fmt(totais.pendente)}</p>
          </div>
        </div>
      </div>

      {/* Cards por colaborador */}
      {resumoPorColaborador.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <DollarSign size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg">Nenhum colaborador ativo</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre colaboradores na aba "Lista"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumoPorColaborador.map(({ col, pagCol, totalPago, comissaoCalculada, devido, saldo }) => {
            const Icon = TIPO_ICON[col.tipo] || User
            return (
              <div key={col.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header do card */}
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TIPO_BADGE[col.tipo]}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{col.nome}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TIPO_BADGE[col.tipo]}`}>{TIPO_LABEL[col.tipo]}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Base: {fmt(col.salario || 0)}
                      {comissaoCalculada > 0 ? ` · Comissão: ${fmt(comissaoCalculada)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${saldo > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                      {saldo > 0 ? `Pendente: ${fmt(saldo)}` : 'Pago'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {fmt(totalPago)} / {fmt(devido)}
                    </p>
                  </div>
                </div>

                {/* Pagamentos registrados */}
                {pagCol.length > 0 && (
                  <div className="border-t border-gray-50 px-3 sm:px-4 py-2 space-y-1">
                    {pagCol.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{PAG_LABEL[p.tipo]}</span>
                          <span className="text-xs font-semibold text-gray-700">{fmt(p.valor)}</span>
                          <span className="text-[10px] text-gray-400">{new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          {p.observacoes && <span className="text-[10px] text-gray-400 truncate">· {p.observacoes}</span>}
                        </div>
                        <button onClick={() => excluirPagamento(p.id)} className="p-1 text-gray-300 hover:text-danger-500 transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão registrar */}
                <div className="border-t border-gray-50 px-3 sm:px-4 py-2">
                  <button
                    onClick={() => setModalPag(col)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Plus size={14} /> Registrar pagamento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalPag && (
        <RegistrarPagamentoModal
          colaborador={modalPag}
          mesReferencia={mes}
          onSave={(data) => registrarPagamento(modalPag, data)}
          onClose={() => setModalPag(null)}
        />
      )}
    </div>
  )
}
