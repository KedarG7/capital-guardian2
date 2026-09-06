import { useState } from 'react'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function Login({ onRegister }) {
  const { login, completeOtp, resendLoginOtp, oauthError, clearOauthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    clearOauthError()
    setLoading(true)
    try {
      if (otpSent) await completeOtp({ email, code: otp, purpose: 'login' })
      else {
        await login({ email, password })
        setOtpSent(true)
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError('')
    setLoading(true)
    try {
      await resendLoginOtp({ email, password })
    } catch (requestError) {
      setError(requestError.message || 'Unable to resend the code.')
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
          {!otpSent ? (
            <>
              <label htmlFor="login-password">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </>
          ) : (
            <>
              <label htmlFor="login-otp">Email verification code</label>
              <input id="login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required />
              <p className="auth-copy">We sent a six-digit code to {email}. It expires in 10 minutes.</p>
              <button className="auth-link" type="button" onClick={resend} disabled={loading}>Resend code</button>
            </>
          )}
          {error || oauthError ? <p className="auth-error" role="alert">{error || oauthError}</p> : null}
          <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Verifying...' : otpSent ? 'Verify and sign in' : 'Continue securely'}</button>
        </form>
        {!otpSent ? (
          <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton>Continue with Google</GoogleSignInButton>
          </>
        ) : null}
        <p className="auth-switch">Need an account? <button type="button" onClick={onRegister}>Create one</button></p>
        <span className="auth-footnote">Demo environment · Simulated portfolio</span>
      </section>
    </main>
  )
}

export default Login
