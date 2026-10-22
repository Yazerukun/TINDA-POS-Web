import React, { useState, useEffect } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { subscribeToasts, dismissToast, type Toast } from '../../stores/toast'

const KINDS: Record<
  Toast['kind'],
  { icon: React.ComponentType<{ className?: string }>; accent: string; ring: string; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'text-emerald-400',
    ring: 'border-emerald-500/40',
    bg: 'bg-emerald-950/90'
  },
  error: {
    icon: XCircle,
    accent: 'text-rose-400',
    ring: 'border-rose-500/40',
    bg: 'bg-rose-950/90'
  },
  info: {
    icon: Info,
    accent: 'text-sky-400',
    ring: 'border-sky-500/40',
    bg: 'bg-sky-950/90'
  },
  warning: {
    icon: AlertTriangle,
    accent: 'text-amber-400',
    ring: 'border-amber-500/40',
    bg: 'bg-amber-950/90'
  }
}

export function ToastHost(): React.JSX.Element | null {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToasts(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const k = KINDS[t.kind]
        const Icon = k.icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-fade-in ${k.ring} ${k.bg}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${k.accent}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-stone-300 leading-relaxed">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-stone-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
