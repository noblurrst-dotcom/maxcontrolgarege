import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useBreakpoint } from '../../hooks/useBreakpoint'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Max width for desktop modal (default: max-w-lg) */
  maxW?: string
  /** Footer content stickied at bottom (buttons etc.) */
  footer?: ReactNode
}

export default function Sheet({ open, onClose, title, children, maxW = 'max-w-lg', footer }: SheetProps) {
  const { isMobile } = useBreakpoint()
  const contentRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null

  // Mobile: fullscreen sheet rising from bottom
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
        <div className="flex-1 min-h-[4vh]" /> {/* Tap-to-dismiss spacer */}
        <div
          className="bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[96vh] animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div className="shrink-0 px-4 py-3 border-t border-gray-100 safe-area-bottom">
              {footer}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop: centered modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxW} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
