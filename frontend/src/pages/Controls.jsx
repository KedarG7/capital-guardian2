import { SectionHeading, ActionButton, percent, signedPercent } from '../components/dashboard/Shared.jsx'
import { AllocationChanges } from '../components/dashboard/Shared.jsx'

export default function Controls({
  portfolio,
  currentRisk,
  simulation,
  control,
  loading,
  runAction,
  setControl,
  setExplanation,
  marketResponse
}) {
  return (
    <div className="max-w-4xl mx-auto pt-6 pb-12">
      {currentRisk.breaches?.length ? (
        <section className="breach-panel mb-8">
          <div className="warning-symbol">!</div>
          <div>
            <span className="eyebrow">Threshold watch</span>
            <h2>Risk conditions need attention</h2>
            {currentRisk.breaches.map((breach, index) => (
              <p key={`${breach.type}-${index}`}>
                <strong>{breach.type}:</strong> {breach.message} 
                <span>Actual {percent(breach.actual)} / Limit {percent(breach.limit)}</span>
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {marketResponse?.events?.length > 0 && (
        <section className="panel mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <SectionHeading kicker="Market Event" title="System Response Context" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Market Event</span>
              <div className="mt-2 text-sm text-gray-800">
                {marketResponse.events.map((e, i) => (
                  <div key={i}>{e.asset} {e.changePercent > 0 ? 'increased' : 'declined'} {Math.abs(e.changePercent).toFixed(1)}%</div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Risk Response</span>
              <div className="mt-2 text-sm text-gray-800">
                Portfolio risk moved to <span className="font-semibold">{marketResponse.risk.status}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Control Action</span>
              <div className="mt-2 text-sm text-gray-800 font-semibold">
                {marketResponse.recommendation.action.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
          {marketResponse.controlDecision?.recommended && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Recommended Change</span>
              <AllocationChanges changes={marketResponse.controlDecision.changes} />
            </div>
          )}
        </section>
      )}

      <section className="panel controls-panel" id="controls">
        <SectionHeading kicker="Action layer" title="Control recommendation"><span className="panel-index">03</span></SectionHeading>
        <div className="control-intro">
          <div>
            <p className="panel-copy">Translate a detected breach into a verified allocation recommendation. No trades are executed.</p>
            <ActionButton 
              loading={loading.control} 
              onClick={() => runAction('control', 
                async () => { 
                  const { generateControlRecommendation, getExplanation } = await import('../services/api.js');
                  const result = await generateControlRecommendation(portfolio, currentRisk, simulation); 
                  return { result, explanation: await getExplanation(result) } 
                }, 
                ({ result, explanation: nextExplanation }) => { 
                  setControl(result); 
                  setExplanation(nextExplanation) 
                }
              )}
            >
              Generate Control Recommendation
            </ActionButton>
          </div>
          {control ? (
            <div className="control-action">
              <span className="eyebrow">Control action</span>
              <strong>{control.controlAction.replaceAll('_', ' ')}</strong>
            </div>
          ) : null}
        </div>

        {control?.recommended ? (
          <div className="control-result">
            <div className="control-metrics">
              <span>Risk change <b className={control.impact.riskChange <= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.riskChange)}</b></span>
              <span>Liquidity change <b className={control.impact.liquidityChange >= 0 ? 'positive' : 'negative'}>{signedPercent(control.impact.liquidityChange)}</b></span>
              <span>Return difference <b>{signedPercent(control.impact.returnChange)}</b></span>
            </div>
            <AllocationChanges changes={control.changes} />
            <div className="explanation">
              <span className="eyebrow">Why this decision</span>
              <strong>{control.explanation.summary}</strong>
              {control.explanation.reasons.map((reason, index) => <p key={index}>{reason}</p>)}
            </div>
          </div>
        ) : control ? (
          <div className="failure-note">
            {control.explanation.summary}<br />{control.validation.message}
          </div>
        ) : null}
      </section>
    </div>
  )
}
