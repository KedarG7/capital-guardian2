import { useEffect, useMemo, useState } from 'react'
import { getPortfolio, getScenarios, getExplanation, getMarketData, getMarketResponse, getAlerts, markAlertRead } from '../../services/api.js'
import { ExplanationCard } from '../dashboard/Shared.jsx'
import Overview from '../../pages/Overview.jsx'
import Optimization from '../../pages/Optimization.jsx'
import WhatIf from '../../pages/WhatIf.jsx'
import Controls from '../../pages/Controls.jsx'
import DecisionHistory from '../../pages/DecisionHistory.jsx'
import Onboarding from '../../pages/Onboarding.jsx'

const assetColors = {
  stocks: '#0f766e',
  bonds: '#1d4ed8',
  gold: '#d97706',
  cash: '#64748b',
}

export default function AppShell({ user, onLogout, view, navigate }) {
  const [portfolioData, setPortfolioData] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [shockDraft, setShockDraft] = useState({})
  const [optimization, setOptimization] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [control, setControl] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState({ portfolio: true })
  const [error, setError] = useState('')

  const [marketData, setMarketData] = useState(null)
  const [marketResponse, setMarketResponse] = useState(null)
  const [marketError, setMarketError] = useState(null)

  const portfolio = portfolioData?.configuration
  const metrics = portfolioData?.metrics
  const risk = portfolioData?.risk
  const assets = useMemo(() => (metrics?.assets || []).map((asset) => ({
    ...asset,
    color: assetColors[asset.assetId] || '#94a3b8',
  })), [metrics])

  useEffect(() => {
    Promise.all([getPortfolio(), getScenarios()])
      .then(([portfolioResult, scenarioResult]) => {
        setPortfolioData(portfolioResult)
        setScenarios(scenarioResult)
        if (scenarioResult[0]) {
          setSelectedScenario(scenarioResult[0].name)
          setShockDraft(Object.fromEntries(scenarioResult[0].shocks.map((shock) => [
            shock.assetId,
            shock.shockPercentage * 100,
          ])))
        }
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading((current) => ({ ...current, portfolio: false })))
    let intervalId
    const fetchMarket = () => {
      if (document.visibilityState !== 'visible') return
      getMarketResponse()
        .then((res) => {
          setMarketData(res.market)
          setMarketResponse(res)
          return getAlerts()
        })
        .then(setAlerts)
        .catch((err) => setMarketError(err.message))
    }
    
    fetchMarket()
    intervalId = setInterval(fetchMarket, 30000)
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMarket()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const runAction = async (name, action, onSuccess) => {
    setError('')
    setLoading((current) => ({ ...current, [name]: true }))
    try {
      onSuccess(await action())
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setLoading((current) => ({ ...current, [name]: false }))
    }
  }

  const handleNav = (e, targetView) => {
    e.preventDefault()
    navigate(targetView, `/${targetView}`)
  }

  if (loading.portfolio) {
    return <main className="app-shell loading-shell"><span className="loader" />Loading portfolio...</main>
  }

  if (!portfolioData) {
    return <main className="app-shell empty-shell"><h1>Capital Guardian</h1><p>{error || 'Unable to load the portfolio.'}</p></main>
  }

  const currentRisk = simulation?.riskAssessment || risk
  const currentMetrics = simulation?.shockedPortfolio || {
    totalValue: metrics.portfolioValue,
    expectedReturn: metrics.expectedReturn,
    volatility: metrics.volatility,
    liquidity: metrics.liquidityScore,
  }

  // Inject props that are common across views
  const commonProps = {
    portfolio,
    metrics,
    risk,
    assets,
    currentRisk,
    currentMetrics,
    loading,
    error,
    marketData,
    marketResponse,
    marketError,
    alerts,
    markAlertRead: async (id) => {
      try {
        await markAlertRead(id)
        setAlerts(alerts.map(a => a._id === id ? { ...a, read: true } : a))
      } catch (e) {
        console.error('Failed to mark alert read', e)
      }
    },
    runAction,
    setExplanation,
    setControl,
    explanation,
    setPortfolioData,
    clearDependentState: () => {
      setOptimization(null)
      setSimulation(null)
      setControl(null)
      setAnalysis(null)
      setExplanation(null)
    }
  }

  if (portfolioData && !portfolioData.isConfigured) {
    return (
      <div className="app-shell flex flex-col min-h-screen">
        <header className="topbar sticky top-0 z-50">
          <a className="brand" href="/overview" onClick={(e) => handleNav(e, 'overview')}>
            <span className="brand-mark">CG</span>
            <span className="hidden sm:inline">Capital Guardian</span>
          </a>
          <div className="topbar-meta hidden md:flex ml-auto">
            <span className="live-dot" />System online 
            <span className="demo-tag">{user?.name || user?.email}</span>
            <button className="logout-button ml-3" type="button" onClick={onLogout}>Sign out</button>
          </div>
          <button className="md:hidden text-[#14383b] text-xs font-bold ml-auto" type="button" onClick={onLogout}>Exit</button>
        </header>
        {error ? (
          <div className="error-banner" role="alert">
            <strong>Action unavailable.</strong> {error}
            <button onClick={() => setError('')} type="button">Dismiss</button>
          </div>
        ) : null}
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 motion-safe:animate-[fade-in-up_0.4s_ease-out_forwards]">
          <Onboarding runAction={runAction} setPortfolioData={setPortfolioData} />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col min-h-screen">
      <header className="topbar sticky top-0 z-50">
        <a className="brand" href="/overview" onClick={(e) => handleNav(e, 'overview')}>
          <span className="brand-mark">CG</span>
          <span className="hidden sm:inline">Capital Guardian</span>
        </a>
        <nav className="nav-links flex-1 justify-center sm:justify-start overflow-x-auto whitespace-nowrap px-2" aria-label="Dashboard sections">
          <a className={view === 'overview' ? 'active' : ''} href="/overview" onClick={(e) => handleNav(e, 'overview')}>Overview</a>
          <a className={view === 'optimization' ? 'active' : ''} href="/optimization" onClick={(e) => handleNav(e, 'optimization')}>Optimization</a>
          <a className={view === 'what-if' ? 'active' : ''} href="/what-if" onClick={(e) => handleNav(e, 'what-if')}>What-If</a>
          <a className={view === 'controls' ? 'active' : ''} href="/controls" onClick={(e) => handleNav(e, 'controls')}>Controls</a>
          <a className={view === 'decision-history' ? 'active' : ''} href="/decision-history" onClick={(e) => handleNav(e, 'decision-history')}>Decision History</a>
        </nav>
        <div className="topbar-meta hidden md:flex">
          <span className="live-dot" />System online 
          <span className="demo-tag">{user?.name || user?.email}</span>
          <button className="logout-button ml-3" type="button" onClick={onLogout}>Sign out</button>
        </div>
        {/* Mobile logout fallback */}
        <button className="md:hidden text-[#14383b] text-xs font-bold" type="button" onClick={onLogout}>Exit</button>
      </header>

      {error ? (
        <div className="error-banner" role="alert">
          <strong>Action unavailable.</strong> {error}
          <button onClick={() => setError('')} type="button">Dismiss</button>
        </div>
      ) : null}

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 motion-safe:animate-[fade-in-up_0.4s_ease-out_forwards]" key={view}>
        {view === 'overview' && (
          <Overview 
            {...commonProps}
            simulation={simulation}
            analysis={analysis}
            setAnalysis={setAnalysis}
            setOptimization={setOptimization}
            setControl={setControl}
          />
        )}
        
        {view === 'optimization' && (
          <Optimization 
            {...commonProps}
            optimization={optimization}
            setOptimization={setOptimization}
          />
        )}
        
        {view === 'what-if' && (
          <WhatIf 
            {...commonProps}
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            shockDraft={shockDraft}
            setShockDraft={setShockDraft}
            simulation={simulation}
            setSimulation={setSimulation}
          />
        )}
        
        {view === 'controls' && (
          <Controls 
            {...commonProps}
            simulation={simulation}
            control={control}
            setControl={setControl}
          />
        )}
        
        {view === 'decision-history' && (
          <DecisionHistory navigate={navigate} />
        )}

        {/* Global Explanation rendering: show at bottom if it exists */}
        {explanation && <ExplanationCard key={explanation.decisionId || Date.now()} explanation={explanation} />}
      </main>

      <footer className="mt-auto py-8">
        <span>Capital Guardian / Simulated Portfolio</span>
        <span>Deterministic decision support · Not investment advice</span>
      </footer>
    </div>
  )
}
