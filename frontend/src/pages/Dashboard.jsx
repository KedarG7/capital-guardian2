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
  const [loading, setLoading] = useState({ portfolio: true })
  const [error, setError] = useState('')

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
        getExplanation(portfolioResult.risk).then(setExplanation).catch(() => {})
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
          <a className="active" href="#overview">Overview</a>
          <a href="#optimization">Optimization</a>
          <a href="#what-if">What-If</a>
          <a href="#controls">Controls</a>
        </nav>
        <div className="topbar-meta"><span className="live-dot" />System online <span className="demo-tag">{user?.name || user?.email}</span><button className="logout-button" type="button" onClick={onLogout}>Sign out</button></div>
      </header>

      {error ? <div className="error-banner" role="alert"><strong>Action unavailable.</strong> {error}<button onClick={() => setError('')} type="button">Dismiss</button></div> : null}

      <main>
        <section className="hero" id="overview">
          <div>
            <span className="eyebrow">Capital control workspace / 06 Sep 2026</span>
            <h1>See the whole<br /><em>capital picture.</em></h1>
            <p>Optimize capital. Detect risk. Simulate shocks. Recommend action.</p>
          </div>
          <div className="hero-actions">
            <span className="hero-note">Simulated portfolio<br /><strong>₹1 crore mandate</strong></span>
            <ActionButton loading={loading.analysis} onClick={() => runAction('analysis', async () => { const result = await runFullAnalysis(portfolio); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setAnalysis(result); setOptimization(result.optimization); setControl(result.control); setExplanation(nextExplanation) })}>Run Full Analysis</ActionButton>
          </div>
        </section>

        {analysis ? <div className="analysis-banner"><div><span className="eyebrow">Full analysis complete</span><strong>{analysis.control.controlAction.replaceAll('_', ' ')}</strong></div><StatusPill status={analysis.risk.status} /><button type="button" onClick={() => setAnalysis(null)}>Clear</button></div> : null}

        <section className="metric-grid">
          <MetricCard label="Total capital" value={amount(currentMetrics.totalValue)} detail={simulation ? 'After selected scenario' : 'Current portfolio value'} accent="teal" />
          <MetricCard label="Expected return" value={percent(currentMetrics.expectedReturn)} detail={simulation ? 'Scenario-weighted estimate' : 'Weighted annual estimate'} accent="blue" />
          <MetricCard label="Portfolio risk" value={percent(currentMetrics.volatility)} detail={`Limit ${percent(portfolio.maximumRisk)}`} accent={currentRisk.status === 'LOW' ? 'teal' : 'amber'} />
          <MetricCard label="Liquidity score" value={percent(currentMetrics.liquidity)} detail={`Minimum ${percent(portfolio.minimumLiquidity)}`} accent="gold" />
        </section>

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
            <ActionButton loading={loading.optimization} onClick={() => runAction('optimization', async () => { const result = await optimizePortfolio(portfolio); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setOptimization(result); setExplanation(nextExplanation) })}>Optimize Portfolio</ActionButton>
            {optimization ? <div className="result-block"><div className="result-title"><span>Recommended allocation</span><span className="result-state">Constraints checked</span></div>{Object.entries(optimization.allocation).map(([assetId, value]) => <div className="bar-row" key={assetId}><span>{assetId}</span><div className="mini-bar"><i style={{ width: `${value * 100}%` }} /></div><strong>{percent(value)}</strong></div>)}<div className="result-metrics"><span>Return <b>{percent(optimization.metrics.expectedReturn)}</b></span><span>Risk <b>{percent(optimization.metrics.volatility)}</b></span><span>Liquidity <b>{percent(optimization.metrics.liquidityScore)}</b></span><span>Score <b>{optimization.metrics.riskAdjustedScore.toFixed(2)}</b></span></div></div> : null}
          </article>

          <article className="panel action-panel" id="what-if">
            <SectionHeading kicker="Scenario lab" title="What-if market simulator"><span className="panel-index">02</span></SectionHeading>
            <p className="panel-copy">Test how the portfolio behaves under hypothetical market conditions.</p>
            <label className="field-label" htmlFor="scenario">Scenario</label><select id="scenario" value={selectedScenario} onChange={(event) => selectScenario(event.target.value)}>{scenarios.map((item) => <option key={item.name}>{item.name}</option>)}</select>
            <div className="shock-grid">{assets.map((asset) => <label key={asset.assetId}><span>{asset.assetId}</span><div className="percent-input"><input type="number" value={shockDraft[asset.assetId] ?? 0} onChange={(event) => setShockDraft((current) => ({ ...current, [asset.assetId]: event.target.value }))} /><b>%</b></div></label>)}</div>
            <ActionButton loading={loading.simulation} onClick={() => runAction('simulation', async () => { const result = await simulateScenario(portfolio, scenario); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setSimulation(result); setExplanation(nextExplanation) })} tone="outline">Run Simulation</ActionButton>
            {simulation ? <SimulationResult simulation={simulation} /> : null}
          </article>
        </section>

        {currentRisk.breaches?.length ? <section className="breach-panel"><div className="warning-symbol">!</div><div><span className="eyebrow">Threshold watch</span><h2>Risk conditions need attention</h2>{currentRisk.breaches.map((breach, index) => <p key={`${breach.type}-${index}`}><strong>{breach.type}:</strong> {breach.message} <span>Actual {percent(breach.actual)} / Limit {percent(breach.limit)}</span></p>)}</div></section> : null}

        <section className="panel controls-panel" id="controls">
          <SectionHeading kicker="Action layer" title="Control recommendation"><span className="panel-index">03</span></SectionHeading>
          <div className="control-intro"><div><p className="panel-copy">Translate a detected breach into a verified allocation recommendation. No trades are executed.</p><ActionButton loading={loading.control} onClick={() => runAction('control', async () => { const result = await generateControlRecommendation(portfolio, currentRisk, simulation); return { result, explanation: await getExplanation(result) } }, ({ result, explanation: nextExplanation }) => { setControl(result); setExplanation(nextExplanation) })}>Generate Control Recommendation</ActionButton></div>{control ? <div className="control-action"><span className="eyebrow">Control action</span><strong>{control.controlAction.replaceAll('_', ' ')}</strong></div> : null}</div>
          {control?.recommended ? <div className="control-result"><div className="control-metrics"><span>Risk change <b className={control.impact.riskChange <= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.riskChange)}</b></span><span>Liquidity change <b className={control.impact.liquidityChange >= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.liquidityChange)}</b></span><span>Return difference <b>{signedPercent(control.impact.returnChange)}</b></span></div><AllocationChanges changes={control.changes} /><div className="explanation"><span className="eyebrow">Why this decision</span><strong>{control.explanation.summary}</strong>{control.explanation.reasons.map((reason, index) => <p key={index}>{reason}</p>)}</div></div> : control ? <div className="failure-note">{control.explanation.summary}<br />{control.validation.message}</div> : null}
        </section>
        <ExplanationCard explanation={explanation} />
      </main>
      <footer><span>Capital Guardian / Simulated Portfolio</span><span>Deterministic decision support · Not investment advice</span></footer>
    </div>
  )
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

export default Dashboard
