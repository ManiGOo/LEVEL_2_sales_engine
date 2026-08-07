import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi'
import type { Conversation } from '@/types/api'
import { Plus, MessageSquare, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationSidebarProps {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  isOpen: boolean
  onClose: () => void
}

export default function ConversationSidebar({ activeId, onSelect, onNew, isOpen, onClose }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { fetchApi } = useApi()

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetchApi('/api/v1/conversations/')
      .then((r) => r.json())
      .then((data) => {
        setConversations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [isOpen, activeId, fetchApi])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetchApi(`/api/v1/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) onNew()
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed left-0 top-0 lg:static z-50 h-full flex flex-col bg-slate-900/95 backdrop-blur border-r border-white/5',
          'transition-[transform,width] duration-300 ease-out shrink-0',
          'w-72 max-w-[85vw]',
          isOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
        )}
      >
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNew}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              title="New chat"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors lg:hidden"
              aria-label="Close conversations"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="text-center text-slate-500 text-sm py-4">Loading...</div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-4">No conversations yet</div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                onSelect(conv.id)
                onClose()
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-xl text-sm group flex items-center gap-2 transition-colors',
                activeId === conv.id
                  ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                aria-label="Delete conversation"
              >
                <Trash2 size={12} />
              </button>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
