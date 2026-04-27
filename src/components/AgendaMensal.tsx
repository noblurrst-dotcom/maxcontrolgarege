import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getFeriadosDoAno, getFeriadoDoDia } from '../utils/feriados'
import type { Agendamento } from '../types'

interface AgendaMensalProps {
  mesAtual: Date
  setMesAtual: (d: Date) => void
  agendamentos: Agendamento[]
  onDiaClick?: (dataISO: string) => void
  onAgendamentoClick?: (ag: Agendamento) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_CHIPS = 2

export default function AgendaMensal({ mesAtual, setMesAtual, agendamentos, onDiaClick, onAgendamentoClick }: AgendaMensalProps) {
  const inicioMes = startOfMonth(mesAtual)
  const fimMes = endOfMonth(mesAtual)
  const dias = eachDayOfInterval({ start: inicioMes, end: fimMes })
  const diaInicioSemana = getDay(inicioMes)
  const feriados = useMemo(() => getFeriadosDoAno(mesAtual.getFullYear()), [mesAtual.getFullYear()])

  // Map agendamentos por dia (yyyy-MM-dd → Agendamento[])
  const agendamentosPorDia = useMemo(() => {
    const map = new Map<string, Agendamento[]>()
    agendamentos.forEach(a => {
      if (!a.data_hora) return
      const key = a.data_hora.slice(0, 10)
      const arr = map.get(key) || []
      arr.push(a)
      map.set(key, arr)
    })
    return map
  }, [agendamentos])

  // Calcular total de linhas necessárias
  const totalCells = diaInicioSemana + dias.length
  const totalRows = Math.ceil(totalCells / 7)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col">
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 capitalize">
          {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setMesAtual(subMonths(mesAtual, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <button onClick={() => setMesAtual(new Date())} className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            Hoje
          </button>
          <button onClick={() => setMesAtual(addMonths(mesAtual, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-100 pb-2 mb-0">
        {DIAS_SEMANA.map((d, i) => (
          <div key={d} className={`text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'text-danger-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid do mês */}
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(80px, 1fr))` }}>
        {/* Células vazias antes do primeiro dia */}
        {Array.from({ length: diaInicioSemana }).map((_, i) => (
          <div key={`empty-${i}`} className="border-b border-r border-gray-50 p-1" />
        ))}

        {/* Células dos dias */}
        {dias.map((dia) => {
          const ehHoje = isToday(dia)
          const dStr = format(dia, 'yyyy-MM-dd')
          const feriado = getFeriadoDoDia(dia, feriados)
          const agsDia = agendamentosPorDia.get(dStr) || []
          const ehDomingo = getDay(dia) === 0
          const excesso = agsDia.length - MAX_CHIPS

          return (
            <div
              key={dStr}
              className={`border-b border-r border-gray-50 p-1 sm:p-1.5 flex flex-col cursor-pointer hover:bg-gray-50/50 transition-colors ${ehHoje ? 'bg-primary-50/40' : ''}`}
              onClick={() => onDiaClick?.(dStr)}
            >
              {/* Número do dia */}
              <div className="flex items-start justify-between">
                <span className={`text-sm sm:text-base font-bold leading-none ${
                  ehHoje
                    ? 'w-7 h-7 bg-primary-500 text-on-primary rounded-full flex items-center justify-center text-xs sm:text-sm'
                    : ehDomingo
                      ? 'text-danger-400'
                      : 'text-gray-700'
                }`}>
                  {format(dia, 'd')}
                </span>
              </div>

              {/* Chip de feriado */}
              {feriado && (
                <span className={`mt-0.5 text-[8px] sm:text-[9px] font-semibold leading-tight truncate px-1 py-0.5 rounded ${
                  feriado.tipo === 'nacional'
                    ? 'bg-danger-100 text-danger-700'
                    : 'bg-violet-100 text-violet-700'
                }`}>
                  <span className="hidden sm:inline">{feriado.nome}</span>
                  <span className="sm:hidden">{feriado.nome.length > 8 ? feriado.nome.slice(0, 8) + '…' : feriado.nome}</span>
                </span>
              )}

              {/* Chips de agendamentos */}
              <div className="mt-auto space-y-0.5 overflow-hidden">
                {agsDia.slice(0, MAX_CHIPS).map((ag) => {
                  const cor = ag.cor || '#4285F4'
                  const hora = ag.data_hora ? format(new Date(ag.data_hora), 'HH:mm') : ''
                  return (
                    <button
                      key={ag.id}
                      onClick={(e) => { e.stopPropagation(); onAgendamentoClick?.(ag) }}
                      className="w-full text-left flex items-center gap-1 rounded px-1 py-0.5 hover:brightness-110 transition-all group"
                      style={{ backgroundColor: `${cor}20` }}
                      title={`${ag.nome_cliente} · ${hora}`}
                    >
                      {/* Mobile: dot only */}
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 sm:hidden" style={{ backgroundColor: cor }} />
                      {/* Desktop: full chip */}
                      <span className="hidden sm:flex items-center gap-1 min-w-0 w-full">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                        <span className="text-[9px] font-semibold text-gray-600 shrink-0">{hora}</span>
                        <span className="text-[9px] text-gray-500 truncate">{ag.nome_cliente}</span>
                      </span>
                    </button>
                  )
                })}
                {excesso > 0 && (
                  <span className="text-[9px] font-semibold text-gray-400 pl-1">+{excesso} mais</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Células vazias após o último dia para completar a grid */}
        {Array.from({ length: totalRows * 7 - totalCells }).map((_, i) => (
          <div key={`trail-${i}`} className="border-b border-r border-gray-50 p-1" />
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
        {[
          { label: 'Feriado nacional', color: 'bg-danger-400' },
          { label: 'Data comemorativa', color: 'bg-violet-400' },
          { label: 'Hoje', color: 'bg-primary-500' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-[10px] text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
