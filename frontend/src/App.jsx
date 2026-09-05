import { useState, useEffect } from 'react'
import AppShell from './components/layout/AppShell.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Landing from './pages/Landing.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>
}

function AuthenticatedApp() {
  const { user, loading, logout } = useAuth()
  
  const getInitialView = () => {
    const path = window.location.pathname
    if (path === '/login') return 'login'
    if (path === '/signup' || path === '/register') return 'register'
    return 'landing'
  }
  
  const [view, setView] = useState(getInitialView)

  useEffect(() => {
    const handlePopState = () => setView(getInitialView())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (newView, path) => {
    window.history.pushState(null, '', path)
    setView(newView)
  }

  if (loading) return <main className="app-shell loading-shell"><span className="loader" />Checking secure session...</main>
  
  if (!user) {
    if (view === 'login') return <Login onRegister={() => navigate('register', '/signup')} />
    if (view === 'register') return <Register onLogin={() => navigate('login', '/login')} />
    return <Landing onLogin={() => navigate('login', '/login')} onRegister={() => navigate('register', '/signup')} />
  }

  // Redirect authenticated user at root to /overview
  if (window.location.pathname === '/' || view === 'landing' || view === 'login' || view === 'register') {
    window.history.replaceState(null, '', '/overview')
    setTimeout(() => setView('overview'), 0)
    return <main className="app-shell loading-shell"><span className="loader" />Loading workspace...</main>
  }
  
  return <AppShell user={user} onLogout={logout} view={view} navigate={navigate} />
}

export default App
