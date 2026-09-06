import StatusPill from './StatusPill.jsx'
import { DecisionTimeline } from './DecisionTimeline.jsx'

export const assetColors = {
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

export const percent = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${(value * 100).toFixed(digits)}%`
}
export const amount = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return currency.format(value)
}
export const signedPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${value >= 0 ? '+' : ''}${percent(value)}`
}

export const formatExplanationValue = (metric) => {
  if (typeof metric.value !== 'number') return metric.value
  if (metric.label.toLowerCase().includes('value')) return amount(metric.value)
  if (/return|risk|liquidity|volatility|utilization|buffer/.test(metric.label.toLowerCase())) return percent(metric.value)
  return metric.value
}

export function ActionButton({ children, onClick, loading, tone = 'dark' }) {
  return (
    <button className={`action-button action-${tone}`} onClick={onClick} disabled={loading} type="button">
      {loading ? <span className="button-spinner" /> : null}
      {loading ? 'Working...' : children}
    </button>
  )
}

export function SectionHeading({ kicker, title, children }) {
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

export function AllocationChanges({ changes }) {
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

export function ExplanationCard({ explanation: apiResponse }) {
  if (!apiResponse) return null

  const isAi = apiResponse.source === 'AI'
  const explanation = apiResponse.explanation || apiResponse
  const sourceLabel = isAi ? '✨ AI EXPLANATION' : 'VERIFIED SYSTEM EXPLANATION'

  return (
    <section className="panel explanation-card bg-white shadow-sm border border-gray-200 rounded-xl mt-8" aria-live="polite">
      <div className="section-heading p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <span className="eyebrow text-xs font-bold text-gray-500 uppercase tracking-wider">Capital Guardian Decision Center</span>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">Why did Capital Guardian make this decision?</h2>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isAi ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          {sourceLabel}
        </span>
      </div>

      {isAi ? (
        <div className="p-6 space-y-6 text-sm text-gray-800">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-5">
            <h3 className="text-lg font-bold text-purple-900 mb-2">{explanation.headline}</h3>
            <p className="text-purple-800">{explanation.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Market Trigger</h4>
              <p className="mb-4">{explanation.trigger}</p>

              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Market Impact</h4>
              <p className="mb-4">{explanation.marketImpact}</p>

              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Portfolio Impact</h4>
              <p className="mb-4">{explanation.portfolioImpact}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Risk Assessment</h4>
              <p className="mb-4">{explanation.riskAssessment}</p>

              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Decision</h4>
              <p className="mb-4">{explanation.decisionExplanation}</p>

              {explanation.recommendationExplanation && (
                <>
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">Why this recommendation?</h4>
                  <p className="mb-4">{explanation.recommendationExplanation}</p>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2">Expected Impact</h4>
              <p>{explanation.expectedImpact}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-2">Constraints</h4>
              <p>{explanation.constraintExplanation}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end text-xs text-gray-400">
            <span>Data Source: {explanation.dataMode}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Decision</span>
            <strong className="text-lg text-gray-900 block mb-2">
              {explanation.decision === 'NO_ACTION' ? '✓ NO ACTION REQUIRED' : 
               explanation.decision?.includes('RECOMMENDED') ? `⚠ ${explanation.decision.replace(/_/g, ' ')}` :
               explanation.decision?.replace(/_/g, ' ')}
            </strong>
            <p className="text-sm text-gray-700">{explanation.summary}</p>
          </div>

          <div className="p-6 space-y-8">
            {explanation.trigger && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">What Changed?</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500">Trigger</span>
                    <strong className="block text-gray-900">{explanation.trigger.title}</strong>
                    <span className="text-gray-700">{explanation.trigger.description}</span>
                  </div>
                  {explanation.portfolioImpact?.before && explanation.portfolioImpact?.after && (
                    <>
                      <div>
                        <span className="block text-gray-500">Portfolio Risk</span>
                        <span className="block text-gray-900">{explanation.portfolioImpact.before.risk} → {explanation.portfolioImpact.after.risk}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500">Risk Utilization</span>
                        <span className="block text-gray-900">{explanation.portfolioImpact.before.riskUtilization} → {explanation.portfolioImpact.after.riskUtilization}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500">Liquidity</span>
                        <span className="block text-gray-900">{explanation.portfolioImpact.before.liquidity} → {explanation.portfolioImpact.after.liquidity}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {explanation.expectedImpact?.allocationChanges?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">What Should Change?</h3>
                <div className="space-y-2 text-sm">
                  {explanation.expectedImpact.allocationChanges.map((change, i) => (
                    <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{change.assetId}</span>
                      <span className="text-gray-600">{change.oldWeight} → {change.newWeight}</span>
                      <span className={`font-semibold ${change.changePercent > 0 ? 'text-green-600' : change.changePercent < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {change.changePercent > 0 ? '+' : ''}{change.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanation.expectedImpact && (
               <div>
                 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Expected Impact</h3>
                 <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                   <div>
                     <span className="block text-gray-500" title="Model-based expected return used by this prototype.">Expected Return ⓘ</span>
                     <span className="block text-gray-900 font-medium">{explanation.expectedImpact.returnChange}</span>
                   </div>
                   <div>
                     <span className="block text-gray-500" title="Model-based portfolio volatility estimate.">Portfolio Risk ⓘ</span>
                     <span className="block text-gray-900 font-medium">{explanation.expectedImpact.riskChange}</span>
                   </div>
                   <div>
                     <span className="block text-gray-500">Liquidity</span>
                     <span className="block text-gray-900 font-medium">{explanation.expectedImpact.liquidityChange}</span>
                   </div>
                 </div>
               </div>
            )}

            {explanation.constraints && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Control Check</h3>
                <div className="space-y-1 text-sm">
                  {explanation.constraints.satisfied?.map((c, i) => (
                    <div key={`sat-${i}`} className="text-green-700">✓ {c}</div>
                  ))}
                  {explanation.constraints.notSatisfied?.map((c, i) => (
                    <div key={`unsat-${i}`} className="text-red-700">✗ {c}</div>
                  ))}
                  {!explanation.constraints.satisfied?.length && !explanation.constraints.notSatisfied?.length && (
                    <div className="text-gray-500">No constraints verified for this action.</div>
                  )}
                </div>
              </div>
            )}

            {explanation.reasons?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Why this decision?</h3>
                {explanation.decision === 'NO_ACTION' && (
                  <div className="mb-3 text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-100">
                    Capital Guardian detected no condition requiring portfolio intervention at this time.
                  </div>
                )}
                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                  {explanation.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ol>
              </div>
            )}

            {!explanation.trigger && !explanation.expectedImpact && explanation.metrics?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Key Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {explanation.metrics.map((m, i) => (
                    <div key={i}>
                      <span className="block text-gray-500">{m.label}</span>
                      <span className="block text-gray-900 font-medium">{formatExplanationValue(m)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {explanation.dataSource && (
              <div className="pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>Data Source: {explanation.dataSource.mode} {explanation.dataSource.source ? `(${explanation.dataSource.source})` : ''}</span>
                {explanation.dataSource.timestamp && <span>{new Date(explanation.dataSource.timestamp).toLocaleString()}</span>}
              </div>
            )}
          </div>
        </>
      )}

      <div className="bg-gray-50 rounded-b-xl border-t border-gray-100">
        <DecisionTimeline />
      </div>
    </section>
  )
}

export function SimulationResult({ simulation }) {
  const before = simulation.originalPortfolio
  const after = simulation.shockedPortfolio
  return (
    <div className="simulation-result">
      <div className="comparison-grid">
        <div><span className="eyebrow">Before</span><strong>{amount(before.totalValue)}</strong><small>{percent(before.expectedReturn)} return · {percent(before.volatility)} risk</small></div>
        <div className="comparison-arrow">→</div>
        <div><span className="eyebrow">After</span><strong>{amount(after.totalValue)}</strong><small className={after.gainLoss >= 0 ? 'positive' : 'negative'}>{signedPercent(after.gainLossPercentage)} total change</small></div>
      </div>
      <div className="impact-list">
        {simulation.assetImpacts.map((asset) => (
          <div key={asset.assetId}>
            <span>{asset.assetId}</span>
            <span>{signedPercent(asset.shockPercentage)}</span>
            <span>{amount(asset.originalValue)} → {amount(asset.shockedValue)}</span>
            <strong className={asset.valueChange >= 0 ? 'positive' : 'negative'}>{asset.valueChange >= 0 ? '+' : ''}{amount(asset.valueChange)}</strong>
          </div>
        ))}
      </div>
      <div className="simulation-status">
        <StatusPill status={simulation.riskAssessment.status} />
        <span>Liquidity {percent(after.liquidity)} · Risk {percent(after.volatility)}</span>
      </div>
    </div>
  )
}
