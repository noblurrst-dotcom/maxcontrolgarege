import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useBrand } from '../contexts/BrandContext'
import type { Servico, Orcamento, Venda } from '../types'
import { Camera, X, ClipboardCheck, Loader2, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { validarArquivo } from '../lib/validarArquivo'
import { exportarOrcamentoPDF } from '../lib/exportarOrcamentoPDF'

interface Defeito {
  id: string
  x: number
  y: number
  descricao: string
  fotos: File[]
  previews: string[]
  fotosUrls: string[]
}

interface ChecklistUnificadoProps {
  tipo: 'venda' | 'orcamento'
  // Dados do cliente / origem (para preencher header)
  nomeCliente: string
  telefoneCliente?: string
  placa?: string
  // Para PDF: lista de itens do orçamento OU descrição da venda
  origem: Orcamento | Venda
  // Callback quando o checklist é salvo (devolve checklist_id)
  onSalvo?: (checklistId: string) => void
  // Para fechar o painel após salvar
  onClose?: () => void
}

export default function ChecklistUnificado({
  tipo, nomeCliente, telefoneCliente, placa, origem, onSalvo, onClose,
}: ChecklistUnificadoProps) {
  const { user } = useAuth()
  const { brand } = useBrand()
  const [loading, setLoading] = useState(false)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])

  // ── Defeitos (cada clique no diagrama vira um defeito independente) ──
  const [defeitos, setDefeitos] = useState<Defeito[]>([])
  const [defeitoFocadoId, setDefeitoFocadoId] = useState<string | null>(null)
  const cardsRef = useRef<Record<string, HTMLDivElement | null>>({})

  // ── Metadata extra para o PDF ──
  const [estadoPintura, setEstadoPintura] = useState<'otimo' | 'bom' | 'regular' | 'ruim' | ''>('')
  const [lavador, setLavador] = useState('')
  const [tecnicoPolidor, setTecnicoPolidor] = useState('')
  const [dataEntradaLoja, setDataEntradaLoja] = useState('')
  const [dataEntradaOficina, setDataEntradaOficina] = useState('')
  const [dataSaidaOficina, setDataSaidaOficina] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Carregar serviços (para o PDF marcar quais foram contratados)
  useEffect(() => {
    if (!user) return
    supabase
      .from('servicos').select('*').eq('user_id', user.id).order('nome')
      .then(({ data }) => { if (data) setServicos(data) })
  }, [user])

  // Limpar object URLs ao desmontar
  useEffect(() => {
    return () => {
      defeitos.forEach(d => d.previews.forEach(p => URL.revokeObjectURL(p)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Diagrama: clique para adicionar defeito ──
  const handleDiagramaClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Se clicou perto de um defeito existente, foca ele em vez de criar novo
    const raio = 0.04
    const existente = defeitos.find(d => Math.abs(d.x - x) < raio && Math.abs(d.y - y) < raio)
    if (existente) {
      setDefeitoFocadoId(existente.id)
      const el = cardsRef.current[existente.id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }

    const novo: Defeito = {
      id: crypto.randomUUID(),
      x, y, descricao: '',
      fotos: [], previews: [], fotosUrls: [],
    }
    setDefeitos(prev => [...prev, novo])
    setDefeitoFocadoId(novo.id)
    setTimeout(() => {
      cardsRef.current[novo.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  const removerDefeito = (id: string) => {
    setDefeitos(prev => {
      const def = prev.find(d => d.id === id)
      def?.previews.forEach(p => URL.revokeObjectURL(p))
      return prev.filter(d => d.id !== id)
    })
    if (defeitoFocadoId === id) setDefeitoFocadoId(null)
  }

  const atualizarDescricao = (id: string, descricao: string) => {
    setDefeitos(prev => prev.map(d => d.id === id ? { ...d, descricao } : d))
  }

  const adicionarFotos = (id: string, files: FileList | null) => {
    if (!files) return
    const validos = Array.from(files).filter(f => {
      const erro = validarArquivo(f)
      if (erro) { toast.error(erro); return false }
      return true
    })
    if (!validos.length) return
    const previews = validos.map(f => URL.createObjectURL(f))
    setDefeitos(prev => prev.map(d => d.id === id
      ? { ...d, fotos: [...d.fotos, ...validos], previews: [...d.previews, ...previews] }
      : d))
  }

  const removerFoto = (id: string, idx: number) => {
    setDefeitos(prev => prev.map(d => {
      if (d.id !== id) return d
      URL.revokeObjectURL(d.previews[idx])
      return {
        ...d,
        fotos: d.fotos.filter((_, i) => i !== idx),
        previews: d.previews.filter((_, i) => i !== idx),
      }
    }))
  }

  // ── Salvar Checklist ──
  const salvar = async (): Promise<string | null> => {
    if (!user) return null
    if (!nomeCliente.trim()) {
      toast.error('Cliente sem nome'); return null
    }

    setLoading(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 180)

      const servicoStr = tipo === 'orcamento'
        ? (origem as Orcamento).itens.map(i => i.descricao).filter(Boolean).join(', ') || 'Orçamento'
        : (origem as Venda).descricao || 'Venda'

      const valorTotal = tipo === 'orcamento'
        ? (origem as Orcamento).valor_total
        : (origem as Venda).valor_total

      const { data: chk, error: chkErr } = await supabase
        .from('checklists').insert({
          user_id: user.id,
          placa: (placa || '').toUpperCase(),
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente || '',
          data_hora: new Date().toISOString(),
          servico: servicoStr,
          valor: valorTotal,
          status: 'concluido',
          observacoes,
          estado_pintura: estadoPintura || null,
          lavador, tecnico_polidor: tecnicoPolidor,
          data_entrada_loja: dataEntradaLoja || null,
          data_entrada_oficina: dataEntradaOficina || null,
          data_saida_oficina: dataSaidaOficina || null,
          expires_at: expiresAt.toISOString(),
        }).select().single()
      if (chkErr) throw chkErr

      // Inserir defeitos (item_tipo null, usa pos_x/pos_y/descricao)
      const fotosUrlsPorDefeito: Record<string, string[]> = {}
      if (defeitos.length > 0) {
        const itensInsert = defeitos.map((d, idx) => ({
          checklist_id: chk.id,
          item_tipo: null,
          pos_x: d.x,
          pos_y: d.y,
          descricao: d.descricao,
          observacao: '',
          tem_foto: d.fotos.length > 0,
          ordem: idx + 1,
        }))
        const { error: itErr } = await supabase.from('checklist_itens').insert(itensInsert)
        if (itErr) throw itErr

        // Upload fotos
        for (const d of defeitos) {
          const urls: string[] = []
          for (const foto of d.fotos) {
            const fotoExp = new Date()
            fotoExp.setDate(fotoExp.getDate() + 15)
            const fileName = `${user.id}/${chk.id}/${d.id}/${Date.now()}-${foto.name}`
            const { error: upErr } = await supabase.storage.from('fotos-checklist')
              .upload(fileName, foto, { cacheControl: '3600', upsert: false })
            if (upErr) { console.error('upload', upErr); continue }
            const { data: urlD } = supabase.storage.from('fotos-checklist').getPublicUrl(fileName)
            urls.push(urlD.publicUrl)
            await supabase.from('fotos').insert({
              checklist_id: chk.id,
              item_tipo: d.id, // usa id do defeito como key
              url: urlD.publicUrl,
              expires_at: fotoExp.toISOString(),
            })
          }
          fotosUrlsPorDefeito[d.id] = urls
        }

        // Atualiza o estado para que o PDF gerado a seguir tenha as URLs
        setDefeitos(prev => prev.map(d => ({ ...d, fotosUrls: fotosUrlsPorDefeito[d.id] || [] })))
      }

      toast.success('Checklist salvo')
      onSalvo?.(chk.id)
      return chk.id
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar checklist: ' + (err?.message || 'desconhecido'))
      return null
    } finally {
      setLoading(false)
    }
  }

  // ── Exportar PDF (em memória — não exige salvar antes) ──
  const exportar = async () => {
    setGerandoPDF(true)
    try {
      // Adapta Venda → Orcamento-like para exportarOrcamentoPDF
      const orcLike = tipo === 'orcamento'
        ? (origem as Orcamento)
        : {
            ...(origem as any),
            itens: [{
              descricao: (origem as Venda).descricao,
              quantidade: 1,
              valor_unitario: (origem as Venda).valor_total,
            }],
            telefone_cliente: telefoneCliente || '',
          } as Orcamento

      await exportarOrcamentoPDF({
        orcamento: orcLike,
        servicos,
        brand,
        tipo,
        marcacoesDefeitos: defeitos.map(d => ({ x: d.x, y: d.y })),
        defeitosDetalhados: defeitos.map(d => ({
          x: d.x, y: d.y, descricao: d.descricao,
          fotos: d.previews, // usa previews (data URLs locais) já que ainda não salvou
        })),
        estadoPintura: estadoPintura || undefined,
        lavador, tecnicoPolidor,
        dataEntradaLoja, dataEntradaOficina, dataSaidaOficina,
        observacoes,
      })
    } finally {
      setGerandoPDF(false)
    }
  }

  // ── Render ──
  return (
    <div className="space-y-4 pt-2">
      {/* Diagrama com defeitos numerados */}
      <div>
        <label className="text-xs font-bold text-gray-600 mb-2 block">
          Identificação de Defeitos
        </label>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center py-1">
            Clique no diagrama para marcar um defeito • Clique em uma marcação existente para editá-la
          </p>
          <svg viewBox="0 0 300 160" className="w-full cursor-crosshair" onClick={handleDiagramaClick}>
            <rect width="300" height="160" fill="#f9f9f9" />
            <rect x="110" y="15" width="80" height="130" rx="12" ry="12" fill="#e8e8e8" stroke="#999" strokeWidth="1.5" />
            <rect x="120" y="18" width="60" height="28" rx="4" ry="4" fill="#c8dff0" stroke="#888" strokeWidth="1" />
            <rect x="120" y="114" width="60" height="28" rx="4" ry="4" fill="#c8dff0" stroke="#888" strokeWidth="1" />
            <rect x="125" y="50" width="50" height="60" rx="2" ry="2" fill="#d5d5d5" stroke="#999" strokeWidth="0.5" />
            <ellipse cx="100" cy="40" rx="10" ry="13" fill="#555" />
            <ellipse cx="200" cy="40" rx="10" ry="13" fill="#555" />
            <ellipse cx="100" cy="120" rx="10" ry="13" fill="#555" />
            <ellipse cx="200" cy="120" rx="10" ry="13" fill="#555" />
            <ellipse cx="100" cy="40" rx="6" ry="9" fill="#888" />
            <ellipse cx="200" cy="40" rx="6" ry="9" fill="#888" />
            <ellipse cx="100" cy="120" rx="6" ry="9" fill="#888" />
            <ellipse cx="200" cy="120" rx="6" ry="9" fill="#888" />
            <text x="150" y="9" textAnchor="middle" fontSize="8" fill="#999">FRENTE</text>
            <text x="150" y="158" textAnchor="middle" fontSize="8" fill="#999">TRASEIRA</text>
            <text x="8" y="83" textAnchor="middle" fontSize="7" fill="#999" transform="rotate(-90, 8, 83)">ESQUERDA</text>
            <text x="292" y="83" textAnchor="middle" fontSize="7" fill="#999" transform="rotate(90, 292, 83)">DIREITA</text>
            {defeitos.map((d, i) => {
              const focado = defeitoFocadoId === d.id
              return (
                <g key={d.id}>
                  <circle cx={d.x * 300} cy={d.y * 160} r={focado ? 8 : 6}
                    fill={focado ? 'rgba(239,68,68,0.55)' : 'rgba(239,68,68,0.3)'}
                    stroke="#ef4444" strokeWidth={focado ? 2 : 1.5} />
                  <text x={d.x * 300} y={d.y * 160 + 4} textAnchor="middle"
                    fontSize="7" fontWeight="bold" fill="#ef4444">{i + 1}</text>
                </g>
              )
            })}
          </svg>
          {defeitos.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{defeitos.length} defeito(s) marcado(s)</span>
              <button type="button" onClick={() => {
                defeitos.forEach(d => d.previews.forEach(p => URL.revokeObjectURL(p)))
                setDefeitos([])
                setDefeitoFocadoId(null)
              }} className="text-[10px] text-danger-400 hover:text-danger-600 font-medium">
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de defeitos com descrição + fotos */}
      {defeitos.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600 block">
            Detalhes dos defeitos ({defeitos.length})
          </label>
          {defeitos.map((d, i) => (
            <div key={d.id}
              ref={el => { cardsRef.current[d.id] = el }}
              className={`border rounded-xl p-3 transition-colors ${
                defeitoFocadoId === d.id ? 'border-danger-300 bg-danger-50/30' : 'border-gray-200'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Defeito {i + 1}</span>
                </div>
                <button type="button" onClick={() => removerDefeito(d.id)}
                  className="text-gray-300 hover:text-danger-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={d.descricao}
                onChange={e => atualizarDescricao(d.id, e.target.value)}
                placeholder="Descreva o defeito (ex: arranhão profundo na porta, amassado pequeno, etc.)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none mb-2" />
              <div className="flex flex-wrap gap-1.5">
                {d.previews.map((preview, fotoIdx) => (
                  <div key={fotoIdx} className="relative group">
                    <img src={preview} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => removerFoto(d.id, fotoIdx)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="flex items-center gap-1 px-2 py-1.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors text-[11px] text-gray-400">
                  <Camera size={12} /> Foto
                  <input type="file" accept="image/*" multiple capture="environment"
                    className="hidden"
                    onChange={e => adicionarFotos(d.id, e.target.files)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado da pintura */}
      <div>
        <label className="text-xs font-bold text-gray-600 mb-2 block">Estado da Pintura</label>
        <div className="flex gap-2">
          {(['otimo', 'bom', 'regular', 'ruim'] as const).map(e => (
            <button key={e} type="button"
              onClick={() => setEstadoPintura(v => v === e ? '' : e)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                estadoPintura === e ? 'bg-primary-500 text-on-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {e === 'otimo' ? 'Ótimo' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Lavador / Técnico */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Lavador</label>
          <input type="text" value={lavador} onChange={e => setLavador(e.target.value)}
            placeholder="Nome do lavador"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Técnico Polidor</label>
          <input type="text" value={tecnicoPolidor} onChange={e => setTecnicoPolidor(e.target.value)}
            placeholder="Nome do técnico"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Entrada na Loja', val: dataEntradaLoja, set: setDataEntradaLoja },
          { label: 'Entrada Oficina', val: dataEntradaOficina, set: setDataEntradaOficina },
          { label: 'Saída Oficina', val: dataSaidaOficina, set: setDataSaidaOficina },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">{label}</label>
            <input type="date" value={val} onChange={e => set(e.target.value)}
              className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        ))}
      </div>

      {/* Observações */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Observações gerais</label>
        <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
          placeholder="Observações sobre o veículo ou serviço..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
      </div>

      {/* Botões */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={async () => { const id = await salvar(); if (id && onClose) onClose() }}
          disabled={loading}
          className="flex-1 py-2.5 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            : <><ClipboardCheck size={16} /> Salvar Checklist</>}
        </button>
        <button type="button" onClick={exportar} disabled={gerandoPDF}
          className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-hover text-on-primary rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {gerandoPDF
            ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
            : <><Download size={16} /> Exportar PDF</>}
        </button>
      </div>
    </div>
  )
}
