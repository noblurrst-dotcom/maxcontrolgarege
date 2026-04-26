import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmt } from '../lib/utils'
import type { Agendamento, Venda } from '../types'

// ── Funções de estilo dos eventos ─────────────────────────────────────────────
function gerarGradienteEvento(cor: string): string {
  const hex = cor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const dk = (v: number, p: number) => Math.max(0, Math.round(v * (1 - p)))
  return `linear-gradient(150deg, ${cor} 0%, rgb(${dk(r,.35)},${dk(g,.35)},${dk(b,.35)}) 55%, rgb(${dk(r,.55)},${dk(g,.55)},${dk(b,.55)}) 100%)`
}

function gerarSombraEvento(cor: string): string {
  const hex = cor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `0 4px 16px rgba(${r},${g},${b},0.35), inset 0 1px 0 rgba(255,255,255,0.18)`
}

interface EventLayout { top: number; height: number; left: string; width: string; zIndex: number }

function calcularLayoutEventos(
  eventos: Array<{ inicio: number; fim: number; id: string }>,
  ROW_H: number,
  HORA_INICIO: number
): Map<string, EventLayout> {
  const result = new Map<string, EventLayout>()
  const sorted = [...eventos].sort((a, b) => a.inicio - b.inicio)
  const clusters: Array<typeof sorted> = []
  let cur: typeof sorted = []
  for (const ev of sorted) {
    if (cur.length === 0) { cur.push(ev); continue }
    const colide = cur.some(c => ev.inicio < c.fim && ev.fim > c.inicio)
    if (colide) { cur.push(ev) } else { clusters.push(cur); cur = [ev] }
  }
  if (cur.length > 0) clusters.push(cur)
  for (const cluster of clusters) {
    const n = cluster.length
    cluster.forEach((ev, colIdx) => {
      const top = Math.max((ev.inicio - HORA_INICIO) * ROW_H, 0)
      const height = Math.max((ev.fim - ev.inicio) * ROW_H, ROW_H * 0.5)
      const colWidth = n === 1 ? 100 : Math.min(80, 100 / n + 15)
      const colLeft = n === 1 ? 0 : (colIdx * (100 - colWidth)) / Math.max(n - 1, 1)
      result.set(ev.id, { top, height, left: `${colLeft}%`, width: `${colWidth}%`, zIndex: 10 + colIdx })
    })
  }
  return result
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AgendaSemanalProps {
  diasDaSemana: Date[]
  agendamentosDaSemana: Agendamento[]
  semanaOffset: number
  onSemanaChange: (offset: number) => void
  onEventoClick?: (ag: Agendamento) => void
  horaFinal?: number
  vendas?: Venda[]
}

const STATUS_LEGENDA = [
  { label: 'Pendente',     color: 'bg-amber-300' },
  { label: 'Confirmado',   color: 'bg-blue-300' },
  { label: 'Em andamento', color: 'bg-primary-400' },
  { label: 'Concluído',    color: 'bg-emerald-300' },
  { label: 'Cancelado',    color: 'bg-red-300' },
]

// ── Componente ────────────────────────────────────────────────────────────────
export default function AgendaSemanal({
  diasDaSemana,
  agendamentosDaSemana,
  semanaOffset,
  onSemanaChange,
  onEventoClick,
  horaFinal = 18,
  vendas = [],
}: AgendaSemanalProps) {
  // Mapa venda_id → venda para lookup rápido
  const vendaMap = new Map(vendas.map(v => [v.id, v]))
  const ROW_H = 48
  const HORA_INICIO = 7
  const TOTAL_HORAS = Math.max(horaFinal - HORA_INICIO, 4)
  const BIZ_START = 8
  const BIZ_END = 18
  const DEFAULT_COLOR = '#4285F4'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-base font-bold text-gray-900">Agenda semanal</h3>
          <p className="text-[11px] text-gray-400">
            {format(diasDaSemana[0], "d MMM", { locale: ptBR })} — {format(diasDaSemana[6], "d MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSemanaChange(semanaOffset - 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => onSemanaChange(0)}
            className="px-2.5 py-1 text-[11px] font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => onSemanaChange(semanaOffset + 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:-mx-5 px-3 sm:px-5 flex-1 min-h-0 flex flex-col">
          <div className="min-w-[640px] flex-1 min-h-0 flex flex-col">

            {/* Header dos dias */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100 pb-2 shrink-0">
              <div />
              {diasDaSemana.map((dia) => {
                const ehHoje = isToday(dia)
                return (
                  <div key={dia.toISOString()} className="text-center">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${ehHoje ? 'text-primary-600' : 'text-gray-400'}`}>
                      {format(dia, 'EEE', { locale: ptBR })}
                    </p>
                    <div className={`text-lg font-bold mt-0.5 leading-none ${
                      ehHoje
                        ? 'w-8 h-8 mx-auto bg-primary-500 text-white rounded-full flex items-center justify-center'
                        : 'text-gray-700 text-center'
                    }`}>
                      {format(dia, 'd')}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time slots */}
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <div
                className="grid grid-cols-[50px_repeat(7,1fr)]"
                style={{ minHeight: ROW_H * TOTAL_HORAS }}
              >
                {/* Coluna de horários */}
                <div className="relative">
                  {Array.from({ length: TOTAL_HORAS }, (_, i) => i + HORA_INICIO).map((hora) => (
                    <div
                      key={hora}
                      className="text-[10px] font-medium text-gray-400 pr-2 text-right -mt-1.5 select-none"
                      style={{ height: ROW_H, paddingTop: 2 }}
                    >
                      {`${String(hora).padStart(2, '0')}:00`}
                    </div>
                  ))}
                </div>

                {/* Colunas dos dias */}
                {diasDaSemana.map((dia) => {
                  const dStr = format(dia, 'yyyy-MM-dd')
                  const ehHoje = isToday(dia)
                  const diaStart = new Date(`${dStr}T00:00:00`)
                  const diaEnd = new Date(diaStart.getTime() + 86400000)

                  const eventsDia = agendamentosDaSemana.filter((a) => {
                    const ini = new Date(a.data_hora)
                    const durM = a.duracao_min || 60
                    const fim = a.data_hora_fim
                      ? new Date(a.data_hora_fim)
                      : new Date(ini.getTime() + durM * 60000)
                    return ini < diaEnd && fim > diaStart
                  })

                  const eventosComTempo = eventsDia.map(ag => {
                    const inicio = new Date(ag.data_hora)
                    const durMin = ag.duracao_min || 60
                    const fim = ag.data_hora_fim
                      ? new Date(ag.data_hora_fim)
                      : new Date(inicio.getTime() + durMin * 60000)
                    const isMultiDay = inicio.toDateString() !== fim.toDateString()
                    const isFirstDay = inicio.toDateString() === diaStart.toDateString()
                    const isLastDay = fim.toDateString() === diaStart.toDateString()
                    let effStart: number, effEnd: number
                    if (!isMultiDay) {
                      effStart = inicio.getHours() + inicio.getMinutes() / 60
                      effEnd = fim.getHours() + fim.getMinutes() / 60
                    } else if (isFirstDay) {
                      effStart = inicio.getHours() + inicio.getMinutes() / 60
                      effEnd = BIZ_END
                    } else if (isLastDay) {
                      effStart = BIZ_START
                      effEnd = fim.getHours() + fim.getMinutes() / 60
                    } else {
                      effStart = BIZ_START
                      effEnd = BIZ_END
                    }
                    return { id: ag.id, inicio: effStart, fim: effEnd }
                  })

                  const layouts = calcularLayoutEventos(eventosComTempo, ROW_H, HORA_INICIO)

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`relative ${ehHoje ? 'bg-primary-50/30' : ''}`}
                    >
                      {/* Grid lines */}
                      {Array.from({ length: TOTAL_HORAS }, (_, i) => (
                        <div key={i} className="border-t border-l border-gray-100" style={{ height: ROW_H }} />
                      ))}

                      {/* Linha de hora atual */}
                      {ehHoje && (() => {
                        const agora = new Date()
                        const horaAtual = agora.getHours() + agora.getMinutes() / 60
                        if (horaAtual < HORA_INICIO || horaAtual > HORA_INICIO + TOTAL_HORAS) return null
                        const topAtual = (horaAtual - HORA_INICIO) * ROW_H
                        return (
                          <div style={{
                            position: 'absolute', top: topAtual,
                            left: 0, right: 0, height: 2,
                            background: '#ef4444', zIndex: 40,
                            pointerEvents: 'none', borderRadius: 1,
                          }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: '#ef4444', position: 'absolute',
                              left: -4, top: -3,
                              boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                            }} />
                          </div>
                        )
                      })()}

                      {/* Eventos */}
                      {eventsDia.map((ag) => {
                        const layout = layouts.get(ag.id)
                        if (!layout) return null
                        const eventColor = ag.cor || DEFAULT_COLOR
                        const ehCancelado = ag.status === 'cancelado'
                        return (
                          <div
                            key={ag.id}
                            title={`${ag.nome_cliente}${ag.servico ? ' • ' + ag.servico : ''}${ag.valor ? ' • ' + fmt(ag.valor) : ''}`}
                            onClick={onEventoClick ? () => onEventoClick(ag) : undefined}
                            onMouseEnter={(e) => {
                              if (ehCancelado) return
                              const el = e.currentTarget as HTMLElement
                              el.style.filter = 'brightness(1.12)'
                              el.style.transform = 'scale(1.015)'
                              el.style.boxShadow = gerarSombraEvento(eventColor).replace('0.35', '0.55')
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLElement
                              el.style.filter = ''
                              el.style.transform = ''
                              el.style.boxShadow = ehCancelado ? 'none' : gerarSombraEvento(eventColor)
                            }}
                            className="absolute"
                            style={{
                              top: layout.top,
                              height: layout.height,
                              left: layout.left,
                              width: layout.width,
                              zIndex: layout.zIndex,
                              background: ehCancelado
                                ? 'repeating-linear-gradient(45deg, rgba(120,120,120,0.25) 0px, rgba(120,120,120,0.25) 2px, rgba(80,80,80,0.15) 2px, rgba(80,80,80,0.15) 10px)'
                                : gerarGradienteEvento(eventColor),
                              boxShadow: ehCancelado ? 'none' : gerarSombraEvento(eventColor),
                              border: ehCancelado ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 10,
                              overflow: 'hidden',
                              cursor: onEventoClick ? 'pointer' : 'default',
                              opacity: ehCancelado ? 0.45 : 1,
                              transition: 'filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                          >
                            <div style={{ padding: '5px 7px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <p style={{
                                fontSize: 10, fontWeight: 700,
                                color: ehCancelado ? 'rgba(255,255,255,0.5)' : 'white',
                                lineHeight: 1.3, margin: 0,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                textShadow: ehCancelado ? 'none' : '0 1px 2px rgba(0,0,0,0.25)',
                              }}>
                                {ag.nome_cliente || 'Agendamento'}
                              </p>
                              <p style={{
                                fontSize: 9,
                                color: ehCancelado ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.82)',
                                margin: '1px 0 0', lineHeight: 1.2,
                              }}>
                                {format(new Date(ag.data_hora), 'HH:mm')}
                                {ag.data_hora_fim ? ` – ${format(new Date(ag.data_hora_fim), 'HH:mm')}` : ''}
                              </p>
                              {layout.height > 52 && ag.servico && (
                                <p style={{
                                  fontSize: 9,
                                  color: ehCancelado ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
                                  margin: '3px 0 0', lineHeight: 1.2,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  fontStyle: 'italic',
                                }}>
                                  {ag.servico}
                                </p>
                              )}
                              {/* Badge de pagamento */}
                              {(() => {
                                if (ehCancelado) return null
                                const venda = ag.venda_id ? vendaMap.get(ag.venda_id) : undefined
                                const sp = venda?.status_pagamento
                                if (ag.status === 'concluido' && !venda) {
                                  return <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 8, fontWeight: 800, color: '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>$</span>
                                }
                                if (sp === 'pendente' || sp === 'parcial') {
                                  return <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 8, fontWeight: 800, color: sp === 'pendente' ? '#fbbf24' : '#60a5fa', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{sp === 'pendente' ? '$' : '½'}</span>
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda — sempre no rodapé */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 shrink-0">
        {STATUS_LEGENDA.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-[10px] text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
