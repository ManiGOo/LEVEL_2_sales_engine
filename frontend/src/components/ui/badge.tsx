import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'paper'
  | 'mandate'
  | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
  success: 'bg-green-500/15 text-green-300 border border-green-500/25',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/25',
  neutral: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  paper: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25',
  mandate: 'bg-orange-500/15 text-orange-300 border border-orange-500/25',
  info: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = 'Badge'
