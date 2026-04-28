import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Users, Receipt, DollarSign } from 'lucide-react'
import { useCloudSync } from '../../hooks/useCloudSync'
import { useCloudSyncSingle } from '../../hooks/useCloudSync'
import { fmt } from '../../lib/utils'
import { calcularImpostos } from '../../lib/impostos'
import { calcularCustoMensal } from '../../lib/colaboradores'
import { CONFIG_IMPOSTOS_DEFAULT } from '../../types/impostos'
import type { ContaFinanceira, Colaborador, PagamentoColaborador, ConfiguracaoImpostos } from '../../types'

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
function getUltimos6Meses(mesAtual: string) {
  const meses: string[] = []
  for (let i = 5; i >= 0; i--) meses.push(navMes(mesAtual, -i))
  return meses
}

interface DREMes {
  mes: string
  receita: number
  impostos: number
  pessoal: number
  despesas: number
  lucro: number
  margem: number
  pessoalEstimado: boolean
}

function calcularDRE(
  mes: string,
  contas: ContaFinanceira[],
  pagColaboradores: PagamentoColaborador[],
  colaboradores: Colaborador[],
  configImpostos: ConfiguracaoImpostos
): DREMes {
  const prefix = mes

  // Receita: entradas financeiras do mes
  const receita = contas
    .filter(c => c.tipo === 'entrada' && c.data && c.data.startsWith(prefix))
    .reduce((a, c) => a + c.valor, 0)

  // Impostos estimados
  const est = calcularImpostos(receita, configImpostos)
  const impostos = est.total

  // Custo de pessoal: real (pagamentos) se houver, senao estimado
  const pagMes = pagColaboradores.filter(p => p.mes_referencia === mes)
  const pessoalReal = pagMes.reduce((a, p) => a + p.valor, 0)
  const ativos = colaboradores.filter(c => c.ativo)
  const pessoalEstimado = ativos.reduce((a, c) => a + calcularCustoMensal(c, configImpostos.regime).total, 0)
  const pessoalEstimadoFlag = pessoalReal === 0 && ativos.length > 0
  const pessoal = pessoalReal > 0 ? pessoalReal : pessoalEstimado

  // Outras despesas (saidas financeiras, excluindo o que ja e pessoal)
  const despesas = contas
    .filter(c => c.tipo === 'saida' && c.data && c.data.startsWith(prefix))
    .reduce((a, c) => a + c.valor, 0)

  const lucro = receita - impostos - pessoal - despesas
  const margem = receita > 0 ? (lucro / receita) * 100 : 0

  return { mes, receita, impostos, pessoal, despesas, lucro, margem, pessoalEstimado: pessoalEstimadoFlag }
}

