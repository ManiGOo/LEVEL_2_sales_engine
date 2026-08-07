import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (msg: string) => void
  onStop: () => void
  isStreaming: boolean
}

export default function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    onSend(text)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSend = input.trim().length > 0 && !isStreaming

  return (
    <motion.div
      className="relative flex items-end gap-3"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <motion.div
        layout
        className={cn(
          'flex-1 min-w-0',
          'relative rounded-2xl lg:rounded-3xl',
          'glass border border-white/10',
          'focus-within:border-indigo-400/50 focus-within:ring-2 focus-within:ring-indigo-500/25',
          'transition-all duration-200'
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about regulatory signals, companies, compliance..."
          rows={1}
          maxLength={4000}
          className={cn(
            'w-full resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500',
            'px-4 py-3 lg:py-3.5 lg:text-base',
            'focus:outline-none',
            'scrollbar-thin'
          )}
        />
        {/* Shift+Enter hint (subtle) */}
        <div className="absolute right-2 bottom-1.5 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-800/60 rounded border border-white/5">
            Shift + Enter
          </kbd>
        </div>
      </motion.div>

      <motion.div className="flex items-end gap-2 flex-shrink-0" initial={false}>
        <AnimatePresence>
          {!isStreaming && (
            <motion.button
              key="send"
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: canSend ? 1 : 0.45, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              whileTap={{ scale: canSend ? 0.92 : 1 }}
              whileHover={canSend ? { y: -1 } : undefined}
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                'p-2.5 rounded-xl',
                'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
                'hover:opacity-95 transition-opacity',
                'disabled:cursor-not-allowed'
              )}
              aria-label="Send message"
              title="Send (Enter) · Shift+Enter for new line"
            >
              <Send size={17} />
            </motion.button>
          )}
          {isStreaming && (
            <motion.button
              key="stop"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={{ scale: 0.92 }}
              onClick={onStop}
              className={cn(
                'p-2.5 rounded-xl',
                'bg-red-500/15 text-red-400 hover:bg-red-500/25',
                'border border-red-500/20 transition-colors'
              )}
              aria-label="Stop responding"
              title="Stop"
            >
              <Square size={15} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
