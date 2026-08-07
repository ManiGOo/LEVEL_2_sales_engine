import { motion } from 'motion/react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { ChatMessage } from '@/types/api'
import ToolCallCard from './ToolCallCard'
import AiAvatar from '@/components/AiAvatar'
import { User } from 'lucide-react'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-transparent'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <AiAvatar className="w-9 h-9 rounded-lg" size={36} />
        )}
      </div>

      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'text-right' : ''}`}>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.tool_calls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {message.content && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-indigo-500/20 text-indigo-100 rounded-tr-sm'
                : 'bg-slate-800/60 text-slate-200 rounded-tl-sm border border-white/5'
            }`}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className="prose-chat">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full text-xs">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="border-b border-slate-600">{children}</thead>,
                    th: ({ children }) => (
                      <th className="px-3 py-1.5 text-left text-slate-400 font-medium">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-700/50">{children}</td>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className
                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-slate-700/50 text-emerald-300 text-xs" {...props}>
                            {children}
                          </code>
                        )
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className="overflow-x-auto rounded-lg bg-slate-900/50 p-3 my-2 text-xs">{children}</pre>
                    ),
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">{children}</a>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-indigo-500/50 pl-3 text-slate-400 italic my-2">{children}</blockquote>
                    ),
                    hr: () => <hr className="border-slate-700 my-3" />,
                  }}
                >
                  {message.content}
                </Markdown>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
