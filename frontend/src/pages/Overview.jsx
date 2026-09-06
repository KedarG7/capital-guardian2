import AnimatedPortfolioMonitor from '../components/dashboard/AnimatedPortfolioMonitor.jsx'
import AllocationDonut from '../components/dashboard/AllocationDonut.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import EditableCapitalCard from '../components/dashboard/EditableCapitalCard.jsx'
import StatusPill from '../components/dashboard/StatusPill.jsx'
import { SectionHeading, ActionButton, percent, amount } from '../components/dashboard/Shared.jsx'

import AlertBanner from '../components/dashboard/AlertBanner.jsx'
import MarketGuardianSection from '../components/dashboard/MarketGuardianSection.jsx'

export default function Overview({ 
  portfolio, 
  currentRisk, 
  currentMetrics, 
  simulation, 
  assets, 
  loading, 
  analysis, 
  runAction,
  setAnalysis,
  setOptimization,
  setControl,
  setExplanation,
  setPortfolioData,
  clearDependentState,
  marketData,
  marketResponse,
  marketError,
  alerts,
  markAlertRead
}) {
  const unreadAlerts = (alerts || []).filter(a => !a.read)

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Capital control workspace / {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <h1>See the whole<br /><em>capital picture.</em></h1>
          <p>Optimize capital. Detect risk. Simulate shocks. Recommend action.</p>
        </div>
        <div className="hero-actions">
          <span className="hero-note">Active portfolio<br /><strong>{amount(portfolio.totalCapital)} mandate</strong></span>
          <ActionButton 
            loading={loading.analysis} 
            onClick={() => runAction('analysis', 
              async () => { 
                const { runFullAnalysis, getExplanation } = await import('../services/api.js');
                const result = await runFullAnalysis(portfolio); 
                return { result, explanation: await getExplanation({ type: 'ANALYSIS' }) } 
              }, 
              ({ result, explanation: nextExplanation }) => { 
                setAnalysis(result); 
                setOptimization(result.optimization); 
                setControl(result.control); 
                setExplanation(nextExplanation) 
              }
            )}
          >
            Run Full Analysis
          </ActionButton>
        </div>
      </section>

      {unreadAlerts.length > 0 ? (
        <div className="alerts-container">
          {unreadAlerts.map(alert => (
            <AlertBanner key={alert._id} alert={alert} onDismiss={markAlertRead} />
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="text-green-500 font-bold text-lg leading-none">✓</span>
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wider">No active risk alerts</span>
        </div>
      )}

      <MarketGuardianSection 
        marketData={marketData}
        marketResponse={marketResponse}
        marketError={marketError}
        currentRisk={currentRisk}
        currentCapital={portfolio.totalCapital}
        setExplanation={setExplanation}
      />

      <section className="metric-grid">
        <EditableCapitalCard 
          currentCapital={portfolio.totalCapital} 
          runAction={runAction} 
          setPortfolioData={setPortfolioData} 
          clearDependentState={clearDependentState} 
          simulation={simulation} 
        />
        <MetricCard label="Expected return" value={percent(currentMetrics.expectedReturn)} detail={`Est. amount: ${amount(currentMetrics.totalValue * currentMetrics.expectedReturn)}`} accent="blue" />
        <MetricCard label="Portfolio risk" value={percent(currentMetrics.volatility)} detail={`Limit ${percent(portfolio.maximumRisk)}`} accent={currentRisk.status === 'LOW' ? 'teal' : 'amber'} />
        <MetricCard label="Liquidity score" value={percent(currentMetrics.liquidity)} detail={`Minimum ${percent(portfolio.minimumLiquidity)}`} accent="gold" />
      </section>

      <section className="overview-grid">
        <article className={`panel risk-panel risk-${currentRisk.status.toLowerCase()}`}>
          <SectionHeading kicker="Risk posture" title="Portfolio safety"><StatusPill status={currentRisk.status} /></SectionHeading>
          <div className="risk-headline">
            <strong>{currentRisk.isWithinLimits ? 'Within configured limits' : 'Attention required'}</strong>
            <span>{currentRisk.isWithinLimits ? 'No immediate control action.' : 'Review the breaches below.'}</span>
          </div>
          <div className="risk-stats">
            <div>
              <span>Risk utilization</span>
              <strong>{percent(currentRisk.risk.riskUtilization)}</strong>
              <div className="progress"><i style={{ width: `${Math.min(currentRisk.risk.riskUtilization * 100, 100)}%` }} /></div>
            </div>
            <div>
              <span>Liquidity buffer</span>
              <strong>{percent(currentRisk.liquidity.liquidityBuffer)}</strong>
              <div className="progress progress-gold"><i style={{ width: `${Math.min(Math.max(currentRisk.liquidity.liquidityBuffer * 100, 0), 100)}%` }} /></div>
            </div>
          </div>
          <div className="status-line">
            <span className="status-check">{currentRisk.isWithinLimits ? '✓' : '!'}</span>
            <span>{currentRisk.isWithinLimits ? 'System is within configured limits' : `${currentRisk.breaches.length} threshold${currentRisk.breaches.length === 1 ? '' : 's'} breached`}</span>
          </div>
        </article>
        <article className="panel allocation-panel">
          <SectionHeading kicker="Capital mix" title="Asset allocation" />
          <AllocationDonut assets={assets} />
        </article>
      </section>

      <section className="panel breakdown-panel mb-10">
        <SectionHeading kicker="Look-through view" title="Portfolio breakdown"><span className="section-caption">Values update from the selected scenario</span></SectionHeading>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Asset</th><th>Allocation</th><th>Value</th><th>Expected return</th><th>Volatility</th><th>Liquidity</th></tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.assetId}>
                  <td><span className="asset-dot" style={{ background: asset.color }} />{asset.assetId}</td>
                  <td>{percent(asset.allocation)}</td>
                  <td>{amount(asset.investedAmount)}</td>
                  <td>{percent(asset.expectedReturn)}</td>
                  <td>{percent(asset.volatility)}</td>
                  <td>{percent(asset.liquidityScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
