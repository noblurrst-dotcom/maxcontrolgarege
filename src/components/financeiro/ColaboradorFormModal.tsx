import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Colaborador, TipoColaborador } from '../../types'

interface Props {
  colaborador?: Colaborador | null
  onSave: (data: Omit<Colaborador, 'id' | 'user_id' | 'created_at'>) => void
  onClose: () => void
}

const TIPOS: { value: TipoColaborador; label: string; desc: string }[] = [
  { value: 'clt', label: 'CLT', desc: 'Carteira assinada' },
  { value: 'freelancer_pj', label: 'PJ', desc: 'Pessoa Jurídica' },
  { value: 'freelancer_autonomo', label: 'Autônomo', desc: 'Pessoa Física sem vínculo' },
]

const initForm = (c?: Colaborador | null) => ({
  nome: c?.nome || '',
  cargo: c?.cargo || '',
  telefone: c?.telefone || '',
  email: c?.email || '',
  cpf_cnpj: c?.cpf_cnpj || '',
  tipo: (c?.tipo || 'clt') as TipoColaborador,
  data_admissao: c?.data_admissao || '',
  ativo: c?.ativo ?? true,
  salario: c?.salario?.toString() || '',
  vale_transporte: c?.vale_transporte?.toString() || '',
  vale_alimentacao: c?.vale_alimentacao?.toString() || '',
  plano_saude: c?.plano_saude?.toString() || '',
  outros_beneficios: c?.outros_beneficios?.toString() || '',
  valor_servico_padrao: c?.valor_servico_padrao?.toString() || '',
  iss_retido_percentual: c?.iss_retido_percentual?.toString() || '',
  comissao_percentual: c?.comissao_percentual?.toString() || '',
  observacoes: c?.observacoes || '',
})

export default function ColaboradorFormModal({ colaborador, onSave, onClose }: Props) {
  const [form, setForm] = useState(initForm(colaborador))
  const isEdit = !!colaborador

  useEffect(() => {
    setForm(initForm(colaborador))
  }, [colaborador])

  const set = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    if (!form.nome.trim()) return
    const num = (v: string) => parseFloat(v) || 0
    const pct = (v: string) => Math.min(100, Math.max(0, num(v)))
    onSave({
      nome: form.nome.trim(),
      cargo: form.cargo.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      cpf_cnpj: form.cpf_cnpj.trim(),
      tipo: form.tipo,
      data_admissao: form.data_admissao || null,
      ativo: form.ativo,
      salario: num(form.salario),
      vale_transporte: num(form.vale_transporte),
      vale_alimentacao: num(form.vale_alimentacao),
      plano_saude: num(form.plano_saude),
      outros_beneficios: num(form.outros_beneficios),
      valor_servico_padrao: num(form.valor_servico_padrao),
      iss_retido_percentual: pct(form.iss_retido_percentual),
      comissao_percentual: pct(form.comissao_percentual),
      observacoes: form.observacoes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            {isEdit ? 'Editar colaborador' : 'Novo colaborador'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Tipo (radio) */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Tipo de vínculo *</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('tipo', t.value)}
                    className={`p-2.5 rounded-xl border text-center transition-colors ${
                      form.tipo === t.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${form.tipo === t.value ? 'text-primary-600' : 'text-gray-700'}`}>{t.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Nome + Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo</label>
                <input type="text" value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex: Polidor" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                <input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="nome@email.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
            </div>

            {/* CPF/CNPJ + Admissão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{form.tipo === 'freelancer_pj' ? 'CNPJ' : 'CPF'}</label>
                <input type="text" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder={form.tipo === 'freelancer_pj' ? '00.000.000/0000-00' : '000.000.000-00'} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data de admissão</label>
                <input type="date" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              </div>
            </div>

            {/* Divider + seção por tipo */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-3">
                {form.tipo === 'clt' ? 'Remuneração CLT' : form.tipo === 'freelancer_pj' ? 'Remuneração PJ' : 'Remuneração Autônomo'}
              </p>

              {/* CLT */}
              {form.tipo === 'clt' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Salário bruto (R$)</label>
                    <input type="number" step="0.01" min="0" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Vale transporte (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.vale_transporte} onChange={e => set('vale_transporte', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Vale alimentação (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.vale_alimentacao} onChange={e => set('vale_alimentacao', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Plano de saúde (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.plano_saude} onChange={e => set('plano_saude', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Outros benefícios (R$)</label>
                      <input type="number" step="0.01" min="0" value={form.outros_beneficios} onChange={e => set('outros_beneficios', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* PJ mensalista */}
              {form.tipo === 'freelancer_pj' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor mensal (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                </div>
              )}

              {/* Autônomo */}
              {form.tipo === 'freelancer_autonomo' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Valor base mensal (R$)</label>
                    <input type="number" step="0.01" min="0" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ISS retido (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={form.iss_retido_percentual} onChange={e => set('iss_retido_percentual', e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Comissão (todos os tipos) */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Comissão sobre vendas (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.comissao_percentual} onChange={e => set('comissao_percentual', e.target.value)} placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>

            {/* Observações */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
            </div>

            {/* Status ativo */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="colab-ativo" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
              <label htmlFor="colab-ativo" className="text-xs font-medium text-gray-500">Colaborador ativo</label>
            </div>

            {/* Botão salvar */}
            <button
              onClick={handleSave}
              disabled={!form.nome.trim()}
              className="w-full py-3 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Salvar alterações' : 'Cadastrar colaborador'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
