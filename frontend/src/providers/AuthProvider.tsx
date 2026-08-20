import { createContext, useContext, useEffect, useMemo, useCallback, useState, useRef, type ReactNode } from 'react'
import type { User, AuthTokens } from '@/types/api'

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<string>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const tokensRef = useRef<AuthTokens | null>(null)
  const refreshInFlight = useRef<Promise<string> | null>(null)

  const updateTokens = useCallback((next: AuthTokens) => {
    tokensRef.current = next
    setTokens(next)
    localStorage.setItem('auth_tokens', JSON.stringify(next))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    tokensRef.current = null
    setTokens(null)
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('auth_tokens')
    const storedUser = localStorage.getItem('auth_user')
    if (stored && storedUser) {
      const parsedTokens: AuthTokens = JSON.parse(stored)
      tokensRef.current = parsedTokens
      setTokens(parsedTokens)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const doRefresh = useCallback(async (): Promise<string> => {
    const current = tokensRef.current
    if (!current?.refresh_token) throw new Error('No refresh token')
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    })
    if (!res.ok) throw new Error('Refresh failed')
    const data: AuthTokens = await res.json()
    updateTokens({ access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type })
    return data.access_token
  }, [updateTokens])

  const refresh = useCallback(async (): Promise<string> => {
    if (refreshInFlight.current) return refreshInFlight.current
    const p = doRefresh().finally(() => {
      refreshInFlight.current = null
    })
    refreshInFlight.current = p
    return p
  }, [doRefresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('Login failed')
      const data: AuthTokens = await res.json()
      updateTokens(data)
      tokensRef.current = data

      const meRes = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (meRes.ok) {
        const meData: User = await meRes.json()
        setUser(meData)
        localStorage.setItem('auth_user', JSON.stringify(meData))
      }
    },
    [updateTokens]
  )

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) throw new Error('Registration failed')
  }, [])

  const value = useMemo(
    () => ({ user, tokens, login, logout, register, refresh, isLoading }),
    [user, tokens, login, logout, register, refresh, isLoading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
