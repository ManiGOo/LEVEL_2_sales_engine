import { useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'

export function useApi() {
  const { tokens, logout } = useAuth()

  const fetchApi = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      }
      if (tokens?.access_token) {
        headers['Authorization'] = `Bearer ${tokens.access_token}`
      }
      const res = await fetch(url, { ...options, headers })
      if (res.status === 401) {
        logout()
        throw new Error('Unauthorized')
      }
      return res
    },
    [tokens, logout]
  )

  return { fetchApi }
}
