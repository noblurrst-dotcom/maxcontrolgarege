import { Calendar } from 'lucide-react'
import type { DatePreset } from '../hooks/useDateRange'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'mes_atual', label: 'Este mês' },
  { value: '7_dias', label: '7 dias' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: '6_meses', label: '6 meses' },
  { value: '1_ano', label: '1 ano' },
  { value: 'personalizado', label: 'Personalizado' },
]

interface Props {
  preset: DatePreset
  onChange: (v: DatePreset) => void
  customInicio: string
  customFim: string
  onCustomInicioChange: (v: string) => void
  onCustomFimChange: (v: string) => void
}

export default function DateRangeFilter({ preset, onChange, customInicio, customFim, onCustomInicioChange, onCustomFimChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            preset === p.value
              ? 'bg-primary-500 text-dark-900 shadow-sm'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          {p.value === 'personalizado' && <Calendar size={10} />}
          {p.label}
        </button>
      ))}
      {preset === 'personalizado' && (
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <input
            type="date"
            value={customInicio}
            onChange={e => onCustomInicioChange(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={customFim}
            onChange={e => onCustomFimChange(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          />
        </div>
      )}
    </div>
  )
}
