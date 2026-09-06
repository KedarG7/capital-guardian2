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

      {marketResponse?.detection?.detected && (
        <section className="panel mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <SectionHeading kicker="Chain of Events" title="System Response Context" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Market Event</span>
              <strong className="text-gray-900 mb-1">{marketResponse.detection.severity}</strong>
              <span className="text-xs text-gray-500">{marketResponse.detection.direction}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border-l-4 border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Risk Assessment</span>
              <strong className="text-gray-900 mb-1">{marketResponse.risk.status}</strong>
              <span className="text-xs text-gray-500">Utilization {percent(marketResponse.risk.riskUtilization)}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border-l-4 border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Control Decision</span>
              <strong className="text-gray-900 mb-1">{marketResponse.recommendationData?.decision?.status?.replace(/_/g, ' ') || 'NO ACTION'}</strong>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border-l-4 border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recommendation</span>
              <strong className="text-gray-900 mb-1">
                {!marketResponse.recommendationData || marketResponse.recommendationData.decision?.status === 'NO_RECOMMENDATION' ? 'Hold' : 'Rebalance'}
              </strong>
            </div>
          </div>
          <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-3 rounded italic text-center">
            * This is a recommendation only. No trades have been executed.
          </div>
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
                  return { result, explanation: await getExplanation({ type: 'CONTROL', scenario: simulation.scenario, eventId: result.decisionEventId }) } 
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
