import { useState, useEffect } from 'react'
import { PanelLeft, ChevronLeft, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useChat } from '@/hooks/useChat'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import ChatWindow from '@/components/chat/ChatWindow'
import ConversationSidebar from '@/components/chat/ConversationSidebar'
import Logo from '@/components/layout/Logo'
import TopLoader from '@/components/TopLoader'

export default function ChatPage() {
  const {
    messages,
    conversationId,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
  } = useChat()

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)

  // Keep the chat list sidebar open on large screens, closed on mobile.
  useEffect(() => {
    setSidebarOpen(isDesktop)
  }, [isDesktop])

  const toggleSidebar = () => setSidebarOpen((o) => !o)

  const handleNew = () => {
    clearMessages()
    setSidebarOpen(false)
  }

  const handleSelect = (id: string) => {
    loadConversation(id)
    setSidebarOpen(false)
  }

  return (
    <div className="relative flex h-[calc(100dvh-6rem)] flex-col gap-2 lg:flex-row lg:gap-2 overflow-hidden">
      <TopLoader active={isStreaming} />

      <ConversationSidebar
        activeId={conversationId}
        onSelect={handleSelect}
        onNew={handleNew}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full mx-auto max-w-full sm:max-w-3xl xl:max-w-5xl">
        {/* Top app bar: logo (molecular.png) + streaming loader + actions */}
        <div className="flex items-center justify-between mb-2 lg:mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors lg:hidden"
              aria-label="Toggle conversations"
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors hidden lg:block"
              title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
              aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
            >
              <ChevronLeft size={18} />
            </button>
            <Logo loading={isStreaming} />
            <span className="text-sm text-slate-400">AI Assistant</span>
          </div>

          <AnimatePresence>
            {messages.length > 0 && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleNew}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                title="Clear chat"
                aria-label="Clear chat"
              >
                <Trash2 size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isStreaming={isStreaming}
            onSend={sendMessage}
            onStop={stopStreaming}
          />
        </div>
      </div>
    </div>
  )
}
