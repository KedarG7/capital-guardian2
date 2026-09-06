import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, register as registerRequest, requestLoginOtp, verifyOtp } from '../services/api.js'

const AuthContext = createContext(null)

function readOAuthToken() {
  return new URLSearchParams(window.location.hash.slice(1)).get('oauth_token')
}

function readOAuthError() {
  return new URLSearchParams(window.location.search).get('oauth_error')
}

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
  const [oauthError, setOauthError] = useState(() => readOAuthError() || '')
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token') || readOAuthToken()))

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    const oauthToken = readOAuthToken()
    const incomingError = readOAuthError()
    if (oauthToken) {
      localStorage.setItem('token', oauthToken)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (incomingError) {
      setOauthError(incomingError)
      window.history.replaceState({}, '', window.location.pathname)
    }
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
    } else {
      setLoading(false)
    }

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const authenticate = async (request) => {
    const result = await request()
    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(result.user))
    setUser(result.user)
    setOauthError('')
    return result.user
  }

  const login = (credentials) => requestLoginOtp(credentials)
  const register = (credentials) => registerRequest(credentials)
  const completeOtp = (payload) => authenticate(() => verifyOtp(payload))
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const resendLoginOtp = (credentials) => requestLoginOtp(credentials)
  const clearOauthError = () => setOauthError('')

  return (
    <AuthContext.Provider value={{ user, loading, oauthError, clearOauthError, login, register, completeOtp, resendLoginOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
