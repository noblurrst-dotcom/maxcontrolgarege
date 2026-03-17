import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Phone,
  Car,
  FileText,
  Camera,
  Trash2,
  Edit3,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Checklist, ChecklistItem, Foto, ChecklistServicoComServico } from '../types'

export default function VisualizarChecklist() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [itens, setItens] = useState<ChecklistItem[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [servicosChecklist, setServicosChecklist] = useState<ChecklistServicoComServico[]>([])
  const [loading, setLoading] = useState(true)
  const [deletando, setDeletando] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)

  useEffect(() => {
    if (id && user) {
      carregarDados()
    }
  }, [id, user])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [checklistRes, itensRes, fotosRes, servicosRes] = await Promise.all([
        supabase.from('checklists').select('*').eq('id', id).eq('user_id', user!.id).single(),
        supabase.from('checklist_itens').select('*').eq('checklist_id', id).order('ordem'),
        supabase.from('fotos').select('*').eq('checklist_id', id),
        supabase
          .from('checklist_servicos')
          .select('quantidade, servicos(*)')
          .eq('checklist_id', id),
      ])

      if (checklistRes.error) throw checklistRes.error
      setChecklist(checklistRes.data)
      setItens(itensRes.data || [])
      setFotos(fotosRes.data || [])
      setServicosChecklist((servicosRes.data as any) || [])
    } catch (err) {
      console.error('Erro ao carregar checklist:', err)
      toast.error('Erro ao carregar checklist')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const exportarPDF = () => {
    if (!checklist) return
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      let y = 48

      doc.setFontSize(18)
      doc.text('Checklist - Max Control', 40, y)
      y += 22

      doc.setFontSize(11)
      doc.setTextColor(80)
      doc.text(`Placa: ${checklist.placa}`, 40, y)
      y += 16
      doc.text(`Cliente: ${checklist.nome_cliente}`, 40, y)
      y += 16
      if (checklist.telefone_cliente) {
        doc.text(`Telefone: ${checklist.telefone_cliente}`, 40, y)
        y += 16
      }
      doc.text(`Data: ${dataFormatada}`, 40, y)
      y += 16
      doc.text(`Status: ${statusConfig[checklist.status]?.label || checklist.status}`, 40, y)
      y += 20

      doc.setTextColor(20)
      doc.setFontSize(13)
      doc.text('Serviços', 40, y)
      y += 14
      doc.setFontSize(11)
      doc.setTextColor(80)

      if (servicosChecklist.length === 0) {
        doc.text('Nenhum serviço associado.', 40, y)
        y += 16
      } else {
        servicosChecklist.forEach((row) => {
          const nome = row.servicos?.nome || 'Serviço'
          const preco = Number(row.servicos?.preco_padrao || 0)
          const qtd = Number(row.quantidade || 1)
          const linha = `- ${nome} (Qtd: ${qtd}) - R$ ${(preco * qtd).toFixed(2)}`
          doc.text(linha, 40, y)
          y += 14
          if (y > 760) {
            doc.addPage()
            y = 48
          }
        })
      }

      y += 6
      doc.setTextColor(20)
      doc.setFontSize(13)
      doc.text('Itens de inspeção', 40, y)
      y += 14
      doc.setFontSize(11)
      doc.setTextColor(80)

      itens.forEach((item) => {
        const titulo = `${item.ordem}. ${item.item_tipo}`
        doc.text(titulo, 40, y)
        y += 14
        if (item.observacao) {
          const linhas = doc.splitTextToSize(`Obs: ${item.observacao}`, 520)
          doc.text(linhas, 56, y)
          y += linhas.length * 14
        }
        const fotosItem = fotos.filter((f) => f.item_tipo === item.item_tipo)
        if (fotosItem.length > 0) {
          doc.text(`Fotos: ${fotosItem.length}`, 56, y)
          y += 14
          fotosItem.slice(0, 3).forEach((f) => {
            const linhas = doc.splitTextToSize(f.url, 520)
            doc.text(linhas, 72, y)
            y += linhas.length * 12
          })
        }
        y += 6
        if (y > 760) {
          doc.addPage()
          y = 48
        }
      })

      y += 6
      doc.setTextColor(20)
      doc.setFontSize(13)
      doc.text(`Total: R$ ${Number(checklist.valor).toFixed(2)}`, 40, y)
      y += 18

      if (checklist.observacoes) {
        doc.setFontSize(12)
        doc.text('Observações gerais', 40, y)
        y += 14
        doc.setFontSize(11)
        doc.setTextColor(80)
        const linhas = doc.splitTextToSize(checklist.observacoes, 520)
        doc.text(linhas, 40, y)
      }

      doc.save(`checklist-${checklist.placa}-${checklist.id}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro ao exportar PDF')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este checklist?')) return
    setDeletando(true)
    try {
      const fotosParaDeletar = fotos.map((f) => {
        const url = new URL(f.url)
        return url.pathname.split('/fotos-checklist/')[1]
      }).filter(Boolean)

      if (fotosParaDeletar.length > 0) {
        await supabase.storage.from('fotos-checklist').remove(fotosParaDeletar)
      }

      await supabase.from('fotos').delete().eq('checklist_id', id)
      await supabase.from('checklist_itens').delete().eq('checklist_id', id)
      await supabase.from('checklists').delete().eq('id', id)

      toast.success('Checklist excluído')
      navigate('/')
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast.error('Erro ao excluir checklist')
    } finally {
      setDeletando(false)
    }
  }

  const handleStatusChange = async (novoStatus: string) => {
    try {
      await supabase.from('checklists').update({ status: novoStatus }).eq('id', id)
      setChecklist((prev) => (prev ? { ...prev, status: novoStatus as Checklist['status'] } : null))
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const getFotosDoItem = (itemTipo: string) => {
    return fotos.filter((f) => f.item_tipo === itemTipo)
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    pendente: { icon: Clock, color: 'text-yellow-600', label: 'Pendente' },
    em_andamento: { icon: AlertCircle, color: 'text-blue-600', label: 'Em andamento' },
    concluido: { icon: CheckCircle2, color: 'text-green-600', label: 'Concluído' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!checklist) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Checklist não encontrado</p>
      </div>
    )
  }

  const dataFormatada = (() => {
    try {
      return format(new Date(checklist.data_hora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return checklist.data_hora
    }
  })()

  const StatusIcon = statusConfig[checklist.status]?.icon || Clock

  return (
    <div className="pb-20 sm:pb-6">
      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Exportar PDF"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => navigate(`/editar-checklist/${id}`)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deletando}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            {deletando ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>

      {/* Info do veículo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-wider font-mono">
                {checklist.placa}
              </p>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <User size={14} />
                <span>{checklist.nome_cliente}</span>
              </div>
            </div>
          </div>

          <select
            value={checklist.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border-0 ${statusConfig[checklist.status]?.color || ''} bg-gray-50 cursor-pointer`}
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {checklist.telefone_cliente && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={15} className="text-gray-400" />
              <span>{checklist.telefone_cliente}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={15} className="text-gray-400" />
            <span>{dataFormatada}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <FileText size={15} className="text-gray-400" />
            <span>{checklist.servico}</span>
          </div>
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <DollarSign size={15} />
            <span>R$ {Number(checklist.valor).toFixed(2)}</span>
          </div>
        </div>

        {servicosChecklist.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-2">Serviços escolhidos:</p>
            <div className="space-y-1">
              {servicosChecklist.map((row, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {row.servicos?.nome} {row.quantidade > 1 ? `x${row.quantidade}` : ''}
                  </span>
                  <span className="text-gray-500">
                    R$ {(Number(row.servicos?.preco_padrao || 0) * Number(row.quantidade || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {checklist.observacoes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-1">Observações:</p>
            <p className="text-sm text-gray-700">{checklist.observacoes}</p>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <StatusIcon size={16} className={statusConfig[checklist.status]?.color} />
        <span className={`text-sm font-medium ${statusConfig[checklist.status]?.color}`}>
          {statusConfig[checklist.status]?.label}
        </span>
      </div>

      {/* Itens do Checklist */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-800">Checklist de Inspeção</h2>

        {itens.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-sm">Nenhum item no checklist</p>
          </div>
        ) : (
          itens.map((item) => {
            const fotosItem = getFotosDoItem(item.item_tipo)
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {item.ordem}
                  </span>
                  <span className="font-medium text-gray-800">{item.item_tipo}</span>
                  {item.tem_foto && (
                    <Camera size={14} className="text-green-500" />
                  )}
                </div>

                {item.observacao && (
                  <p className="text-sm text-gray-600 ml-10 mb-2">{item.observacao}</p>
                )}

                {fotosItem.length > 0 && (
                  <div className="ml-10 flex flex-wrap gap-2">
                    {fotosItem.map((foto) => (
                      <img
                        key={foto.id}
                        src={foto.url}
                        alt={`Foto ${item.item_tipo}`}
                        onClick={() => setFotoAmpliada(foto.url)}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
