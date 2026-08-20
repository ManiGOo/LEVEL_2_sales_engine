import { useCallback } from 'react'
import { useAuth, isTokenExpired } from '@/providers/AuthProvider'

export function useApi() {
  const { tokens, logout, refresh } = useAuth()

  const fetchApi = useCallback(
    async (url: string, options: RequestInit = {}) => {
      let accessToken = tokens?.access_token

      if (accessToken && isTokenExpired(accessToken)) {
        try {
          accessToken = await refresh()
        } catch {
          logout()
          throw new Error('Session expired')
        }
      }

      const doFetch = async (token: string | undefined) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        return fetch(url, { ...options, headers })
      }

      let res = await doFetch(accessToken)

      if (res.status === 401) {
        try {
          const newToken = await refresh()
          res = await doFetch(newToken)
        } catch {
          logout()
          throw new Error('Session expired')
        }
        if (res.status === 401) {
          logout()
          throw new Error('Session expired')
        }
      }

      return res
    },
    [tokens, logout, refresh]
  )

  return { fetchApi }
}
