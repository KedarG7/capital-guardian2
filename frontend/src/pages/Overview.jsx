import AnimatedPortfolioMonitor from '../components/dashboard/AnimatedPortfolioMonitor.jsx'
import AllocationDonut from '../components/dashboard/AllocationDonut.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import EditableCapitalCard from '../components/dashboard/EditableCapitalCard.jsx'
import StatusPill from '../components/dashboard/StatusPill.jsx'
import { SectionHeading, ActionButton, percent, amount } from '../components/dashboard/Shared.jsx'

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
  marketError
}) {
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
                return { result, explanation: await getExplanation(result) } 
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

      {analysis ? (
        <div className="analysis-banner">
          <div>
            <span className="eyebrow">Full analysis complete</span>
            <strong>{analysis.control.controlAction.replaceAll('_', ' ')}</strong>
          </div>
          <StatusPill status={analysis.risk.status} />
          <button type="button" onClick={() => setAnalysis(null)}>Clear</button>
        </div>
      ) : null}

      <AnimatedPortfolioMonitor 
        portfolio={portfolio}
        currentRisk={currentRisk}
        currentMetrics={currentMetrics}
        assets={assets}
        marketData={marketData}
        marketResponse={marketResponse}
        marketError={marketError}
      />

      <section className="panel mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <SectionHeading kicker="External Context" title="Current Market Conditions" />
          <div className="flex items-center text-xs mt-2 sm:mt-0 space-x-4">
            <div className="flex items-center">
              <span className="text-gray-500 mr-2 uppercase tracking-wider font-semibold">Market Data</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium ${
                marketError ? 'bg-red-50 text-red-700' :
                marketData?.mode === 'live' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  marketError ? 'bg-red-500' :
                  marketData?.mode === 'live' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                }`} />
                {marketError ? 'FALLBACK' : marketData?.mode === 'live' ? 'LIVE' : 'DEMO'}
              </span>
            </div>
            {marketData?.timestamp && (
              <span className="text-gray-400">
                Last updated: {new Date(marketData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {marketError && !marketData ? (
          <div className="text-red-600 text-sm">Live market data is temporarily unavailable. Capital Guardian is using demo market data.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {marketData?.assets.map((asset) => (
              <div key={asset.assetId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{asset.name}</span>
                <span className={`font-semibold ${
                  asset.dailyChangePercent > 0 ? 'text-green-600' : 
                  asset.dailyChangePercent < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {asset.dailyChangePercent > 0 ? '+' : ''}{asset.dailyChangePercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

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
