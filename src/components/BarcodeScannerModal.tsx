import React, { useEffect, useRef, useState } from 'react'
import { X, ScanLine, CameraOff } from 'lucide-react'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetect: (code: string) => void
}

const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']

export function BarcodeScannerModal({ open, onClose, onDetect }: BarcodeScannerModalProps): React.JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastCode = useRef<string | null>(null)
  const lastTime = useRef(0)
  const [supported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window
  )
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    if (!supported) {
      setError('Camera barcode scanning is unavailable in this browser. Use a USB / hardware barcode scanner instead.')
      return
    }

    let mounted = true
    let raf = 0

    const makeDetector = () => {
      try {
        return new (window as any).BarcodeDetector({ formats: DETECTOR_FORMATS })
      } catch {
        return new (window as any).BarcodeDetector()
      }
    }

    const start = async () => {
      setStarting(true)
      setError('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setStarting(false)

        const detector = makeDetector()
        const loop = async () => {
          if (!mounted || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              const raw = String(codes[0].rawValue || '').trim()
              const now = Date.now()
              if (raw && (raw !== lastCode.current || now - lastTime.current > 1500)) {
                lastCode.current = raw
                lastTime.current = now
                try {
                  navigator.vibrate?.(80)
                } catch {
                  // ignore
                }
                onDetect(raw)
              }
            }
          } catch {
            // detect frame errors are transient
          }
          if (mounted) raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      } catch {
        if (mounted) {
          setStarting(false)
          setError('Could not access the camera. Check permissions or use a hardware scanner.')
        }
      }
    }

    start()

    return () => {
      mounted = false
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, supported, onDetect])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-obsidian-950/95 backdrop-blur-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/[0.12] text-gold-light border border-gold/30">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm tracking-widest uppercase text-stone-100">
              Barcode Scan
            </h3>
            <p className="font-mono text-[10px] tracking-widest uppercase text-gold-muted">
              Point camera at product code
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="btn-press rounded-xl p-2 text-stone-400 hover:text-stone-100 hover:bg-white/[0.05]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Camera Stage */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {supported ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Scan reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-2xl border-2 border-gold/60 shadow-glow-gold">
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse" />
                <span className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse" />
              </div>
            </div>
            {starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidian-950/70 text-stone-300">
                <div className="h-8 w-8 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
                <p className="font-mono text-[11px] tracking-widest uppercase">Starting camera...</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <CameraOff className="h-10 w-10 text-stone-600" />
            <p className="font-mono text-xs text-stone-400 leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {supported && !error ? (
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-center font-mono text-[10px] tracking-widest uppercase text-stone-500">
            Auto-adds to ticket on successful scan
          </p>
        </div>
      ) : (
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-center font-mono text-[11px] tracking-widest text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}