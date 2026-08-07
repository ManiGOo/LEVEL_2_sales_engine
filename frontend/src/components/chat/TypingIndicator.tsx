import { motion } from 'motion/react'
import AiAvatar from '@/components/AiAvatar'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AiAvatar className="w-9 h-9 rounded-lg" size={36} />
      <div className="bg-slate-800/70 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            className="w-1.5 h-1.5 bg-slate-500 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  )
}
