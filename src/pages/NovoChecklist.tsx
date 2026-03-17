import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CHECKLIST_ITENS_PADRAO } from '../types'
import type { Servico } from '../types'
import { Save, Camera, X, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface ItemForm {
  item_tipo: string
  observacao: string
  fotos: File[]
  previews: string[]
  aberto: boolean
}

export default function NovoChecklist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])

  const [servicosSelecionados, setServicosSelecionados] = useState<Record<string, number>>({})

  const [placa, setPlaca] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [valor, setValor] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [itens, setItens] = useState<ItemForm[]>(
    CHECKLIST_ITENS_PADRAO.map((item) => ({
      item_tipo: item.item_tipo,
      observacao: '',
      fotos: [],
      previews: [],
      aberto: false,
    }))
  )

  useEffect(() => {
    carregarServicos()
  }, [])

  const carregarServicos = async () => {
    if (!user) return
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('user_id', user.id)
      .order('nome')
    if (data) setServicos(data)
  }

  const calcularTotal = (selecionados: Record<string, number>) => {
    const total = Object.entries(selecionados).reduce((acc, [id, qtd]) => {
      const s = servicos.find((x) => x.id === id)
      if (!s) return acc
      const q = Math.max(1, Number(qtd) || 1)
      return acc + Number(s.preco_padrao || 0) * q
    }, 0)
    return total
  }

  const toggleServico = (servicoId: string) => {
    setServicosSelecionados((prev) => {
      const next = { ...prev }
      if (next[servicoId]) {
        delete next[servicoId]
      } else {
        next[servicoId] = 1
      }
      const total = calcularTotal(next)
      setValor(total > 0 ? total.toFixed(2) : '')
      return next
    })
  }

  const setQuantidadeServico = (servicoId: string, quantidade: number) => {
    setServicosSelecionados((prev) => {
      const next = { ...prev, [servicoId]: Math.max(1, Math.floor(quantidade || 1)) }
      const total = calcularTotal(next)
      setValor(total > 0 ? total.toFixed(2) : '')
      return next
    })
  }

  const formatarPlaca = (value: string) => {
    const limpo = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (limpo.length <= 3) return limpo
    return limpo.slice(0, 3) + '-' + limpo.slice(3, 7)
  }

  const handleFotoAdd = (index: number, files: FileList | null) => {
    if (!files) return
    const newItens = [...itens]
    const novosArquivos = Array.from(files)
    const novosPreviews = novosArquivos.map((f) => URL.createObjectURL(f))
    newItens[index].fotos = [...newItens[index].fotos, ...novosArquivos]
    newItens[index].previews = [...newItens[index].previews, ...novosPreviews]
    setItens(newItens)
  }

  const handleFotoRemove = (itemIndex: number, fotoIndex: number) => {
    const newItens = [...itens]
    URL.revokeObjectURL(newItens[itemIndex].previews[fotoIndex])
    newItens[itemIndex].fotos.splice(fotoIndex, 1)
    newItens[itemIndex].previews.splice(fotoIndex, 1)
    setItens(newItens)
  }

  const toggleItem = (index: number) => {
    const newItens = [...itens]
    newItens[index].aberto = !newItens[index].aberto
    setItens(newItens)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!placa.trim() || !nomeCliente.trim()) {
      toast.error('Preencha a placa e o nome do cliente')
      return
    }

    setLoading(true)

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 180)

      const { data: checklist, error: checklistError } = await supabase
        .from('checklists')
        .insert({
          user_id: user.id,
          placa: placa.toUpperCase(),
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora: new Date().toISOString(),
          servico: Object.keys(servicosSelecionados).length
            ? servicos
                .filter((s) => servicosSelecionados[s.id])
                .map((s) => s.nome)
                .join(', ')
            : 'Serviço geral',
          valor: parseFloat(valor) || 0,
          status: 'concluido',
          observacoes,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (checklistError) throw checklistError

      const itensParaInserir = itens.map((item, index) => ({
        checklist_id: checklist.id,
        item_tipo: item.item_tipo,
        observacao: item.observacao,
        tem_foto: item.fotos.length > 0,
        ordem: index + 1,
      }))

      const { error: itensError } = await supabase
        .from('checklist_itens')
        .insert(itensParaInserir)

      if (itensError) throw itensError

      const relacoes = Object.entries(servicosSelecionados).map(([servicoId, qtd]) => ({
        checklist_id: checklist.id,
        servico_id: servicoId,
        quantidade: Math.max(1, Number(qtd) || 1),
      }))

      if (relacoes.length > 0) {
        const { error: relError } = await supabase.from('checklist_servicos').insert(relacoes)
        if (relError) throw relError
      }

      for (const item of itens) {
        for (const foto of item.fotos) {
          const fotoExpiresAt = new Date()
          fotoExpiresAt.setDate(fotoExpiresAt.getDate() + 15)

          const fileName = `${user.id}/${checklist.id}/${item.item_tipo}/${Date.now()}-${foto.name}`

          const { error: uploadError } = await supabase.storage
            .from('fotos-checklist')
            .upload(fileName, foto, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            console.error('Erro no upload:', uploadError)
            continue
          }

          const { data: urlData } = supabase.storage
            .from('fotos-checklist')
            .getPublicUrl(fileName)

          await supabase.from('fotos').insert({
            checklist_id: checklist.id,
            item_tipo: item.item_tipo,
            url: urlData.publicUrl,
            expires_at: fotoExpiresAt.toISOString(),
          })
        }
      }

      toast.success('Checklist salvo com sucesso!')
      navigate(`/checklist/${checklist.id}`)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar checklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-20 sm:pb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Voltar</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Checklist</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do veículo e cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Dados do veículo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Placa *
              </label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
                maxLength={8}
                placeholder="ABC-1234"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all uppercase font-mono text-lg tracking-wider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Cliente *
              </label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Nome do cliente"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Valor total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Serviços (selecione um ou mais)
            </label>
            {servicos.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
                Cadastre seus serviços primeiro na aba <span className="font-medium">Serviços</span>.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicos.map((s) => {
                  const selecionado = !!servicosSelecionados[s.id]
                  return (
                    <div
                      key={s.id}
                      className={`border rounded-xl p-3 flex gap-3 items-start cursor-pointer transition-colors ${
                        selecionado ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => toggleServico(s.id)}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {s.foto_url ? (
                          <img src={s.foto_url} alt={s.nome} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">{s.nome}</p>
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => toggleServico(s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                        </div>
                        <p className="text-sm text-green-700 font-semibold mt-0.5">
                          {s.preco_padrao > 0 ? `R$ ${Number(s.preco_padrao).toFixed(2)}` : 'Sem valor'}
                        </p>
                        {selecionado && (
                          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-gray-500">Qtd</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={servicosSelecionados[s.id] || 1}
                              onChange={(e) => setQuantidadeServico(s.id, Number(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Observações gerais
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre o veículo ou serviço..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Itens do Checklist */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Checklist de Inspeção</h2>

          {itens.map((item, index) => (
            <div
              key={item.item_tipo}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleItem(index)}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-800">{item.item_tipo}</span>
                  {item.fotos.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      {item.fotos.length} foto(s)
                    </span>
                  )}
                </div>
                {item.aberto ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </button>

              {item.aberto && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3">
                    <textarea
                      value={item.observacao}
                      onChange={(e) => {
                        const newItens = [...itens]
                        newItens[index].observacao = e.target.value
                        setItens(newItens)
                      }}
                      placeholder={`Observações sobre ${item.item_tipo.toLowerCase()}...`}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                    />
                  </div>

                  {/* Fotos */}
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.previews.map((preview, fotoIdx) => (
                        <div key={fotoIdx} className="relative group">
                          <img
                            src={preview}
                            alt={`Foto ${fotoIdx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleFotoRemove(index, fotoIdx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors text-sm text-gray-500">
                      <Camera size={16} />
                      <span>Adicionar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFotoAdd(index, e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botão Salvar */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={22} />
              Salvar Checklist
            </>
          )}
        </button>
      </form>
    </div>
  )
}
