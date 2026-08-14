import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import lottie from 'lottie-web'
import AiAvatar from '@/components/AiAvatar'

export default function TypingIndicator() {
  const animationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animationRef.current) return
    const animation = lottie.loadAnimation({
      container: animationRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/loading/animations/8adb6c65-cd64-49b5-ac03-6d14e9faf5a7.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    return () => animation.destroy()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AiAvatar className="w-9 h-9 rounded-lg" size={36} />
      <div className="bg-slate-800/70 border border-white/5 rounded-2xl rounded-tl-sm px-2 py-1.5">
        <div ref={animationRef} aria-label="AI is thinking" className="w-28 h-12" />
      </div>
    </motion.div>
  )
}
