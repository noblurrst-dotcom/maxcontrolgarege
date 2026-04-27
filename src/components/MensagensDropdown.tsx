import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

interface Mensagem {
  id: string
  assunto: string
  corpo: string
  lida: boolean
  created_at: string
}

export default function MensagensDropdown() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Mensagem | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const naoLidas = mensagens.filter(m => !m.lida).length

  const carregar = async () => {
    try {
      const { data, error } = await supabase.rpc('get_minhas_mensagens')
      if (error) throw error
      setMensagens((data as Mensagem[]) || [])
    } catch {
      // Silently fail
    }
  }

  useEffect(() => { carregar() }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSelected(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const marcarLida = async (msg: Mensagem) => {
    if (msg.lida) return
    try {
      await supabase.rpc('marcar_mensagem_lida', { p_id: msg.id })
      setMensagens(prev => prev.map(m => m.id === msg.id ? { ...m, lida: true } : m))
    } catch {
      // Silently fail
    }
  }

  const handleSelect = (msg: Mensagem) => {
    setSelected(msg)
    marcarLida(msg)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setSelected(null) }}
        className="relative p-2.5 text-white/60 hover:text-white transition-colors"
      >
        <Bell size={22} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Mensagens</h3>
            {naoLidas > 0 && (
              <span className="text-[10px] font-bold text-danger-500 bg-danger-50 px-2 py-0.5 rounded-full">{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>
            )}
          </div>

          {selected ? (
            // Detail view
            <div className="flex-1 overflow-y-auto p-4">
              <button onClick={() => setSelected(null)} className="text-[10px] text-gray-400 hover:text-gray-600 mb-2">← Voltar</button>
              <h4 className="text-sm font-bold text-gray-900">{selected.assunto}</h4>
              <p className="text-[10px] text-gray-400 mt-1">
                {format(new Date(selected.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
              <div className="mt-3 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selected.corpo}</div>
            </div>
          ) : (
            // List view
            <div className="flex-1 overflow-y-auto">
              {mensagens.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma mensagem</p>
              ) : (
                mensagens.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!m.lida ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!m.lida && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${!m.lida ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{m.assunto}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.corpo}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{format(new Date(m.created_at), 'dd/MM HH:mm')}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
