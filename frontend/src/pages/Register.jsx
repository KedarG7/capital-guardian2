import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Register({ onLogin }) {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form)
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the account.')
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
          <label htmlFor="register-name">Name</label><input id="register-name" value={form.name} onChange={update('name')} required />
          <label htmlFor="register-email">Email</label><input id="register-email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
          <label htmlFor="register-password">Password</label><input id="register-password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} minLength="8" required />
          <label htmlFor="register-confirm">Confirm password</label><input id="register-confirm" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength="8" required />
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-submit" disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already registered? <button type="button" onClick={onLogin}>Sign in</button></p>
      </section>
    </main>
  )
}

export default Register
