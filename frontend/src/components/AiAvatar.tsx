import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface AiAvatarProps {
  className?: string
  size?: number
}

export default function AiAvatar({ className, size = 16 }: AiAvatarProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
          className
        )}
        style={{ width: size, height: size }}
      >
        <Bot size={size * 0.58} />
      </div>
    )
  }

  return (
    <img
      src="/voice.png"
      alt="AI assistant"
      onError={() => setHasError(true)}
      className={cn('shrink-0 rounded-lg object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}
