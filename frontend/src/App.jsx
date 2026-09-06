import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Onboarding from './pages/Onboarding.jsx'
import { getPortfolio, savePortfolio } from './services/api.js'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>
}

function AuthenticatedApp() {
  const { user, loading, logout } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [onboarding, setOnboarding] = useState(null)

  if (loading) return <main className="app-shell loading-shell"><span className="loader" />Checking secure session...</main>
  if (!user) return showRegister ? <Register onLogin={() => setShowRegister(false)} /> : <Login onRegister={() => setShowRegister(true)} />
  if (onboarding === null) return <OnboardingGate onResolved={setOnboarding} />
  if (!onboarding) return <Onboarding onComplete={async (portfolio) => { await savePortfolio(portfolio); setOnboarding(true) }} />
  return <Dashboard user={user} onLogout={logout} />
}

function OnboardingGate({ onResolved }) {
  useEffect(() => { getPortfolio().then((result) => onResolved(result.isOnboarded)).catch(() => onResolved(false)) }, [onResolved])
  return <main className="app-shell loading-shell"><span className="loader" />Preparing your workspace...</main>
}

export default App
