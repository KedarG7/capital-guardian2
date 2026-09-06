import { useState } from 'react'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import { resendRegistrationOtp } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function Register({ onLogin }) {
  const { register, completeOtp, oauthError, clearOauthError } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    clearOauthError()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      if (otpSent) await completeOtp({ email: form.email, code: otp, purpose: 'register' })
      else {
        await register(form)
        setOtpSent(true)
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the account.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError('')
    setLoading(true)
    try {
      await resendRegistrationOtp(form.email)
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
        <span className="eyebrow">New workspace</span>
        <h1>Create access.</h1>
        <p className="auth-copy">Set up a secure account for this simulated capital workspace.</p>
        <form onSubmit={submit}>
          {!otpSent ? (
            <>
              <label htmlFor="register-name">Name</label>
              <input id="register-name" value={form.name} onChange={update('name')} required />
              <label htmlFor="register-email">Email</label>
              <input id="register-email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
              <label htmlFor="register-password">Password</label>
              <input id="register-password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} minLength="8" required />
              <label htmlFor="register-confirm">Confirm password</label>
              <input id="register-confirm" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength="8" required />
            </>
          ) : (
            <>
              <label htmlFor="register-otp">Verify your email</label>
              <input id="register-otp" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required />
              <p className="auth-copy">Enter the six-digit code sent to {form.email}.</p>
              <button className="auth-link" type="button" onClick={resend} disabled={loading}>Resend code</button>
            </>
          )}
          {error || oauthError ? <p className="auth-error" role="alert">{error || oauthError}</p> : null}
          <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Verifying...' : otpSent ? 'Verify email and continue' : 'Create secure account'}</button>
        </form>
        {!otpSent ? (
          <>
            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton>Sign up with Google</GoogleSignInButton>
          </>
        ) : null}
        <p className="auth-switch">Already registered? <button type="button" onClick={onLogin}>Sign in</button></p>
      </section>
    </main>
  )
}

export default Register
