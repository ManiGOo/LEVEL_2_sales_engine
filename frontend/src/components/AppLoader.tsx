import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import lottie from 'lottie-web'

const PATHS = {
  app: '/apploader/animations/721a89b8-73b2-43db-9226-2e0b755930b2.json',
  resource: '/resourceloading/animations/9a98a5ad-e1a5-4b6a-be32-7a42a79432c3.json',
}

export default function AppLoader({
  active,
  variant = 'resource',
}: {
  active: boolean
  variant?: 'app' | 'resource'
}) {
  const animationRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (active) {
      setVisible(true)
      return
    }
    const timeout = window.setTimeout(() => setVisible(false), 180)
    return () => window.clearTimeout(timeout)
  }, [active])

  useEffect(() => {
    if (!visible || !animationRef.current) return
    const animation = lottie.loadAnimation({
      container: animationRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: PATHS[variant],
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    return () => animation.destroy()
  }, [visible, variant])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          role="status"
          aria-label="Loading page"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm"
        >
          <div ref={animationRef} className="w-64 h-36 sm:w-80 sm:h-44" />
          <p className="-mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {variant === 'app' ? 'Loading' : 'Loading resources'}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
