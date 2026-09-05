import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      return null
    }
  })
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')))

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    if (localStorage.getItem('token')) {
      getCurrentUser()
        .then((result) => {
          setUser(result.user)
          localStorage.setItem('user', JSON.stringify(result.user))
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    }

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const authenticate = async (request) => {
    const result = await request()
    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(result.user))
    setUser(result.user)
    return result.user
  }

  const login = (credentials) => authenticate(() => loginRequest(credentials))
  const register = (credentials) => authenticate(() => registerRequest(credentials))
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
