import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface LogoProps {
  loading?: boolean
  className?: string
}

export default function Logo({ loading = false, className }: LogoProps) {
  const [hasError, setHasError] = useState(false)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 cursor-default select-none',
        'transition-opacity',
        className
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center shrink-0 rounded-xl',
          'bg-gradient-to-br from-indigo-500 to-purple-600',
          'transition-transform duration-300 hover:scale-105',
          loading ? 'pulse-glow' : ''
        )}
        style={{ width: 36, height: 36 }}
      >
        {hasError ? (
          <Shield size={20} className="text-white" />
        ) : (
          <img
            src="/molecular.png"
            alt="Sentinel"
            onError={() => setHasError(true)}
            className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] object-contain"
            style={{ width: 26, height: 26 }}
          />
        )}
      </div>
      <span className="text-lg font-bold gradient-text">Sentinel</span>
    </div>
  )
}
