import { useState } from 'react'
import { HelpCircle, X, Send } from 'lucide-react'
import { useBrand } from '../contexts/BrandContext'

export default function FloatingHelpButton() {
  const { brand } = useBrand()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Chat placeholder panel */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[60] w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: brand.cor_secundaria }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: brand.cor_primaria }}>
                <HelpCircle size={16} style={{ color: brand.cor_secundaria }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Suporte</p>
                <p className="text-[10px] text-gray-400">Estamos aqui para ajudar</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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
              className="p-2 rounded-xl opacity-40 cursor-not-allowed"
              style={{ backgroundColor: brand.cor_primaria }}
            >
              <Send size={16} style={{ color: brand.cor_secundaria }} />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ backgroundColor: brand.cor_primaria }}
        title="Ajuda"
      >
        {open ? (
          <X size={22} style={{ color: brand.cor_secundaria }} />
        ) : (
          <HelpCircle size={22} style={{ color: brand.cor_secundaria }} />
        )}
      </button>
    </>
  )
}
