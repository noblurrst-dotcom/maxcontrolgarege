import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import { openCrispChat } from '../lib/crisp'

/**
 * Botão flutuante de suporte. Mantém a identidade visual do A.T.A Gestão
 * e delega ao Crisp ao ser clicado. Esconde-se temporariamente durante
 * scroll para não atrapalhar a leitura.
 */
export default function FloatingHelpButton() {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimer = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => {
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
  }, [])

  const hiddenClasses = isScrolling
    ? 'opacity-0 translate-y-4 pointer-events-none'
    : 'opacity-100 translate-y-0 pointer-events-auto'

  return (
    <button
      onClick={openCrispChat}
      className={`fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 active:scale-95 bg-primary-500 text-on-primary focus-within:opacity-100 focus-within:pointer-events-auto ${hiddenClasses}`}
      aria-label="Abrir suporte"
      title="Suporte"
    >
      <HelpCircle size={22} />
    </button>
  )
}
