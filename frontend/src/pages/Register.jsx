import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function EyeIcon({ visible }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#849590] hover:text-[#10242a] transition-colors">
      {visible ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      )}
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}

export function GoogleAuthButton({ onGoogleLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleAuth = async () => {
    setError('')
    setLoading(true)
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 600))
    
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.')
      setLoading(false)
      return
    }

    // Since we don't have the script loaded natively and shouldn't invent credentials:
    // If it *is* set, we would normally trigger the flow. For this prototype step, we report the required config.
    setError('Google OAuth requires backend /api/auth/google verification endpoint implementation (Step 3).')
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2 w-full motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '150ms' }}>
      <button 
        type="button" 
        onClick={handleGoogleAuth}
        disabled={loading}
        className="flex items-center justify-center gap-3 w-full h-11 border border-[#d9e4df] rounded-lg bg-white text-[#10242a] text-sm font-bold shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-[#f7fbf9] hover:border-[#cadbd4] transition-all disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? 'Connecting...' : 'Continue with Google'}
      </button>
      {error && <p className="text-xs text-[#a44530] bg-[#fff0eb] p-2 rounded text-center">{error}</p>}
    </div>
  )
}

export default function Register({ onLogin }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid email is required.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register({ name, email, password })
    } catch (requestError) {
      if (requestError.status === 409) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(requestError.message || 'Unable to create account.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#f2f7f5] to-[#e4eee9] font-['Manrope',sans-serif] text-[#10242a] py-12">
      <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-xl p-8 sm:p-10 border border-[#d9e4df] rounded-2xl shadow-[0_24px_80px_rgba(16,36,42,0.06)] motion-safe:animate-[fade-in-up_0.5s_ease-out_forwards]">
        
        <a href="/" className="inline-flex items-center gap-3 no-underline mb-10 motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '50ms' }}>
          <div className="grid place-items-center w-8 h-8 rounded-lg text-[#f4fbf7] bg-[#0f766e] font-['DM_Mono',monospace] text-[10px] font-bold">CG</div>
          <span className="font-extrabold text-sm tracking-tight text-[#10242a]">Capital Guardian</span>
        </a>

        <div className="mb-8 motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '100ms' }}>
          <h1 className="text-2xl font-bold tracking-tight text-[#173b3d] mb-2">Create your workspace.</h1>
          <p className="text-[#71817e] text-sm">Set up your secure capital management workspace.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '150ms' }}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-name" className="text-[10px] uppercase tracking-wider font-['DM_Mono',monospace] text-[#5f7771] font-bold">Name</label>
            <input 
              id="register-name" 
              type="text" 
              autoComplete="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              className="h-11 border border-[#cadbd4] rounded-lg px-3 bg-[#f8fbf9] text-[#244449] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-email" className="text-[10px] uppercase tracking-wider font-['DM_Mono',monospace] text-[#5f7771] font-bold">Email</label>
            <input 
              id="register-email" 
              type="email" 
              autoComplete="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="h-11 border border-[#cadbd4] rounded-lg px-3 bg-[#f8fbf9] text-[#244449] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label htmlFor="register-password" className="text-[10px] uppercase tracking-wider font-['DM_Mono',monospace] text-[#5f7771] font-bold">Password</label>
            <div className="relative">
              <input 
                id="register-password" 
                type={showPassword ? 'text' : 'password'} 
                autoComplete="new-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full h-11 border border-[#cadbd4] rounded-lg pl-3 pr-10 bg-[#f8fbf9] text-[#244449] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label htmlFor="register-confirm-password" className="text-[10px] uppercase tracking-wider font-['DM_Mono',monospace] text-[#5f7771] font-bold">Confirm Password</label>
            <div className="relative">
              <input 
                id="register-confirm-password" 
                type={showConfirmPassword ? 'text' : 'password'} 
                autoComplete="new-password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                className="w-full h-11 border border-[#cadbd4] rounded-lg pl-3 pr-10 bg-[#f8fbf9] text-[#244449] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#a44530] bg-[#fff0eb] p-3 rounded-md mt-1 animate-pulse" role="alert">{error}</p>}

          <button 
            className="h-11 mt-2 rounded-lg bg-[#14383b] hover:bg-[#0f766e] text-white text-sm font-bold transition-all hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-wait shadow-md"
            disabled={loading} 
            type="submit"
          >
            {loading ? 'Creating workspace...' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-8 motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '150ms' }}>
          <div className="flex-1 h-px bg-[#d9e4df]"></div>
          <span className="text-[#849590] text-xs font-['DM_Mono',monospace] uppercase">Or</span>
          <div className="flex-1 h-px bg-[#d9e4df]"></div>
        </div>

        <GoogleAuthButton onGoogleLogin={() => {}} />

        <p className="mt-8 text-center text-sm text-[#71817e] motion-safe:animate-[fade-in-up_0.6s_ease-out_forwards] opacity-0" style={{ animationDelay: '200ms' }}>
          Already have an account? <button type="button" onClick={onLogin} className="font-bold text-[#0f766e] hover:text-[#14383b] transition-colors ml-1">Sign in</button>
        </p>
      </div>
    </main>
  )
}
