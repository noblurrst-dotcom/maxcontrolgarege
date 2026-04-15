import { useState, useMemo, useCallback } from 'react'
import { startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns'

export type DatePreset = 'mes_atual' | '7_dias' | 'mes_passado' | 'trimestre' | '6_meses' | '1_ano' | 'personalizado'

export const PRESET_LABELS: Record<DatePreset, string> = {
  mes_atual: 'Este mês',
  '7_dias': 'Últimos 7 dias',
  mes_passado: 'Mês passado',
  trimestre: 'Trimestre',
  '6_meses': '6 meses',
  '1_ano': '1 ano',
  personalizado: 'Período',
}

function getPresetRange(preset: DatePreset, customInicio: string, customFim: string): { inicio: Date; fim: Date } {
  const hoje = new Date()
  switch (preset) {
    case 'mes_atual':
      return { inicio: startOfMonth(hoje), fim: hoje }
    case '7_dias':
      return { inicio: subDays(hoje, 6), fim: hoje }
    case 'mes_passado': {
      const mp = subMonths(hoje, 1)
      return { inicio: startOfMonth(mp), fim: endOfMonth(mp) }
    }
    case 'trimestre':
      return { inicio: subMonths(hoje, 3), fim: hoje }
    case '6_meses':
      return { inicio: subMonths(hoje, 6), fim: hoje }
    case '1_ano':
      return { inicio: subMonths(hoje, 12), fim: hoje }
    case 'personalizado':
      return {
        inicio: customInicio ? new Date(customInicio + 'T00:00:00') : startOfMonth(hoje),
        fim: customFim ? new Date(customFim + 'T23:59:59') : hoje,
      }
    default:
      return { inicio: startOfMonth(hoje), fim: hoje }
  }
}

export function useDateRange(defaultPreset: DatePreset = 'mes_atual') {
  const [preset, setPreset] = useState<DatePreset>(defaultPreset)
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')

  const { inicio, fim } = useMemo(
    () => getPresetRange(preset, customInicio, customFim),
    [preset, customInicio, customFim]
  )

  const isInRange = useCallback((dateStr: string): boolean => {
    if (!dateStr) return false
    const day = dateStr.slice(0, 10)
    const startStr = inicio.toISOString().slice(0, 10)
    const endStr = fim.toISOString().slice(0, 10)
    return day >= startStr && day <= endStr
  }, [inicio, fim])

  const periodoLabel = PRESET_LABELS[preset]

  return { preset, setPreset, customInicio, setCustomInicio, customFim, setCustomFim, inicio, fim, isInRange, periodoLabel }
}
