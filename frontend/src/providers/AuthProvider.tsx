import { createContext, useContext, useEffect, useMemo, useCallback, useState, type ReactNode } from 'react'
import type { User, AuthTokens } from '@/types/api'

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function isTokenExpired(token: string): boolean {
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

  const logout = useCallback(() => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('auth_tokens')
    const storedUser = localStorage.getItem('auth_user')
    if (stored && storedUser) {
      const parsedTokens: AuthTokens = JSON.parse(stored)
      if (isTokenExpired(parsedTokens.access_token)) {
        localStorage.removeItem('auth_tokens')
        localStorage.removeItem('auth_user')
      } else {
        setTokens(parsedTokens)
        setUser(JSON.parse(storedUser))
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Login failed')
    const data: AuthTokens = await res.json()
    setTokens(data)
    localStorage.setItem('auth_tokens', JSON.stringify(data))

    const meRes = await fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (meRes.ok) {
      const meData: User = await meRes.json()
      setUser(meData)
      localStorage.setItem('auth_user', JSON.stringify(meData))
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) throw new Error('Registration failed')
  }, [])

  const value = useMemo(
    () => ({ user, tokens, login, logout, register, isLoading }),
    [user, tokens, login, logout, register, isLoading]
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
