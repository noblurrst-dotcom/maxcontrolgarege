import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
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
  /**
   * Callback disparado quando um agendamento é arrastado para outra data/hora.
   * Recebe o id, o novo início e o novo fim. Se ausente, drag fica desabilitado.
   */
  onAgendamentoMover?: (id: string, novoInicio: Date, novoFim: Date) => void
  horaFinal?: number
  vendas?: Venda[]
}

const STATUS_LEGENDA = [
  { label: 'Pendente',     color: 'bg-warning-300' },
  { label: 'Confirmado',   color: 'bg-blue-300' },
  { label: 'Em andamento', color: 'bg-primary-400' },
  { label: 'Concluído',    color: 'bg-success-300' },
  { label: 'Cancelado',    color: 'bg-danger-300' },
]

// ── Componente ────────────────────────────────────────────────────────────────
export default function AgendaSemanal({
  diasDaSemana,
  agendamentosDaSemana,
  semanaOffset,
  onSemanaChange,
  onEventoClick,
  onAgendamentoMover,
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

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  // Snap no eixo Y: 15 minutos (ROW_H / 4 = 12px por step).
  const SNAP_MIN = 15
  const SNAP_PX_Y = ROW_H / (60 / SNAP_MIN) // 12
  const DRAG_THRESHOLD_PX = 6

  const gridRef = useRef<HTMLDivElement>(null)

  interface DragState {
    id: string
    mode: 'move' | 'resize'
    startX: number
    startY: number
    curX: number
    curY: number
    origInicio: Date
    origFim: Date
    duracaoMin: number
    origDiaIdx: number
    active: boolean // só vira true após threshold
  }
  const [dragging, setDragging] = useState<DragState | null>(null)

  // Largura de uma coluna de dia (px). Memoizada via leitura do DOM a cada drag.
  const getColWidth = useCallback((): number => {
    const el = gridRef.current
    if (!el) return 0
    // Largura do grid menos a coluna fixa de horas (50px).
    return Math.max(0, (el.clientWidth - 50) / 7)
  }, [])

  /**
   * Calcula o alvo do drop atual (dia + hora) aplicando snap + validação de bordas.
   * Retorna null se o drag não está ativo ou é inválido (ex: agendamento multi-dia).
   */
  const computeTarget = useCallback((d: DragState): { novoInicio: Date; novoFim: Date; diaIdx: number } | null => {
    const dy = d.curY - d.startY
    const minShift = Math.round(dy / SNAP_PX_Y) * SNAP_MIN

    // ── Modo RESIZE: ajusta apenas o fim, mantendo dia e início. ──
    if (d.mode === 'resize') {
      const novoInicio = new Date(d.origInicio.getTime())
      const origFimMin = d.origFim.getHours() * 60 + d.origFim.getMinutes()
      const inicioMin = d.origInicio.getHours() * 60 + d.origInicio.getMinutes()
      // Nova duração em minutos: mínimo SNAP_MIN, máximo até horaFinal.
      const novoFimMin = Math.max(
        inicioMin + SNAP_MIN,
        Math.min(horaFinal * 60, origFimMin + minShift)
      )
      const novoFim = new Date(d.origInicio)
      novoFim.setHours(Math.floor(novoFimMin / 60), novoFimMin % 60, 0, 0)
      return { novoInicio, novoFim, diaIdx: d.origDiaIdx }
    }

    // ── Modo MOVE: deslocamento em X (dia) + Y (hora). ──
    const colWidth = getColWidth()
    if (colWidth <= 0) return null
    const dx = d.curX - d.startX
    const colShift = Math.round(dx / colWidth)
    const novaColIdx = Math.max(0, Math.min(6, d.origDiaIdx + colShift))

    const origHoraMin = d.origInicio.getHours() * 60 + d.origInicio.getMinutes()
    const novaHoraMin = origHoraMin + minShift
    const minHoraMin = HORA_INICIO * 60
    const maxHoraMin = horaFinal * 60 - d.duracaoMin
    if (maxHoraMin < minHoraMin) return null
    const clamped = Math.max(minHoraMin, Math.min(maxHoraMin, novaHoraMin))

    const diaBase = diasDaSemana[novaColIdx]
    if (!diaBase) return null
    const novoInicio = new Date(diaBase)
    novoInicio.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0)
    const novoFim = new Date(novoInicio.getTime() + d.duracaoMin * 60000)

    return { novoInicio, novoFim, diaIdx: novaColIdx }
  }, [diasDaSemana, getColWidth, horaFinal, HORA_INICIO, SNAP_PX_Y])

  // Alvo corrente do drag ativo (memoizado via dragging state) — usado pelo ghost.
  const dragTarget = useMemo(
    () => (dragging && dragging.active ? computeTarget(dragging) : null),
    [dragging, computeTarget]
  )

  // ── Handlers de pointer no card ─────────────────────────────────────────────
  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    ag: Agendamento,
    mode: 'move' | 'resize'
  ) => {
    if (!onAgendamentoMover) return
    if (ag.status === 'cancelado') return
    const inicio = new Date(ag.data_hora)
    const durMin = ag.duracao_min || 60
    const fim = ag.data_hora_fim ? new Date(ag.data_hora_fim) : new Date(inicio.getTime() + durMin * 60000)
    if (inicio.toDateString() !== fim.toDateString()) return

    const origDiaIdx = diasDaSemana.findIndex(d => d.toDateString() === inicio.toDateString())
    if (origDiaIdx < 0) return

    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging({
      id: ag.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      origInicio: inicio,
      origFim: fim,
      duracaoMin: Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000)),
      origDiaIdx,
      active: false,
    })
  }

  const onPointerDownEvento = (e: React.PointerEvent<HTMLDivElement>, ag: Agendamento) =>
    startDrag(e, ag, 'move')

  const onPointerDownResize = (e: React.PointerEvent<HTMLDivElement>, ag: Agendamento) =>
    startDrag(e, ag, 'resize')

  const onPointerMoveEvento = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const dx = e.clientX - dragging.startX
    const dy = e.clientY - dragging.startY
    if (!dragging.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        // Atualiza só cur para caso passe do threshold no próximo move.
        setDragging(d => d ? { ...d, curX: e.clientX, curY: e.clientY } : null)
        return
      }
      // Ativa modo drag.
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate?.(15) } catch { /* silenciar */ }
      }
      setDragging(d => d ? { ...d, active: true, curX: e.clientX, curY: e.clientY } : null)
      return
    }
    setDragging(d => d ? { ...d, curX: e.clientX, curY: e.clientY } : null)
  }

  const onPointerUpEvento = (e: React.PointerEvent<HTMLDivElement>, ag: Agendamento) => {
    if (!dragging) return
    const d = dragging
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch { /* ignore */ }

    if (!d.active) {
      // Foi click curto — dispara onEventoClick manualmente (não usamos onClick
      // nativo pra evitar que um drag acidental dispare click ao soltar).
      setDragging(null)
      onEventoClick?.(ag)
      return
    }

    const target = computeTarget(d)
    setDragging(null)
    if (!target) return

    // Se não houve mudança efetiva (mesmo início E mesmo fim), não chama o callback.
    const semMudanca =
      target.novoInicio.getTime() === d.origInicio.getTime() &&
      target.novoFim.getTime() === d.origFim.getTime()
    if (semMudanca) return

    onAgendamentoMover?.(d.id, target.novoInicio, target.novoFim)
  }

  const onPointerCancelEvento = () => {
    setDragging(null)
  }

  // Cancelar drag com Escape.
  useEffect(() => {
    if (!dragging) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDragging(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dragging])

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
          <div className="min-w-full sm:min-w-[640px] flex-1 min-h-0 flex flex-col">

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
                        ? 'w-8 h-8 mx-auto bg-primary-500 text-on-primary rounded-full flex items-center justify-center'
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
                ref={gridRef}
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
                {diasDaSemana.map((dia, diaIdx) => {
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

                  const ghost = dragTarget && dragTarget.diaIdx === diaIdx && dragging ? {
                    top: ((dragTarget.novoInicio.getHours() + dragTarget.novoInicio.getMinutes() / 60) - HORA_INICIO) * ROW_H,
                    height: (dragging.duracaoMin / 60) * ROW_H,
                    label: `${format(dragTarget.novoInicio, 'HH:mm')} → ${format(dragTarget.novoFim, 'HH:mm')}`,
                  } : null

                  return (
                    <div
                      key={dia.toISOString()}
                      className={`relative ${ehHoje ? 'bg-primary-50/30' : ''}`}
                    >
                      {/* Grid lines */}
                      {Array.from({ length: TOTAL_HORAS }, (_, i) => (
                        <div key={i} className="border-t border-l border-gray-100" style={{ height: ROW_H }} />
                      ))}

                      {/* Ghost de destino durante drag */}
                      {ghost && (
                        <div
                          className="absolute pointer-events-none rounded-lg border-2 border-dashed border-primary-500 bg-primary-500/10"
                          style={{
                            top: ghost.top,
                            height: ghost.height,
                            left: '2%',
                            right: '2%',
                            zIndex: 50,
                          }}
                        >
                          <span className="absolute top-1 left-2 text-[10px] font-bold text-primary-700 bg-white/85 px-1.5 py-0.5 rounded shadow-sm">
                            {ghost.label}
                          </span>
                        </div>
                      )}

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
                        const ehArrastavel = !!onAgendamentoMover && !ehCancelado
                        const estaArrastando = dragging?.id === ag.id && dragging.active
                        const outroArrastando = !!dragging?.active && dragging?.id !== ag.id
                        const ehResize = estaArrastando && dragging!.mode === 'resize'
                        const ehMove = estaArrastando && dragging!.mode === 'move'
                        const translateX = ehMove ? dragging!.curX - dragging!.startX : 0
                        const translateY = ehMove ? dragging!.curY - dragging!.startY : 0
                        // Durante resize: a altura segue o ponteiro (sem snap visual
                        // — o snap aparece no ghost). Soltura comita com snap.
                        const heightAjustado = ehResize
                          ? Math.max(ROW_H * 0.25, layout.height + (dragging!.curY - dragging!.startY))
                          : layout.height
                        return (
                          <div
                            key={ag.id}
                            title={`${ag.nome_cliente}${ag.servico ? ' • ' + ag.servico : ''}${ag.valor ? ' • ' + fmt(ag.valor) : ''}`}
                            onPointerDown={ehArrastavel ? (e) => onPointerDownEvento(e, ag) : undefined}
                            onPointerMove={ehArrastavel ? onPointerMoveEvento : undefined}
                            onPointerUp={ehArrastavel ? (e) => onPointerUpEvento(e, ag) : (onEventoClick ? () => onEventoClick(ag) : undefined)}
                            onPointerCancel={ehArrastavel ? onPointerCancelEvento : undefined}
                            onMouseEnter={(e) => {
                              if (ehCancelado || estaArrastando || outroArrastando) return
                              const el = e.currentTarget as HTMLElement
                              el.style.filter = 'brightness(1.12)'
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLElement
                              el.style.filter = ''
                            }}
                            className="absolute"
                            style={{
                              top: layout.top,
                              height: heightAjustado,
                              left: layout.left,
                              width: layout.width,
                              zIndex: estaArrastando ? 100 : layout.zIndex,
                              background: ehCancelado
                                ? 'repeating-linear-gradient(45deg, rgba(120,120,120,0.25) 0px, rgba(120,120,120,0.25) 2px, rgba(80,80,80,0.15) 2px, rgba(80,80,80,0.15) 10px)'
                                : gerarGradienteEvento(eventColor),
                              boxShadow: estaArrastando
                                ? '0 10px 28px rgba(0,0,0,0.38)'
                                : (ehCancelado ? 'none' : gerarSombraEvento(eventColor)),
                              border: ehCancelado ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 10,
                              overflow: 'hidden',
                              cursor: ehCancelado
                                ? 'default'
                                : (ehResize ? 'ns-resize' : (ehMove ? 'grabbing' : (ehArrastavel ? 'grab' : (onEventoClick ? 'pointer' : 'default')))),
                              opacity: estaArrastando ? 0.88 : (outroArrastando ? 0.55 : (ehCancelado ? 0.45 : 1)),
                              transform: ehMove ? `translate(${translateX}px, ${translateY}px)` : undefined,
                              transition: estaArrastando ? 'none' : 'filter 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
                              touchAction: ehArrastavel ? 'none' : undefined,
                              userSelect: 'none',
                            }}
                          >
                            {/* Alça de resize — borda inferior do card */}
                            {ehArrastavel && (
                              <div
                                onPointerDown={(e) => onPointerDownResize(e, ag)}
                                onPointerMove={onPointerMoveEvento}
                                onPointerUp={(e) => onPointerUpEvento(e, ag)}
                                onPointerCancel={onPointerCancelEvento}
                                title="Arraste para alterar a duração"
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: 8,
                                  cursor: 'ns-resize',
                                  zIndex: 2,
                                  touchAction: 'none',
                                }}
                              >
                                {/* Indicador visual sutil (3 risquinhos) */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: 2,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 18,
                                  height: 2,
                                  borderTop: '2px solid rgba(255,255,255,0.45)',
                                  borderBottom: '2px solid rgba(255,255,255,0.45)',
                                  paddingTop: 1,
                                  pointerEvents: 'none',
                                }} />
                              </div>
                            )}
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
