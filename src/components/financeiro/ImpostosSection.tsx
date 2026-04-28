import { useState, useMemo } from 'react'
import { Receipt, Save, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useCloudSyncSingle } from '../../hooks/useCloudSync'
import { useCloudSync } from '../../hooks/useCloudSync'
import { fmt } from '../../lib/utils'
import { calcularImpostos, REGIME_LABEL } from '../../lib/impostos'
import { CONFIG_IMPOSTOS_DEFAULT } from '../../types/impostos'
import type { ConfiguracaoImpostos, RegimeTributario, ContaFinanceira } from '../../types'

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

const REGIMES: { value: RegimeTributario; label: string; desc: string }[] = [
  { value: 'simples_nacional', label: 'Simples Nacional', desc: 'DAS unificado' },
  { value: 'lucro_presumido', label: 'Lucro Presumido', desc: 'PIS + COFINS + IRPJ + CSLL + ISS' },
  { value: 'lucro_real', label: 'Lucro Real', desc: 'Apuração sobre lucro efetivo' },
]

export default function ImpostosSection() {
  const { data: config, save: salvarConfig, loading } = useCloudSyncSingle<ConfiguracaoImpostos>({
    table: 'configuracao_impostos',
    storageKey: 'configuracao_impostos',
    defaultValue: CONFIG_IMPOSTOS_DEFAULT,
  })
  const { data: contas } = useCloudSync<ContaFinanceira>({ table: 'financeiro', storageKey: 'financeiro' })

  const [mes, setMes] = useState(getMesAtual)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(config)

  const faturamentoMes = useMemo(() => {
    return contas
      .filter(c => c.tipo === 'entrada' && c.data && c.data.startsWith(mes))
      .reduce((a, c) => a + c.valor, 0)
  }, [contas, mes])

  const estimativa = useMemo(() =>
    calcularImpostos(faturamentoMes, config),
    [faturamentoMes, config]
  )

  const iniciarEdicao = () => { setForm({ ...config }); setEditando(true) }
  const cancelar = () => setEditando(false)
  const salvar = () => { salvarConfig(form); setEditando(false) }
  const setField = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Configuração de regime */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt size={16} className="text-primary-500" />
              Regime tributário
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Atual: {REGIME_LABEL[config.regime]}</p>
          </div>
          {!editando ? (
            <button onClick={iniciarEdicao} className="text-xs font-bold text-primary-600 hover:text-primary-700">Editar</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelar} className="text-xs font-medium text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={salvar} className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"><Save size={12} /> Salvar</button>
            </div>
          )}
        </div>

        {editando ? (
          <div className="space-y-4">
            {/* Regime radio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {REGIMES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setField('regime', r.value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    form.regime === r.value
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${form.regime === r.value ? 'text-primary-600' : 'text-gray-700'}`}>{r.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>

            {/* Alíquotas */}
            {form.regime === 'simples_nacional' ? (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Alíquota DAS (%)</label>
                <input type="number" step="0.01" min="0" max="33" value={form.aliquota_simples} onChange={e => setField('aliquota_simples', parseFloat(e.target.value) || 0)} className="w-full max-w-[200px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                <p className="text-[10px] text-gray-400 mt-1">Faixa 1 Anexo III: 6%. Consulte seu contador para valor exato.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'aliquota_pis', label: 'PIS (%)' },
                  { key: 'aliquota_cofins', label: 'COFINS (%)' },
                  { key: 'aliquota_irpj', label: 'IRPJ (%)' },
                  { key: 'aliquota_csll', label: 'CSLL (%)' },
                  { key: 'aliquota_iss', label: 'ISS (%)' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{f.label}</label>
                    <input type="number" step="0.01" min="0" max="100" value={(form as any)[f.key]} onChange={e => setField(f.key, parseFloat(e.target.value) || 0)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
              <textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)} rows={2} placeholder="Notas sobre a configuração..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {config.regime === 'simples_nacional' ? (
              <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-lg">DAS: {config.aliquota_simples}%</span>
            ) : (
              <>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">PIS: {config.aliquota_pis}%</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">COFINS: {config.aliquota_cofins}%</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">IRPJ: {config.aliquota_irpj}%</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">CSLL: {config.aliquota_csll}%</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">ISS: {config.aliquota_iss}%</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Estimativa do mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMes(m => navMes(m, -1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="text-sm font-bold text-gray-900">Estimativa — {formatMesLabel(mes)}</h3>
          <button onClick={() => setMes(m => navMes(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">Faturamento bruto do mês (entradas financeiras)</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{fmt(faturamentoMes)}</p>
        </div>

        {estimativa.itens.length > 0 ? (
          <div className="space-y-2">
            {estimativa.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.descricao} ({item.percentual}%)</p>
                </div>
                <p className="text-sm font-semibold text-danger-600 shrink-0 ml-3">- {fmt(item.valor)}</p>
              </div>
            ))}
            <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Total impostos estimados</p>
              <p className="text-lg font-bold text-danger-600">{fmt(estimativa.total)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">Sem faturamento neste mês</p>
        )}

        <div className="flex items-start gap-1.5 mt-4 p-2.5 bg-warning-50 rounded-lg">
          <Info size={14} className="text-warning-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-warning-700">Estimativa apenas. Valores reais dependem de deduções, créditos e apuração contábil. Consulte seu contador.</p>
        </div>
      </div>
    </div>
  )
}
