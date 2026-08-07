import { useEffect, useState, useCallback } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error' | 'progress'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
  duration?: number
}

type AddListener = (t: Toast) => void
type RemoveListener = (id: string) => void

const addListeners = new Set<AddListener>()
const removeListeners = new Set<RemoveListener>()

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  info: 4000,
  success: 4500,
  warning: 5000,
  error: 6000,
  progress: 0,
}

export function showToast(
  t: Omit<Toast, 'id' | 'duration'> & { duration?: number }
): string {
  const variant: ToastVariant = t.variant ?? 'info'
  const toast: Toast = {
    ...t,
    id: crypto.randomUUID(),
    variant,
    duration: t.duration ?? DEFAULT_DURATIONS[variant],
  }
  addListeners.forEach((l) => l(toast))
  const dur = toast.duration ?? 0
  if (dur > 0) {
    setTimeout(() => removeListeners.forEach((l) => l(toast.id)), dur)
  }
  return toast.id
}

export function dismissToast(id: string) {
  removeListeners.forEach((l) => l(id))
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((t: Toast) => {
    setToasts((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]))
  }, [])
  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    addListeners.add(add)
    removeListeners.add(remove)
    return () => {
      addListeners.delete(add)
      removeListeners.delete(remove)
    }
  }, [add, remove])

  return toasts
}
