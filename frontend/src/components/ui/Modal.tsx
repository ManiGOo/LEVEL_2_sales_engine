import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

function ModalInner({ title, onClose, children, className }: Omit<ModalProps, 'open'>) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative mx-auto w-full lg:max-w-2xl rounded-t-2xl lg:rounded-2xl border-t lg:border-x lg:border-b border-white/10 bg-slate-900/95 backdrop-blur-xl',
          'flex flex-col shadow-2xl modal-enter',
          className
        )}
        style={{ maxHeight: 'calc(100dvh - 64px)' }}
      >
        <div className="flex items-center justify-between gap-3 p-4 pb-3 border-b border-white/5">
          <div className="flex-1 min-w-0 text-base font-semibold text-white">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">{children}</div>
      </div>
    </div>
  )
}

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <ModalInner title={title} onClose={onClose} className={className}>
      {children}
    </ModalInner>,
    document.body
  )
}
