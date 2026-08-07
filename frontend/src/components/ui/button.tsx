import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type Size = 'default' | 'sm' | 'lg' | 'icon' | 'iconSm'

const variantClasses: Record<Variant, string> = {
  default:
    'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20',
  secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5',
  ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
  outline: 'border border-white/10 text-slate-300 hover:bg-white/5',
  destructive: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
}

const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-11 px-6 text-sm',
  icon: 'h-10 w-10',
  iconSm: 'h-8 w-8',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50'

type CommonProps = {
  variant?: Variant
  size?: Size
  className?: string
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {}
export interface ButtonLinkProps extends CommonProps, AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <a
      ref={ref}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
)
ButtonLink.displayName = 'ButtonLink'
