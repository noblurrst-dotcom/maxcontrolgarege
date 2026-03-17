import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, Car, User, ChevronRight } from 'lucide-react'
import type { Checklist } from '../types'

interface ChecklistCardProps {
  checklist: Checklist
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pendente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' },
  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em andamento' },
  concluido: { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluído' },
}

export default function ChecklistCard({ checklist }: ChecklistCardProps) {
  const navigate = useNavigate()
  const status = statusColors[checklist.status] || statusColors.pendente

  const dataFormatada = (() => {
    try {
      return format(new Date(checklist.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return checklist.data_hora
    }
  })()

  return (
    <div
      onClick={() => navigate(`/checklist/${checklist.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg tracking-wider">{checklist.placa}</p>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <User size={13} />
              <span>{checklist.nome_cliente}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar size={14} />
            <span>{dataFormatada}</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600 font-medium">{checklist.servico}</span>
        </div>
        <div className="flex items-center gap-1 text-green-600 font-semibold">
          <DollarSign size={15} />
          <span>{Number(checklist.valor).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
