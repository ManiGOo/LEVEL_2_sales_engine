import { useRef, useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import type { ChatMessage } from '@/types/api'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import AiAvatar from '@/components/AiAvatar'

interface ChatWindowProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onSend: (msg: string) => void
  onStop: () => void
}

export default function ChatWindow({ messages, isStreaming, onSend, onStop }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-hidden glass rounded-2xl flex flex-col max-w-3xl mx-auto w-full h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 scrollbar-thin pb-[calc(3.25rem+env(safe-area-inset-bottom,_0px))]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <AiAvatar className="w-10 h-10 rounded-xl" size={40} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Start a conversation</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Ask about CDSCO drug failures, company compliance scores, or regulatory signals.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                'Show spurious drug failures',
                'Which companies have the most signals?',
                'Investigate Sun Pharma',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="px-3 py-1.5 text-xs text-slate-400 glass rounded-full hover:text-white hover:border-indigo-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && <TypingIndicator />}
      </div>

      <div
        className="p-3 lg:p-4 border-t border-white/5 bg-slate-900/40"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
