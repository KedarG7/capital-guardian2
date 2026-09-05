import { amount, percent, signedPercent } from '../../utils/formatters.js' // Assuming formatters exist or I can use inline
import { DecisionTimeline } from './DecisionTimeline.jsx'

export function ExplanationCard({ explanation }) {
  if (!explanation) return null

  // Fallback to old format if new fields aren't present (defensive)
  const isLegacy = !explanation.portfolioImpact && !explanation.expectedImpact

  return (
    <section className="panel explanation-card bg-white shadow-sm border border-gray-200 rounded-xl mt-8" aria-live="polite">
      <div className="section-heading p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <span className="eyebrow text-xs font-bold text-gray-500 uppercase tracking-wider">Capital Guardian Decision Center</span>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">Why did Capital Guardian make this decision?</h2>
        </div>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{explanation.confidence || 'DETERMINISTIC'}</span>
      </div>

      {/* DECISION HEADER */}
      <div className="p-6 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Decision</span>
        <strong className="text-lg text-gray-900 block mb-2">
          {explanation.decision === 'NO_ACTION' ? '✓ NO ACTION REQUIRED' : 
           explanation.decision.includes('RECOMMENDED') ? `⚠ ${explanation.decision.replace(/_/g, ' ')}` :
           explanation.decision.replace(/_/g, ' ')}
        </strong>
        <p className="text-sm text-gray-700">{explanation.summary}</p>
      </div>

      {/* DYNAMIC SECTIONS */}
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
                    {change.changePercent > 0 ? '+' : ''}{change.changePercent}%
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
                 <span className="block text-gray-500">Expected Return</span>
                 <span className="block text-gray-900 font-medium">{explanation.expectedImpact.returnChange}</span>
               </div>
               <div>
                 <span className="block text-gray-500">Portfolio Risk</span>
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
              {explanation.constraints.satisfied.map((c, i) => (
                <div key={`sat-${i}`} className="text-green-700">✓ {c}</div>
              ))}
              {explanation.constraints.notSatisfied.map((c, i) => (
                <div key={`unsat-${i}`} className="text-red-700">✗ {c}</div>
              ))}
            </div>
          </div>
        )}

        {explanation.reasons?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Why this decision?</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
              {explanation.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ol>
          </div>
        )}

        {explanation.dataSource && (
          <div className="pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>Data Source: {explanation.dataSource.mode} {explanation.dataSource.source ? `(${explanation.dataSource.source})` : ''}</span>
            {explanation.dataSource.timestamp && <span>{new Date(explanation.dataSource.timestamp).toLocaleString()}</span>}
          </div>
        )}

      </div>
    </section>
  )
}
