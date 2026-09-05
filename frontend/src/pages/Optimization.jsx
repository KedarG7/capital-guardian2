import { SectionHeading, ActionButton, percent } from '../components/dashboard/Shared.jsx'
import { ExplanationCard } from '../components/dashboard/Shared.jsx'

export default function Optimization({ 
  portfolio, 
  optimization, 
  loading, 
  runAction,
  setOptimization,
  setExplanation,
  explanation
}) {
  return (
    <div className="max-w-4xl mx-auto pt-6 pb-12">
      <article className="panel action-panel mb-8">
        <SectionHeading kicker="Decision support" title="Optimization"><span className="panel-index">01</span></SectionHeading>
        <p className="panel-copy">Let the constrained engine search for a higher risk-adjusted allocation within the configured limits.</p>
        <ActionButton 
          loading={loading.optimization} 
          onClick={() => runAction('optimization', 
            async () => { 
              const { optimizePortfolio, getExplanation } = await import('../services/api.js');
              const result = await optimizePortfolio(portfolio); 
              return { result, explanation: await getExplanation(result) } 
            }, 
            ({ result, explanation: nextExplanation }) => { 
              setOptimization(result); 
              setExplanation(nextExplanation) 
            }
          )}
        >
          Optimize Portfolio
        </ActionButton>
        {optimization ? (
          <div className="result-block">
            <div className="result-title">
              <span>Recommended allocation</span>
              <span className="result-state">Constraints checked</span>
            </div>
            {Object.entries(optimization.allocation).map(([assetId, value]) => (
              <div className="bar-row" key={assetId}>
                <span>{assetId}</span>
                <div className="mini-bar"><i style={{ width: `${value * 100}%` }} /></div>
                <strong>{percent(value)}</strong>
              </div>
            ))}
            <div className="result-metrics">
              <span>Return <b>{percent(optimization.metrics.expectedReturn)}</b></span>
              <span>Risk <b>{percent(optimization.metrics.volatility)}</b></span>
              <span>Liquidity <b>{percent(optimization.metrics.liquidityScore)}</b></span>
              <span>Score <b>{optimization.metrics.riskAdjustedScore.toFixed(2)}</b></span>
            </div>
          </div>
        ) : null}
      </article>

      {/* Show explanation only if it relates to optimization, otherwise keep it general, but since explanation state is shared and updated upon Optimization, we can show it here if it exists. */}
      {explanation && explanation.decision.includes('OPTIMIZ') && <ExplanationCard key={explanation.decisionId || Date.now()} explanation={explanation} />}
    </div>
  )
}
