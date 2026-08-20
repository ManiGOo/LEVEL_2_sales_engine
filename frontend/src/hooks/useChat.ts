import { useCallback, useRef, useState } from 'react'
import type { ChatMessage, ToolCall } from '@/types/api'
import { useAuth, isTokenExpired } from '@/providers/AuthProvider'
import { useApi } from '@/hooks/useApi'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { tokens, refresh } = useAuth()
  const { fetchApi } = useApi()

  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetchApi(`/api/v1/conversations/${id}`)
        const data = await res.json()
        setConversationId(id)
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.created_at,
          }))
        )
      } catch {
        // ignore
      }
    },
    [fetchApi]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        tool_calls: [],
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      abortRef.current = new AbortController()

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      try {
        let accessToken = tokens?.access_token
        if (accessToken && isTokenExpired(accessToken)) {
          try {
            accessToken = await refresh()
          } catch {
            // fall through; backend will reject and the error surfaces below
          }
        }
        const res = await fetch('/api/v1/chat/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: content,
            history,
            conversation_id: conversationId,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) throw new Error('Chat request failed')

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No reader')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'token') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: m.content + parsed.content }
                        : m
                    )
                  )
                } else if (parsed.type === 'tool_call') {
                  const tc: ToolCall = {
                    id: parsed.id,
                    name: parsed.name,
                    arguments: parsed.arguments,
                    status: 'running',
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, tool_calls: [...(m.tool_calls || []), tc] }
                        : m
                    )
                  )
                } else if (parsed.type === 'tool_result') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? {
                            ...m,
                            tool_calls: (m.tool_calls || []).map((tc) =>
                              tc.id === parsed.id
                                ? { ...tc, result: parsed.result, status: 'completed' }
                                : tc
                            ),
                          }
                        : m
                    )
                  )
                } else if (parsed.type === 'conversation_id') {
                  setConversationId(parsed.id)
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content || 'Error: Failed to get response' }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [messages, tokens, conversationId]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(null)
  }, [])

  return {
    messages,
    conversationId,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
  }
}
