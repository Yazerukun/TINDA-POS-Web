import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
  footer?: React.ReactNode
  zIndex?: string
  headerExtra?: React.ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  footer,
  zIndex = 'z-50',
  headerExtra
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/80 p-2 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm animate-fade-in`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`flex max-h-[94vh] sm:max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-ink-900 shadow-2xl ${maxWidth}`}
      >
        {(title || headerExtra) && (
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-ink-850">
            <div className="flex items-center gap-3">
              {title && <h2 className="text-base font-bold text-white tracking-wide">{title}</h2>}
              {headerExtra}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
              title="Close (Escape)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-white/[0.08] bg-ink-950/60 px-5 py-3.5 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
