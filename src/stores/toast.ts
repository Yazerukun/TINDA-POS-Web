// File: src/stores/toast.ts
// Lightweight, zero-dependency reactive toast notifications for TINDA POS Web

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

type ToastListener = (toasts: Toast[]) => void

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<ToastListener>()

function notify(): void {
  const current = [...toasts]
  listeners.forEach((fn) => fn(current))
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  listener([...toasts])
  return () => {
    listeners.delete(listener)
  }
}

export function pushToast(t: Omit<Toast, 'id'>, durationMs = 4000): number {
  const id = nextId++
  toasts = [...toasts, { ...t, id }]
  notify()

  if (durationMs > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, durationMs)
  }

  return id
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((x) => x.id !== id)
  notify()
}

export function toastSuccess(title: string, message?: string): void {
  pushToast({ kind: 'success', title, message })
}

export function toastError(title: string, message?: string): void {
  pushToast({ kind: 'error', title, message }, 5000)
}

export function toastInfo(title: string, message?: string): void {
  pushToast({ kind: 'info', title, message })
}

export function toastWarning(title: string, message?: string): void {
  pushToast({ kind: 'warning', title, message }, 4500)
}
