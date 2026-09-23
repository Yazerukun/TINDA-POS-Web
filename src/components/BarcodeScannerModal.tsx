import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, ScanLine, CameraOff, Loader2 } from 'lucide-react'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetect: (code: string) => void
}

// Formats supported by native BarcodeDetector
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']

// Check for native BarcodeDetector API (Chrome/Edge 88+)
const hasNativeBarcodeDetector = (): boolean =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window

export function BarcodeScannerModal({ open, onClose, onDetect }: BarcodeScannerModalProps): React.JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastCode = useRef<string | null>(null)
  const lastTime = useRef(0)
  const mountedRef = useRef(false)

  const [mode] = useState<'native' | 'zxing' | 'unsupported'>(() => {
    if (typeof window === 'undefined') return 'unsupported'
    if (hasNativeBarcodeDetector()) return 'native'
    // ZXing works in any browser with camera support
    return 'zxing'
  })

  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  // Emit a detected code with debounce (1.5s same-code cooldown)
  const emit = useCallback((raw: string) => {
    const now = Date.now()
    if (!raw) return
    if (raw === lastCode.current && now - lastTime.current < 1500) return
    lastCode.current = raw
    lastTime.current = now
    try { navigator.vibrate?.(80) } catch { /* ignore */ }
    onDetect(raw)
  }, [onDetect])

  useEffect(() => {
    if (!open) return

    if (mode === 'unsupported') {
      setError('Barcode scanning is not supported in this browser. Use a USB/Bluetooth barcode scanner instead.')
      return
    }

    mountedRef.current = true
    let raf = 0

    const start = async () => {
      setStarting(true)
      setError('')

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })

        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStarting(false)

        if (mode === 'native') {
          // ── Native BarcodeDetector (Chrome/Edge) ──────────────────────────
          let detector: any
          try {
            detector = new (window as any).BarcodeDetector({ formats: NATIVE_FORMATS })
          } catch {
            detector = new (window as any).BarcodeDetector()
          }

          const loop = async () => {
            if (!mountedRef.current || !videoRef.current) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes?.length > 0) {
                emit(String(codes[0].rawValue || '').trim())
              }
            } catch { /* transient frame errors */ }
            if (mountedRef.current) raf = requestAnimationFrame(loop)
          }
          raf = requestAnimationFrame(loop)

        } else {
          // ── ZXing fallback (Firefox, Safari, all other browsers) ───────────
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()

          const loop = async () => {
            if (!mountedRef.current || !videoRef.current || !canvasRef.current) return
            const video = videoRef.current
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx || video.readyState < video.HAVE_ENOUGH_DATA) {
              if (mountedRef.current) raf = requestAnimationFrame(loop)
              return
            }
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            try {
              const result = await reader.decodeFromCanvas(canvas)
              if (result?.getText()) {
                emit(result.getText().trim())
              }
            } catch { /* NotFoundException is normal — no barcode in frame */ }
            if (mountedRef.current) raf = requestAnimationFrame(loop)
          }
          raf = requestAnimationFrame(loop)
        }

      } catch (err: any) {
        if (!mountedRef.current) return
        setStarting(false)
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Allow camera access in your browser settings, then try again.')
        } else if (err?.name === 'NotFoundError') {
          setError('No camera found. Plug in a camera or use a USB/Bluetooth barcode scanner instead.')
        } else {
          setError('Could not access the camera. Check browser permissions and try again.')
        }
      }
    }

    start()

    return () => {
      mountedRef.current = false
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, mode, emit])

  if (!open) return null

  const isSupported = mode !== 'unsupported'

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
              {mode === 'native' ? 'Native scanner · Chrome/Edge' : mode === 'zxing' ? 'Universal scanner · All browsers' : 'Hardware scanner required'}
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
        {isSupported && !error ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Hidden canvas for ZXing fallback */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-2xl border-2 border-gold/60 shadow-glow-gold">
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse" />
                <span className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse" />
              </div>
            </div>

            {starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidian-950/70 text-stone-300">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="font-mono text-[11px] tracking-widest uppercase">Starting camera…</p>
              </div>
            )}
          </>
        ) : (
          /* Error or unsupported state */
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <CameraOff className="h-10 w-10 text-stone-600" />
            <p className="font-mono text-xs text-stone-400 leading-relaxed max-w-xs">
              {error || 'Camera barcode scanning is not available in this browser.'}
            </p>
            {error && (
              <button
                onClick={() => {
                  setError('')
                  // re-trigger effect by remounting isn't possible here, but
                  // user can close and reopen after granting permission
                }}
                className="font-mono text-[10px] tracking-widest uppercase text-gold-muted border border-gold/30 rounded-lg px-4 py-2 hover:bg-gold/10 transition-colors"
              >
                Close & try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        {!error && isSupported ? (
          <p className="text-center font-mono text-[10px] tracking-widest uppercase text-stone-500">
            Auto-adds to ticket on successful scan · USB/Bluetooth scanners also work
          </p>
        ) : (
          <p className="text-center font-mono text-[11px] tracking-widest text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}