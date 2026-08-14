import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import { cn } from '@/lib/utils'

export function ResourceLoader({ className, label = 'Loading resources' }: { className?: string; label?: string }) {
  const animationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animationRef.current) return
    const animation = lottie.loadAnimation({
      container: animationRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/resourceloading/animations/9a98a5ad-e1a5-4b6a-be32-7a42a79432c3.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    return () => animation.destroy()
  }, [])

  return <div role="status" aria-label={label} className={cn('flex items-center justify-center', className)}>
    <div ref={animationRef} className="w-24 h-14" />
  </div>
}

export function TextContentSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3', className)}>
      <ResourceLoader className="h-12" label="Loading content" />
      <div className="space-y-2 mt-1">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className={cn('h-2.5 rounded-full bg-slate-700/70 animate-pulse', index === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}
