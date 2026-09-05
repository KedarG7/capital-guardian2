import { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>
}

function AuthenticatedApp() {
  const { user, loading, logout } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) return <main className="app-shell loading-shell"><span className="loader" />Checking secure session...</main>
  if (!user) return showRegister ? <Register onLogin={() => setShowRegister(false)} /> : <Login onRegister={() => setShowRegister(true)} />
  return <Dashboard user={user} onLogout={logout} />
}

export default App
