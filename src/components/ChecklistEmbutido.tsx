import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CHECKLIST_ITENS_PADRAO } from '../types'
import type { Servico } from '../types'
import { Camera, X, ChevronDown, ChevronUp, ClipboardCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { validarArquivo } from '../lib/validarArquivo'

interface ItemForm {
  item_tipo: string
  observacao: string
  fotos: File[]
  previews: string[]
  aberto: boolean
}

interface ChecklistEmbutidoProps {
  nomeCliente: string
  placa: string
  telefone?: string
  onSalvo?: (checklistId: string) => void
}

export default function ChecklistEmbutido({ nomeCliente, placa, telefone, onSalvo }: ChecklistEmbutidoProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [servicosSelecionados, setServicosSelecionados] = useState<Record<string, number>>({})
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
    if (user) {
      (async () => {
        const { data } = await supabase
          .from('servicos')
          .select('*')
          .eq('user_id', user.id)
          .order('nome')
        if (data) setServicos(data)
      })()
    }
  }, [user])

  const calcularTotal = (selecionados: Record<string, number>) => {
    return Object.entries(selecionados).reduce((acc, [id, qtd]) => {
      const s = servicos.find((x) => x.id === id)
      if (!s) return acc
      return acc + Number(s.preco_padrao || 0) * Math.max(1, Number(qtd) || 1)
    }, 0)
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

  const handleFotoAdd = (index: number, files: FileList | null) => {
    if (!files) return
    const newItens = [...itens]
    const novosArquivos = Array.from(files).filter(f => {
      const erro = validarArquivo(f)
      if (erro) { toast.error(erro); return false }
      return true
    })
    if (novosArquivos.length === 0) return
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

  const salvarChecklist = async () => {
    if (!user) return
    if (!nomeCliente.trim()) {
      toast.error('Nome do cliente é obrigatório')
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
          placa: (placa || '').toUpperCase(),
          nome_cliente: nomeCliente,
          telefone_cliente: telefone || '',
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
      onSalvo?.(checklist.id)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar checklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-3">

      {/* Serviços */}
      <div>
        <label className="text-xs font-bold text-gray-600 mb-2 block">
          Serviços realizados
        </label>
        {servicos.length === 0 ? (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
            Cadastre serviços na aba Serviços para selecioná-los aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {servicos.map(s => {
              const sel = !!servicosSelecionados[s.id]
              return (
                <div key={s.id}
                  onClick={() => toggleServico(s.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                    sel ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={sel} readOnly className="pointer-events-none" />
                    <span className="text-sm font-medium text-gray-800">{s.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sel && (
                      <input type="number" min={1} value={servicosSelecionados[s.id] || 1}
                        onChange={e => { e.stopPropagation(); setQuantidadeServico(s.id, Number(e.target.value)) }}
                        onClick={e => e.stopPropagation()}
                        className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center outline-none"
                      />
                    )}
                    <span className="text-xs font-semibold text-success-600">
                      {s.preco_padrao > 0 ? `R$ ${Number(s.preco_padrao).toFixed(2)}` : 'Grátis'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Valor e observações */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Valor total (R$)</label>
          <input type="number" step="0.01" value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Observações gerais</label>
          <input type="text" value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Opcional..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>

      {/* Itens de inspeção — accordion compacto */}
      <div>
        <label className="text-xs font-bold text-gray-600 mb-2 block">
          Itens de inspeção
        </label>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {itens.map((item, index) => (
            <div key={item.item_tipo}
              className="border border-gray-200 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{item.item_tipo}</span>
                  {item.fotos.length > 0 && (
                    <span className="text-[9px] bg-success-100 text-success-700 px-1.5 py-0.5 rounded-full font-bold">
                      {item.fotos.length} foto(s)
                    </span>
                  )}
                </div>
                {item.aberto ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>
              {item.aberto && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                  <textarea
                    value={item.observacao}
                    onChange={e => { const n = [...itens]; n[index].observacao = e.target.value; setItens(n) }}
                    placeholder={`Observações sobre ${item.item_tipo.toLowerCase()}...`}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
                  <div className="flex flex-wrap gap-1.5">
                    {item.previews.map((preview, fotoIdx) => (
                      <div key={fotoIdx} className="relative group">
                        <img src={preview} alt=""
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                        <button type="button"
                          onClick={() => handleFotoRemove(index, fotoIdx)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center gap-1 px-2 py-1.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors text-[11px] text-gray-400">
                      <Camera size={12} /> Foto
                      <input type="file" accept="image/*" multiple capture="environment"
                        className="hidden"
                        onChange={e => handleFotoAdd(index, e.target.files)} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botão salvar checklist */}
      <button
        type="button"
        onClick={salvarChecklist}
        disabled={loading}
        className="w-full py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
          : <><ClipboardCheck size={16} /> Salvar Checklist</>
        }
      </button>
    </div>
  )
}
