import { motion } from 'motion/react'
import AiAvatar from '@/components/AiAvatar'

export default function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -5 },
  }

  const transition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as const,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AiAvatar className="w-9 h-9 rounded-lg" size={36} />
      <div className="bg-slate-800/70 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 h-[44px]">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              ...transition,
              delay: index * 0.15,
            }}
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
          />
        ))}
      </div>
    </motion.div>
  )
}
