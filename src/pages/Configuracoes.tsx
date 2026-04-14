import { useState, useRef } from 'react'
import { Settings, Upload, X, RotateCcw, Palette, FileText, Building2, Eye, UserCircle } from 'lucide-react'
import { useBrand } from '../contexts/BrandContext'
import toast from 'react-hot-toast'

const CORES_SUGERIDAS = [
  '#CFFF04', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6',
]

export default function Configuracoes() {
  const { brand, updateBrand, resetBrand } = useBrand()
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewPdf, setPreviewPdf] = useState(false)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      updateBrand({ logo_url: ev.target?.result as string })
      toast.success('Logo atualizada!')
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    updateBrand({ logo_url: '' })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleReset = () => {
    if (confirm('Restaurar todas as configurações padrão?')) {
      resetBrand()
      toast.success('Configurações restauradas')
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-400 mt-0.5">Personalize a identidade visual do seu negócio</p>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full text-xs font-bold transition-colors">
          <RotateCcw size={14} /> Restaurar padrão
        </button>
      </div>

      {/* Meu Perfil */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><UserCircle size={16} className="text-blue-600" /></div>
          <h2 className="text-sm font-bold text-gray-900">Meu Perfil</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Seu nome</label>
            <input type="text" value={brand.nome_usuario} onChange={(e) => updateBrand({ nome_usuario: e.target.value })} placeholder="Como deseja ser chamado" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            <p className="text-[10px] text-gray-400 mt-1">Este nome aparecerá na saudação do painel e no menu do perfil.</p>
          </div>
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center"><Building2 size={16} className="text-primary-600" /></div>
          <h2 className="text-sm font-bold text-gray-900">Dados da Empresa</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nome da empresa *</label>
            <input type="text" value={brand.nome_empresa} onChange={(e) => updateBrand({ nome_empresa: e.target.value })} placeholder="Minha Estética Automotiva" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Slogan</label>
            <input type="text" value={brand.slogan} onChange={(e) => updateBrand({ slogan: e.target.value })} placeholder="Qualidade e excelência" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">CNPJ</label>
            <input type="text" value={brand.cnpj} onChange={(e) => updateBrand({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
            <input type="tel" value={brand.telefone} onChange={(e) => updateBrand({ telefone: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input type="email" value={brand.email} onChange={(e) => updateBrand({ email: e.target.value })} placeholder="contato@empresa.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Endereço</label>
            <input type="text" value={brand.endereco} onChange={(e) => updateBrand({ endereco: e.target.value })} placeholder="Rua, número, cidade - UF" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><Upload size={16} className="text-violet-600" /></div>
          <h2 className="text-sm font-bold text-gray-900">Logo da Empresa</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center">
                <Settings size={24} className="text-gray-300 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400">Sem logo</p>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-xs text-gray-400">Envie a logo da sua empresa. Formatos aceitos: JPG, PNG, SVG. Tamanho máximo: 2MB.</p>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl text-xs font-bold transition-colors">
                <Upload size={14} /> Enviar logo
              </button>
              {brand.logo_url && (
                <button onClick={removeLogo} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors">
                  <X size={14} /> Remover
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
        </div>
      </div>

      {/* Cores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center"><Palette size={16} className="text-rose-600" /></div>
          <h2 className="text-sm font-bold text-gray-900">Cores</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Cor primária</label>
            <div className="flex flex-wrap items-center gap-2">
              {CORES_SUGERIDAS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateBrand({ cor_primaria: c })}
                  className={`w-8 h-8 rounded-xl transition-all active:scale-95 ${brand.cor_primaria === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={brand.cor_primaria}
                  onChange={(e) => updateBrand({ cor_primaria: e.target.value })}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                />
                <div className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center" style={{ backgroundColor: brand.cor_primaria }}>
                  <span className="text-[10px] font-bold text-white mix-blend-difference">+</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Atual: {brand.cor_primaria}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Cor secundária (fundo do cabeçalho)</label>
            <div className="flex flex-wrap items-center gap-2">
              {['#0d0d1a', '#1a1a2e', '#16213e', '#1f2937', '#18181b', '#0f172a', '#171717'].map((c) => (
                <button
                  key={c}
                  onClick={() => updateBrand({ cor_secundaria: c })}
                  className={`w-8 h-8 rounded-xl transition-all active:scale-95 ${brand.cor_secundaria === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={brand.cor_secundaria}
                  onChange={(e) => updateBrand({ cor_secundaria: e.target.value })}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                />
                <div className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center" style={{ backgroundColor: brand.cor_secundaria }}>
                  <span className="text-[10px] font-bold text-white mix-blend-difference">+</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Atual: {brand.cor_secundaria}</p>
          </div>

          {/* Preview */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Pré-visualização</label>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: brand.cor_secundaria }}>
                {brand.logo_url && <img src={brand.logo_url} alt="" className="w-7 h-7 object-contain" />}
                <span className="text-sm font-bold" style={{ color: brand.cor_primaria }}>{brand.nome_empresa || 'Sua Empresa'}</span>
              </div>
              <div className="p-4 bg-gray-50 flex gap-2">
                <div className="px-4 py-2 rounded-full text-xs font-bold" style={{ backgroundColor: brand.cor_primaria, color: brand.cor_secundaria }}>Botão primário</div>
                <div className="px-4 py-2 rounded-full text-xs font-bold border border-gray-200 text-gray-600">Botão secundário</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              updateBrand({ cor_primaria: brand.cor_primaria, cor_secundaria: brand.cor_secundaria })
              toast.success('Cores aplicadas com sucesso!')
            }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.cor_primaria, color: brand.cor_secundaria }}
          >
            Salvar Cores
          </button>
        </div>
      </div>

      {/* Configuração do PDF */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><FileText size={16} className="text-blue-600" /></div>
          <h2 className="text-sm font-bold text-gray-900">Configuração do PDF (Orçamento)</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateBrand({ pdf_mostrar_logo: !brand.pdf_mostrar_logo })}
              className={`w-10 h-6 rounded-full transition-colors relative ${brand.pdf_mostrar_logo ? 'bg-primary-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${brand.pdf_mostrar_logo ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <span className="text-xs font-medium text-gray-600">Exibir logo no PDF</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateBrand({ pdf_mostrar_dados: !brand.pdf_mostrar_dados })}
              className={`w-10 h-6 rounded-full transition-colors relative ${brand.pdf_mostrar_dados ? 'bg-primary-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${brand.pdf_mostrar_dados ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <span className="text-xs font-medium text-gray-600">Exibir dados da empresa (CNPJ, telefone, endereço)</span>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Texto do rodapé</label>
            <input type="text" value={brand.pdf_rodape} onChange={(e) => updateBrand({ pdf_rodape: e.target.value })} placeholder="Obrigado pela preferência!" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Termos e condições</label>
            <textarea value={brand.pdf_termos} onChange={(e) => updateBrand({ pdf_termos: e.target.value })} placeholder="Condições do orçamento..." rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" />
          </div>
          <button onClick={() => setPreviewPdf(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors">
            <Eye size={14} /> Pré-visualizar PDF
          </button>
        </div>
      </div>

      {/* Preview PDF Modal */}
      {previewPdf && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPdf(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Pré-visualização do PDF</h2>
              <button onClick={() => setPreviewPdf(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* PDF Header */}
              <div className="flex items-center gap-4 pb-4 border-b-2" style={{ borderColor: brand.cor_primaria }}>
                {brand.pdf_mostrar_logo && brand.logo_url && (
                  <img src={brand.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                )}
                <div>
                  <p className="text-lg font-bold" style={{ color: brand.cor_secundaria }}>{brand.nome_empresa || 'Sua Empresa'}</p>
                  {brand.slogan && <p className="text-xs text-gray-400">{brand.slogan}</p>}
                  {brand.pdf_mostrar_dados && (
                    <div className="mt-1 space-y-0.5">
                      {brand.cnpj && <p className="text-[10px] text-gray-500">CNPJ: {brand.cnpj}</p>}
                      {brand.telefone && <p className="text-[10px] text-gray-500">Tel: {brand.telefone}</p>}
                      {brand.endereco && <p className="text-[10px] text-gray-500">{brand.endereco}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Content sample */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">ORÇAMENTO #001</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <p>Cliente: <span className="font-semibold text-gray-700">João da Silva</span></p>
                  <p>Data: <span className="font-semibold text-gray-700">{new Date().toLocaleDateString('pt-BR')}</span></p>
                </div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: brand.cor_secundaria }}>
                    <th className="text-left p-2 rounded-l-lg">Serviço</th>
                    <th className="text-center p-2">Qtd</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-right p-2 rounded-r-lg">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-700">Polimento cristalizado</td>
                    <td className="p-2 text-center text-gray-500">1</td>
                    <td className="p-2 text-right text-gray-500">R$ 350,00</td>
                    <td className="p-2 text-right font-semibold text-gray-700">R$ 350,00</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-700">Higienização interna</td>
                    <td className="p-2 text-center text-gray-500">1</td>
                    <td className="p-2 text-right text-gray-500">R$ 200,00</td>
                    <td className="p-2 text-right font-semibold text-gray-700">R$ 200,00</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-right space-y-1">
                <p className="text-xs text-gray-500">Subtotal: <span className="font-semibold">R$ 550,00</span></p>
                <p className="text-sm font-bold" style={{ color: brand.cor_secundaria }}>Total: R$ 550,00</p>
              </div>

              {brand.pdf_termos && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Termos e condições</p>
                  <p className="text-[10px] text-gray-400 whitespace-pre-wrap">{brand.pdf_termos}</p>
                </div>
              )}

              {brand.pdf_rodape && (
                <div className="text-center pt-3 border-t-2" style={{ borderColor: brand.cor_primaria }}>
                  <p className="text-xs font-medium text-gray-500">{brand.pdf_rodape}</p>
                  {brand.email && <p className="text-[10px] text-gray-400 mt-0.5">{brand.email}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
