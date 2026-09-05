import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Login({ onRegister }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">CG</span><span>Capital Guardian</span></div>
        <span className="eyebrow">Secure workspace</span>
        <h1>Welcome back.</h1>
        <p className="auth-copy">Sign in to review capital, risk, scenarios, and control recommendations.</p>
        <form onSubmit={submit}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">Need an account? <button type="button" onClick={onRegister}>Create one</button></p>
        <span className="auth-footnote">Demo environment · Simulated portfolio</span>
      </section>
    </main>
  )
}

export default Login
