import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface TopLoaderProps {
  active: boolean
  className?: string
}

export default function TopLoader({ active, className }: TopLoaderProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        'fixed top-0 left-0 right-0 h-1 z-[50] origin-left',
        className
      )}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
      transition={{
        scaleX: { duration: 0.45, ease: 'easeOut' },
        opacity: { duration: 0.3 },
      }}
      style={{
        background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}