export default function Visao360Section() {
  const { data: contas } = useCloudSync<ContaFinanceira>({ table: 'financeiro', storageKey: 'financeiro' })
  const { data: colaboradores } = useCloudSync<Colaborador>({ table: 'funcionarios', storageKey: 'funcionarios' })
  const { data: pagColaboradores } = useCloudSync<PagamentoColaborador>({ table: 'pagamentos_colaboradores', storageKey: 'pagamentos_colaboradores' })
  const { data: configImpostos } = useCloudSyncSingle<ConfiguracaoImpostos>({
    table: 'configuracao_impostos',
    storageKey: 'configuracao_impostos',
    defaultValue: CONFIG_IMPOSTOS_DEFAULT,
  })

  const [mes, setMes] = useState(getMesAtual)

  const dreAtual = useMemo(() =>
    calcularDRE(mes, contas, pagColaboradores, colaboradores, configImpostos),
    [mes, contas, pagColaboradores, colaboradores, configImpostos]
  )

  const ultimos6 = useMemo(() => {
    const meses = getUltimos6Meses(mes)
    return meses.map(m => calcularDRE(m, contas, pagColaboradores, colaboradores, configImpostos))
  }, [mes, contas, pagColaboradores, colaboradores, configImpostos])

  const maxReceita = useMemo(() => Math.max(...ultimos6.map(d => d.receita), 1), [ultimos6])

  return (
    <div className="space-y-5">
      {/* DRE do mes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setMes(m => navMes(m, -1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="text-sm font-bold text-gray-900">Resultado — {formatMesLabel(mes)}</h3>
          <button onClick={() => setMes(m => navMes(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Receita */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-success-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Receita bruta</p>
            </div>
            <p className="text-sm font-bold text-success-600">{fmt(dreAtual.receita)}</p>
          </div>

          {/* Impostos */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt size={16} className="text-orange-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">(-) Impostos estimados</p>
            </div>
            <p className="text-sm font-bold text-orange-600">- {fmt(dreAtual.impostos)}</p>
          </div>

          {/* Pessoal */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">(-) Custo de pessoal</p>
                {dreAtual.pessoalEstimado && (
                  <p className="text-[9px] text-warning-600 font-medium">estimado (sem pagamentos registrados)</p>
                )}
              </div>
            </div>
            <p className="text-sm font-bold text-blue-600">- {fmt(dreAtual.pessoal)}</p>
          </div>

          {/* Despesas */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                <TrendingDown size={16} className="text-danger-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">(-) Outras despesas</p>
            </div>
            <p className="text-sm font-bold text-danger-600">- {fmt(dreAtual.despesas)}</p>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-200 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dreAtual.lucro >= 0 ? 'bg-success-100' : 'bg-danger-100'}`}>
                  <DollarSign size={16} className={dreAtual.lucro >= 0 ? 'text-success-600' : 'text-danger-600'} />
                </div>
                <p className="text-sm font-bold text-gray-900">Lucro líquido</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${dreAtual.lucro >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {fmt(dreAtual.lucro)}
                </p>
                <p className="text-[10px] text-gray-400">
                  margem: {dreAtual.margem.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grafico 6 meses (CSS puro) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Últimos 6 meses</h3>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success-400" />
            <span className="text-[10px] text-gray-500">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-400" />
            <span className="text-[10px] text-gray-500">Impostos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-400" />
            <span className="text-[10px] text-gray-500">Pessoal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-danger-400" />
            <span className="text-[10px] text-gray-500">Despesas</span>
          </div>
        </div>

        {/* Barras */}
        <div className="flex items-end gap-2 h-40">
          {ultimos6.map(d => {
            const receitaPct = maxReceita > 0 ? (d.receita / maxReceita) * 100 : 0
            const impostosPct = d.receita > 0 ? (d.impostos / d.receita) * receitaPct : 0
            const pessoalPct = d.receita > 0 ? (d.pessoal / d.receita) * receitaPct : 0
            const despesasPct = d.receita > 0 ? (d.despesas / d.receita) * receitaPct : 0
            const [, m] = d.mes.split('-')
            const nomes = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

            return (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-32 relative group">
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-[9px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                      <p className="font-bold">{formatMesLabel(d.mes)}</p>
                      <p>Receita: {fmt(d.receita)}</p>
                      <p>Lucro: {fmt(d.lucro)}</p>
                    </div>
                  </div>

                  {/* Barra receita (fundo) */}
                  <div
                    className="w-full bg-success-200 rounded-t-md relative overflow-hidden transition-all"
                    style={{ height: `${Math.max(receitaPct, d.receita > 0 ? 4 : 0)}%` }}
                  >
                    {/* Camadas empilhadas (custos) de baixo pra cima */}
                    <div className="absolute bottom-0 left-0 right-0 bg-danger-400 transition-all" style={{ height: `${despesasPct > 0 ? (despesasPct / receitaPct) * 100 : 0}%` }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-400 transition-all" style={{ height: `${(despesasPct + pessoalPct) > 0 ? ((despesasPct + pessoalPct) / receitaPct) * 100 : 0}%` }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-orange-400 transition-all" style={{ height: `${(despesasPct + pessoalPct + impostosPct) > 0 ? ((despesasPct + pessoalPct + impostosPct) / receitaPct) * 100 : 0}%` }} />
                    {/* Receita "livre" (lucro) fica com a cor de fundo verde */}
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${d.mes === mes ? 'text-primary-600 font-bold' : 'text-gray-400'}`}>
                  {nomes[parseInt(m) - 1]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
