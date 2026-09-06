import { useEffect, useMemo, useState } from 'react'
import AllocationDonut from '../components/dashboard/AllocationDonut.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import StatusPill from '../components/dashboard/StatusPill.jsx'
import {
  generateControlRecommendation,
  getExplanation,
  getPortfolio,
  getScenarios,
  optimizePortfolio,
  runFullAnalysis,
  simulateScenario,
  getMarketIntelligence,
  saveAnalysis,
  saveSimulation,
  saveControl,
  downloadReport,
  savePortfolio,
  updateCurrentUser,
  deleteCurrentUser,
  getAnalysisHistory,
  getSimulationHistory,
  getControlHistory,
} from '../services/api.js'

const assetColors = {
  stocks: '#0f766e',
  bonds: '#1d4ed8',
  gold: '#d97706',
  cash: '#64748b',
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const percent = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`
const amount = (value) => currency.format(value)
const signedPercent = (value) => `${value >= 0 ? '+' : ''}${percent(value)}`
const formatExplanationValue = (metric) => {
  if (typeof metric.value !== 'number') return metric.value
  if (metric.label.toLowerCase().includes('value')) return amount(metric.value)
  if (/return|risk|liquidity|volatility|utilization|buffer/.test(metric.label.toLowerCase())) return percent(metric.value)
  return metric.value
}

function ActionButton({ children, onClick, loading, tone = 'dark' }) {
  return (
    <button className={`action-button action-${tone}`} onClick={onClick} disabled={loading} type="button">
      {loading ? <span className="button-spinner" /> : null}
      {loading ? 'Working...' : children}
    </button>
  )
}

function SectionHeading({ kicker, title, children }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function AllocationChanges({ changes }) {
  return (
    <div className="change-list">
      {changes.map((change) => (
        <div className="change-row" key={change.assetId}>
          <span>{change.assetId}</span>
          <span>{percent(change.oldWeight)} <b>→</b> {percent(change.newWeight)}</span>
          <strong className={change.change >= 0 ? 'positive' : 'negative'}>{signedPercent(change.change)}</strong>
        </div>
      ))}
    </div>
  )
}

function Dashboard({ user, onLogout }) {
  const [portfolioData, setPortfolioData] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [shockDraft, setShockDraft] = useState({})
  const [optimization, setOptimization] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [control, setControl] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [market, setMarket] = useState(null)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [records, setRecords] = useState({ analysis: [], simulations: [], controls: [] })
  const [loading, setLoading] = useState({ portfolio: true })
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState(() => window.location.hash.replace('#', '') || 'overview')

  const portfolio = portfolioData?.configuration
  const metrics = portfolioData?.metrics
  const risk = portfolioData?.risk
  const assets = useMemo(() => (metrics?.assets || []).map((asset) => ({
    ...asset,
    color: assetColors[asset.assetId] || '#94a3b8',
  })), [metrics])

  useEffect(() => {
    const syncSection = () => setActiveSection(window.location.hash.replace('#', '') || 'overview')
    window.addEventListener('hashchange', syncSection)
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  useEffect(() => {
    Promise.all([getPortfolio(), getScenarios()])
      .then(([portfolioResult, scenarioResult]) => {
        setPortfolioData(portfolioResult)
        setScenarios(scenarioResult)
        getExplanation(portfolioResult.risk).then(setExplanation).catch(() => {})
        getMarketIntelligence(portfolioResult.configuration).then(setMarket).catch(() => {})
        Promise.all([getAnalysisHistory(), getSimulationHistory(), getControlHistory()])
          .then(([analysisHistory, simulationHistory, controlHistory]) => setRecords({ analysis: analysisHistory, simulations: simulationHistory, controls: controlHistory }))
          .catch(() => {})
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

  const selectScenario = (name) => {
    const scenario = scenarios.find((item) => item.name === name)
    setSelectedScenario(name)
    setShockDraft(Object.fromEntries((scenario?.shocks || []).map((shock) => [
      shock.assetId,
      shock.shockPercentage * 100,
    ])))
  }

  const scenario = {
    name: selectedScenario,
    shocks: assets.map((asset) => ({
      assetId: asset.assetId,
      shockPercentage: Number(shockDraft[asset.assetId] || 0) / 100,
    })),
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#overview"><span className="brand-mark">CG</span><span>Capital Guardian</span></a>
        <nav className="nav-links" aria-label="Dashboard sections">
          <a className={activeSection === 'overview' ? 'active' : ''} href="#overview">Overview</a>
          <a className={activeSection === 'optimization' ? 'active' : ''} href="#optimization">Optimization</a>
          <a className={activeSection === 'what-if' ? 'active' : ''} href="#what-if">What-If</a>
          <a className={activeSection === 'controls' ? 'active' : ''} href="#controls">Controls</a>
          <a className={activeSection === 'profile' ? 'active' : ''} href="#profile">Profile</a>
        </nav>
        <div className="topbar-meta"><span className="session-status"><span className="live-dot" />System online</span> <span className="demo-tag">{profileName || user?.email}</span><button className="logout-button" type="button" onClick={onLogout}>Sign out</button></div>
      </header>

      {error ? <div className="error-banner" role="alert"><strong>Action unavailable.</strong> {error}<button onClick={() => setError('')} type="button">Dismiss</button></div> : null}

      <main>
        <section className="hero" id="overview">
          <div>
            <span className="eyebrow">Capital control workspace / {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <h1>See the whole<br /><em>capital picture.</em></h1>
            <p>Optimize capital. Detect risk. Simulate shocks. Recommend action.</p>
          </div>
          <div className="hero-actions">
            <span className="hero-note">Simulated portfolio<br /><strong>{amount(portfolio.totalCapital)} mandate</strong></span>
            <ActionButton loading={loading.analysis} onClick={() => runAction('analysis', async () => { const result = await runFullAnalysis(portfolio); await saveAnalysis(result); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setAnalysis(result); setOptimization(result.optimization); setControl(result.control); setExplanation(nextExplanation); getAnalysisHistory().then((history) => setRecords((current) => ({ ...current, analysis: history }))) })}>Run Full Analysis</ActionButton>
          </div>
        </section>

        {analysis ? <div className="analysis-banner"><div><span className="eyebrow">Full analysis complete</span><strong>{analysis.control.controlAction.replaceAll('_', ' ')}</strong></div><StatusPill status={analysis.risk.status} /><button type="button" onClick={() => setAnalysis(null)}>Clear</button></div> : null}

        <section className="metric-grid">
          <MetricCard label="Total capital" value={amount(currentMetrics.totalValue)} detail={simulation ? 'After selected scenario' : 'Current portfolio value'} accent="teal" />
          <MetricCard label="Expected return" value={percent(currentMetrics.expectedReturn)} detail={simulation ? 'Scenario-weighted estimate' : 'Weighted annual estimate'} accent="blue" />
          <MetricCard label="Portfolio risk" value={percent(currentMetrics.volatility)} detail={`Limit ${percent(portfolio.maximumRisk)}`} accent={currentRisk.status === 'LOW' ? 'teal' : 'amber'} />
          <MetricCard label="Liquidity score" value={percent(currentMetrics.liquidity)} detail={`Minimum ${percent(portfolio.minimumLiquidity)}`} accent="gold" />
        </section>

        <section className="market-strip panel"><div><span className="eyebrow">Market data basis</span><strong>{market?.source || 'Loading current indicators...'}</strong><small>{market ? `Last refreshed ${new Date(market.generatedAt).toLocaleString()}` : 'Planning metrics remain available if a provider is offline.'}</small></div><div className="market-chips">{market?.assets?.map((item) => <span key={item.assetId} className={`market-${item.status}`}>{item.assetId}: {item.status === 'live' ? `${percent(item.annualReturn)} 1Y` : item.status}</span>)}</div></section>

        <section className="overview-grid">
          <article className={`panel risk-panel risk-${currentRisk.status.toLowerCase()}`}>
            <SectionHeading kicker="Risk posture" title="Portfolio safety"><StatusPill status={currentRisk.status} /></SectionHeading>
            <div className="risk-headline"><strong>{currentRisk.isWithinLimits ? 'Within configured limits' : 'Attention required'}</strong><span>{currentRisk.isWithinLimits ? 'No immediate control action.' : 'Review the breaches below.'}</span></div>
            <div className="risk-stats">
              <div><span>Risk utilization</span><strong>{percent(currentRisk.risk.riskUtilization)}</strong><div className="progress"><i style={{ width: `${Math.min(currentRisk.risk.riskUtilization * 100, 100)}%` }} /></div></div>
              <div><span>Liquidity buffer</span><strong>{percent(currentRisk.liquidity.liquidityBuffer)}</strong><div className="progress progress-gold"><i style={{ width: `${Math.min(Math.max(currentRisk.liquidity.liquidityBuffer * 100, 0), 100)}%` }} /></div></div>
            </div>
            <div className="status-line"><span className="status-check">{currentRisk.isWithinLimits ? '✓' : '!'}</span><span>{currentRisk.isWithinLimits ? 'System is within configured limits' : `${currentRisk.breaches.length} threshold${currentRisk.breaches.length === 1 ? '' : 's'} breached`}</span></div>
          </article>
          <article className="panel allocation-panel">
            <SectionHeading kicker="Capital mix" title="Asset allocation" />
            <AllocationDonut assets={assets} />
          </article>
        </section>

        <section className="panel breakdown-panel">
          <SectionHeading kicker="Look-through view" title="Portfolio breakdown"><span className="section-caption">Values update from the selected scenario</span></SectionHeading>
          <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Allocation</th><th>Value</th><th>Expected return</th><th>Volatility</th><th>Liquidity</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.assetId}><td><span className="asset-dot" style={{ background: asset.color }} />{asset.assetId}</td><td>{percent(asset.allocation)}</td><td>{amount(asset.investedAmount)}</td><td>{percent(asset.expectedReturn)}</td><td>{percent(asset.volatility)}</td><td>{percent(asset.liquidityScore)}</td></tr>)}</tbody></table></div>
        </section>

        <section className="work-grid" id="optimization">
          <article className="panel action-panel">
            <SectionHeading kicker="Decision support" title="Optimization"><span className="panel-index">01</span></SectionHeading>
            <p className="panel-copy">Let the constrained engine search for a higher risk-adjusted allocation within the configured limits.</p>
            <ActionButton loading={loading.optimization} onClick={() => runAction('optimization', async () => { const result = await optimizePortfolio(portfolio); await saveAnalysis({ ...result, analysisType: 'optimization' }); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setOptimization(result); setExplanation(nextExplanation) })}>Optimize Portfolio</ActionButton>
            {optimization ? <div className="result-block"><div className="result-title"><span>Recommended allocation</span><span className="result-state">Constraints checked</span></div>{Object.entries(optimization.allocation).map(([assetId, value]) => <div className="bar-row" key={assetId}><span>{assetId}</span><div className="mini-bar"><i style={{ width: `${value * 100}%` }} /></div><strong>{percent(value)}</strong></div>)}<div className="result-metrics"><span>Return <b>{percent(optimization.metrics.expectedReturn)}</b></span><span>Risk <b>{percent(optimization.metrics.volatility)}</b></span><span>Liquidity <b>{percent(optimization.metrics.liquidityScore)}</b></span><span>Score <b>{optimization.metrics.riskAdjustedScore.toFixed(2)}</b></span></div><MonteCarloCard result={optimization.monteCarlo} /></div> : null}
          </article>

          <article className="panel action-panel" id="what-if">
            <SectionHeading kicker="Scenario lab" title="What-if market simulator"><span className="panel-index">02</span></SectionHeading>
            <p className="panel-copy">Test how the portfolio behaves under hypothetical market conditions.</p>
            <label className="field-label" htmlFor="scenario">Scenario</label><select id="scenario" value={selectedScenario} onChange={(event) => selectScenario(event.target.value)}>{scenarios.map((item) => <option key={item.name}>{item.name}</option>)}</select>
            <div className="shock-grid">{assets.map((asset) => <label key={asset.assetId}><span>{asset.assetId}</span><div className="percent-input"><input type="number" value={shockDraft[asset.assetId] ?? 0} onChange={(event) => setShockDraft((current) => ({ ...current, [asset.assetId]: event.target.value }))} /><b>%</b></div></label>)}</div>
            <ActionButton loading={loading.simulation} onClick={() => runAction('simulation', async () => { const result = await simulateScenario(portfolio, scenario); await saveSimulation(result); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setSimulation(result); setExplanation(nextExplanation); getSimulationHistory().then((history) => setRecords((current) => ({ ...current, simulations: history }))) })} tone="outline">Run & record simulation</ActionButton>
            {simulation ? <SimulationResult simulation={simulation} /> : null}
          </article>
        </section>

        {currentRisk.breaches?.length ? <section className="breach-panel"><div className="warning-symbol">!</div><div><span className="eyebrow">Threshold watch</span><h2>Risk conditions need attention</h2>{currentRisk.breaches.map((breach, index) => <p key={`${breach.type}-${index}`}><strong>{breach.type}:</strong> {breach.message} <span>Actual {percent(breach.actual)} / Limit {percent(breach.limit)}</span></p>)}</div></section> : null}

        <section className="panel controls-panel" id="controls">
          <SectionHeading kicker="Action layer" title="Control recommendation"><span className="panel-index">03</span></SectionHeading>
          <div className="control-intro"><div><p className="panel-copy">Translate a detected breach into a verified allocation recommendation. No trades are executed.</p><ActionButton loading={loading.control} onClick={() => runAction('control', async () => { const result = await generateControlRecommendation(portfolio, currentRisk, simulation); await saveControl(result); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setControl(result); setExplanation(nextExplanation) })}>Generate Control Recommendation</ActionButton></div>{control ? <div className="control-action"><span className="eyebrow">Control action</span><strong>{control.controlAction.replaceAll('_', ' ')}</strong></div> : null}</div>
          {control?.recommended ? <div className="control-result"><div className="control-metrics"><span>Risk change <b className={control.impact.riskChange <= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.riskChange)}</b></span><span>Liquidity change <b className={control.impact.liquidityChange >= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.liquidityChange)}</b></span><span>Return difference <b>{signedPercent(control.impact.returnChange)}</b></span></div><AllocationChanges changes={control.changes} /><MonteCarloCard result={control.monteCarlo} /><div className="explanation"><span className="eyebrow">Why this decision</span><strong>{control.explanation.summary}</strong>{control.explanation.reasons.map((reason, index) => <p key={index}>{reason}</p>)}</div></div> : control ? <div className="failure-note">{control.explanation.summary}<br />{control.validation.message}</div> : null}
        </section>
        <section className="panel profile-panel" id="profile"><SectionHeading kicker="Profile & records" title="Manage your plan and report" /><div className="profile-actions"><form onSubmit={(event) => { event.preventDefault(); runAction('profile', () => updateCurrentUser({ name: profileName }), (result) => { if (result?.user?.name) setProfileName(result.user.name) }) }}><input value={profileName} onChange={(event) => setProfileName(event.target.value)} aria-label="Profile name" /><ActionButton loading={loading.profile} onClick={() => runAction('profile', () => updateCurrentUser({ name: profileName }), (result) => { if (result?.user?.name) setProfileName(result.user.name) })}>Update profile</ActionButton></form><ActionButton loading={loading.report} tone="outline" onClick={() => runAction('report', () => downloadReport({ portfolio, analysis, simulation, control }), () => {})}>Download PDF report</ActionButton><button className="danger-button" type="button" onClick={async () => { if (window.confirm('Delete your profile? This cannot be undone.')) { await deleteCurrentUser(); onLogout() } }}>Delete profile</button></div><PortfolioEditor portfolio={portfolio} onSave={(nextPortfolio) => runAction('portfolio', async () => { await savePortfolio(nextPortfolio); return getPortfolio() }, setPortfolioData)} /><SavedRecords records={records} /></section>
        <ExplanationCard explanation={explanation} />
        <MarketOptimizationSection market={market} portfolio={portfolio} optimization={optimization} />
      </main>
      <footer className="site-footer"><div><span className="brand-mark">CG</span><strong>Capital Guardian</strong><p>Founder-first capital planning for decisions before money enters the market.</p></div><div><span className="eyebrow">Workspace</span><a href="#overview">Portfolio overview</a><a href="#optimization">Optimization</a><a href="#what-if">Market simulator</a></div><div><span className="eyebrow">Methodology</span><p>Live market indicators where available.<br />Monte Carlo validation. No trade execution.</p></div><div className="footer-legal">© {new Date().getFullYear()} Capital Guardian<br />Decision support, not investment advice.</div></footer>
    </div>
  )
}

function MarketOptimizationSection({ market, portfolio, optimization }) {
  const liveAssets = market?.assets?.filter((asset) => asset.status === 'live') || []
  const recommended = optimization?.allocation
  const bestSignal = [...liveAssets].sort((a, b) => b.annualReturn - a.annualReturn)[0]
  return <section className="market-optimization"><div className="market-optimization-copy"><span className="eyebrow">Capital positioning / market-aware</span><h2>Make your money work<br /><em>with the market context.</em></h2><p>These signals combine the live indicators available today with your risk and liquidity guardrails. They are inputs for planning, not a prediction or a trade instruction.</p><div className="market-plan"><span>Current capital</span><strong>{amount(portfolio.totalCapital)}</strong>{bestSignal ? <small>Strongest observed 1Y signal: <b>{bestSignal.assetId}</b> at {percent(bestSignal.annualReturn)}</small> : <small>Market data will appear when a provider is available.</small>}</div></div><div className="market-allocation-card"><div className="section-heading"><div><span className="eyebrow">Suggested capital map</span><h3>{recommended ? 'Optimization ready' : 'Run optimization to compare'}</h3></div><span className="live-dot" /></div>{recommended ? Object.entries(recommended).map(([assetId, value]) => <div className="market-allocation-row" key={assetId}><span>{assetId}</span><div><i style={{ width: `${value * 100}%` }} /></div><strong>{percent(value)}</strong></div>) : <div className="market-placeholder">Your optimized asset mix will appear here alongside real-market context.</div>}<div className="market-disclaimer">Market feed: {market?.source || 'connecting'} · Updated {market?.generatedAt ? new Date(market.generatedAt).toLocaleTimeString('en-IN') : 'when available'}</div></div></section>
}

function ExplanationCard({ explanation }) {
  if (!explanation) return null

  return (
    <section className="panel explanation-card" aria-live="polite">
      <div className="section-heading"><div><span className="eyebrow">Deterministic decision record</span><h2>Why did Capital Guardian make this decision?</h2></div><span className="explanation-confidence">{explanation.confidence}</span></div>
      <div className="explanation-decision"><span className="eyebrow">Decision</span><strong>{explanation.decision.replaceAll('_', ' ')}</strong><p>{explanation.summary}</p></div>
      <div className="explanation-grid">
        <div><span className="eyebrow">Reasons</span>{explanation.reasons.map((reason, index) => <p key={index}>• {reason}</p>)}</div>
        <div><span className="eyebrow">Key metrics</span>{explanation.metrics.map((metric) => <p key={metric.label}><span>{metric.label}</span><strong>{formatExplanationValue(metric)}</strong></p>)}</div>
        <div><span className="eyebrow">Action / impact</span>{[...(explanation.actions || []), ...(explanation.impact || [])].map((item, index) => <p key={index}>• {item}</p>)}</div>
      </div>
    </section>
  )
}

function SimulationResult({ simulation }) {
  const before = simulation.originalPortfolio
  const after = simulation.shockedPortfolio
  return <div className="simulation-result"><div className="comparison-grid"><div><span className="eyebrow">Before</span><strong>{amount(before.totalValue)}</strong><small>{percent(before.expectedReturn)} return · {percent(before.volatility)} risk</small></div><div className="comparison-arrow">→</div><div><span className="eyebrow">After</span><strong>{amount(after.totalValue)}</strong><small className={after.gainLoss >= 0 ? 'positive' : 'negative'}>{signedPercent(after.gainLossPercentage)} total change</small></div></div><div className="impact-list">{simulation.assetImpacts.map((asset) => <div key={asset.assetId}><span>{asset.assetId}</span><span>{signedPercent(asset.shockPercentage)}</span><span>{amount(asset.originalValue)} → {amount(asset.shockedValue)}</span><strong className={asset.valueChange >= 0 ? 'positive' : 'negative'}>{asset.valueChange >= 0 ? '+' : ''}{amount(asset.valueChange)}</strong></div>)}</div><div className="simulation-status"><StatusPill status={simulation.riskAssessment.status} /><span>Liquidity {percent(after.liquidity)} · Risk {percent(after.volatility)}</span></div></div>
}

function MonteCarloCard({ result }) {
  if (!result) return null
  return <div className="monte-carlo"><span className="eyebrow">Monte Carlo validation · {result.iterations.toLocaleString()} paths</span><div><span>Median end value <strong>{amount(result.percentile50)}</strong></span><span>95% downside risk <strong>{amount(result.downsideValueAtRisk95)}</strong></span><span>Loss probability <strong>{percent(result.probabilityOfLoss)}</strong></span></div><small>{result.method}. Results are scenario estimates, not a guarantee.</small></div>
}

function PortfolioEditor({ portfolio, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...portfolio, allocations: Object.fromEntries(Object.entries(portfolio.allocations).map(([id, value]) => [id, value * 100])) }))
  const total = Object.values(draft.allocations).reduce((sum, value) => sum + Number(value || 0), 0)
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (Math.abs(total - 100) > 0.01) return
    onSave({ ...portfolio, totalCapital: Number(draft.totalCapital), maximumRisk: Number(draft.maximumRisk), minimumLiquidity: Number(draft.minimumLiquidity), allocations: Object.fromEntries(Object.entries(draft.allocations).map(([id, value]) => [id, Number(value) / 100])) })
  }
  return <form className="portfolio-editor" onSubmit={submit}><span className="eyebrow">Editable portfolio inputs</span><div className="editor-basics"><label>Capital ₹<input type="number" min="1" value={draft.totalCapital} onChange={(event) => update('totalCapital', event.target.value)} /></label><label>Risk limit %<input type="number" min="1" max="100" value={draft.maximumRisk * 100} onChange={(event) => update('maximumRisk', Number(event.target.value) / 100)} /></label><label>Liquidity floor %<input type="number" min="0" max="100" value={draft.minimumLiquidity * 100} onChange={(event) => update('minimumLiquidity', Number(event.target.value) / 100)} /></label></div><div className="editor-assets">{Object.entries(draft.allocations).map(([assetId, value]) => <label key={assetId}>{assetId}<div className="percent-input"><input type="number" min="0" max="100" value={value} onChange={(event) => setDraft((current) => ({ ...current, allocations: { ...current.allocations, [assetId]: event.target.value } }))} /><b>%</b></div></label>)}</div><div className="editor-footer"><span className={Math.abs(total - 100) < .01 ? 'positive' : 'negative'}>Allocation total: {total.toFixed(1)}%</span><button className="action-button action-outline" type="submit" disabled={Math.abs(total - 100) > .01}>Save revised portfolio</button></div></form>
}

function SavedRecords({ records }) {
  const rows = [
    ...records.simulations.map((item) => ({ type: 'Simulation', title: item.scenarioName, value: amount(item.shockedPortfolioValue), state: item.riskStatus, at: item.createdAt })),
    ...records.analysis.map((item) => ({ type: 'Analysis', title: item.analysisType, value: percent(item.expectedReturn || 0), state: item.riskStatus, at: item.createdAt })),
    ...records.controls.map((item) => ({ type: 'Recommendation', title: item.controlAction?.replaceAll('_', ' '), value: item.riskImprovement === undefined ? 'Reviewed' : `${signedPercent(item.riskImprovement)} risk`, state: item.actionRequired ? 'ACTION' : 'LOW', at: item.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12)
  return <div className="saved-records"><div className="section-heading"><div><span className="eyebrow">Saved decision ledger</span><h2>Recorded analyses and simulations</h2></div><span className="record-count">{rows.length} saved</span></div>{rows.length ? <div className="record-list">{rows.map((row, index) => <div className="record-row" key={`${row.type}-${row.at}-${index}`}><span className="record-type">{row.type}</span><div><strong>{row.title}</strong><small>{new Date(row.at).toLocaleString('en-IN')}</small></div><span>{row.value}</span><StatusPill status={row.state} /></div>)}</div> : <div className="record-empty">Run an analysis, simulation, or recommendation to build your founder decision history. Every entry is kept under this profile.</div>}</div>
}

export default Dashboard
