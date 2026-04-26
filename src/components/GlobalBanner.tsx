import { useState, useEffect, useRef } from 'react'
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Banner {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'aviso' | 'critico'
}

const CACHE_TTL = 5 * 60 * 1000 // 5min

const TIPO_STYLE: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
  aviso: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle },
  critico: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertCircle },
}

export default function GlobalBanner() {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const cacheRef = useRef<{ data: Banner | null; ts: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const carregar = async () => {
      // Check cache
      if (cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
        setBanner(cacheRef.current.data)
        return
      }

      try {
        const { data, error } = await supabase.rpc('get_banner_ativo')
        if (cancelled) return
        if (error) throw error
        const b = data as Banner | null
        setBanner(b)
        cacheRef.current = { data: b, ts: Date.now() }
      } catch {
        // Silently fail — banner is non-critical
      }
    }
    carregar()
    return () => { cancelled = true }
  }, [])

  // Check sessionStorage for dismiss
  useEffect(() => {
    const d = sessionStorage.getItem('banner_dismissed')
    if (d) setDismissed(d)
  }, [])

  if (!banner || dismissed === banner.id) return null

  const style = TIPO_STYLE[banner.tipo] || TIPO_STYLE.info
  const Icon = style.icon

  const handleDismiss = () => {
    sessionStorage.setItem('banner_dismissed', banner.id)
    setDismissed(banner.id)
  }

  return (
    <div className={`${style.bg} ${style.border} border-b px-4 py-2.5 flex items-center gap-3`}>
      <Icon size={16} className={style.text + ' shrink-0'} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-bold ${style.text}`}>{banner.titulo}</span>
        {banner.mensagem && (
          <span className={`text-xs ${style.text} opacity-80 ml-2`}>{banner.mensagem}</span>
        )}
      </div>
      <button onClick={handleDismiss} className={`p-1 ${style.text} opacity-50 hover:opacity-100 shrink-0`}>
        <X size={14} />
      </button>
    </div>
  )
}
