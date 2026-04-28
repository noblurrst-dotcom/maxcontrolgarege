import { useState, useEffect, useRef } from 'react'
import { HelpCircle, X, Send } from 'lucide-react'

export default function FloatingHelpButton() {
  const [open, setOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimer = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (open) return
      setIsScrolling(true)
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current)
      scrollTimer.current = window.setTimeout(() => {
        setIsScrolling(false)
      }, 250)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current)
    }
  }, [open])

  const hiddenClasses = isScrolling && !open
    ? 'opacity-0 translate-y-4 pointer-events-none'
    : 'opacity-100 translate-y-0 pointer-events-auto'

  return (
    <>
      {/* Chat placeholder panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-secondary-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-500">
                <HelpCircle size={16} className="text-on-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-secondary">Suporte</p>
                <p className="text-[10px] text-on-secondary opacity-70">Estamos aqui para ajudar</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-on-secondary opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat body — placeholder */}
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-3">
              <HelpCircle size={24} className="text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Chat em breve!</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Estamos preparando nosso canal de atendimento. Em breve você poderá conversar com nossa equipe aqui.
            </p>
          </div>

          {/* Input — placeholder disabled */}
          <div className="border-t border-gray-100 p-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              disabled
              className="flex-1 px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
            />
            <button
              disabled
              className="p-2 rounded-xl opacity-40 cursor-not-allowed bg-primary-500"
            >
              <Send size={16} className="text-on-primary" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 active:scale-95 bg-primary-500 text-on-primary focus-within:opacity-100 focus-within:pointer-events-auto ${hiddenClasses}`}
        aria-label="Abrir suporte"
      >
        {open ? <X size={22} /> : <HelpCircle size={22} />}
      </button>
    </>
  )
}
