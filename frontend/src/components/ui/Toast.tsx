import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { CheckCircle, Info, X, AlertTriangle, Loader2 } from 'lucide-react'
import { useToastState, dismissToast } from './toast'
import type { ToastVariant } from './toast'
import type { ReactElement } from 'react'

export type { ToastVariant }

interface ToasterProps {
  position?: 'top-right' | 'bottom-right'
  className?: string
}

const variantClasses: Record<
  'info' | 'success' | 'warning' | 'error' | 'progress',
  { icon: ReactElement; border: string; fill: string; text: string }
> = {
  info: {
    icon: <Info size={16} />,
    border: 'border-indigo-500/30',
    fill: 'bg-indigo-500/15',
    text: 'text-indigo-200',
  },
  success: {
    icon: <CheckCircle size={16} />,
    border: 'border-emerald-500/30',
    fill: 'bg-emerald-500/15',
    text: 'text-emerald-200',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    border: 'border-amber-500/30',
    fill: 'bg-amber-500/15',
    text: 'text-amber-200',
  },
  error: {
    icon: <X size={16} />,
    border: 'border-red-500/30',
    fill: 'bg-red-500/15',
    text: 'text-red-200',
  },
  progress: {
    icon: <Loader2 size={16} className="animate-spin" />,
    border: 'border-indigo-500/30',
    fill: 'bg-indigo-500/15',
    text: 'text-indigo-200',
  },
}

export function Toaster({ position = 'top-right', className }: ToasterProps) {
  const toasts = useToastState()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const posClass = position === 'top-right' ? 'top-4 right-4' : 'bottom-4 right-4'

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed z-[200] flex flex-col gap-2 w-full max-w-xs sm:max-w-sm pointer-events-none',
        posClass,
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const v = variantClasses[t.variant]
          return (
            <motion.div
              key={t.id}
              layoutId={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className={cn(
                'pointer-events-auto mx-2 sm:mx-0',
                'glass rounded-xl p-3',
                'border',
                v.border,
                v.fill
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className={cn('shrink-0 mt-0.5', v.text)}>{v.icon}</span>
                <div className="flex-1 min-w-0">
                  {t.title && (
                    <p className={cn('text-sm font-semibold', v.text)}>{t.title}</p>
                  )}
                  {t.description && (
                    <p className="text-xs text-slate-400 mt-0.5 break-words">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismissToast(t.id)}
                  className="shrink-0 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body
  )
}
