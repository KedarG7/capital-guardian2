import { SectionHeading, ActionButton, percent } from '../components/dashboard/Shared.jsx'
import { ExplanationCard } from '../components/dashboard/Shared.jsx'

export default function Optimization({ 
  portfolio, 
  optimization, 
  loading, 
  runAction,
  setOptimization,
  setExplanation,
  explanation,
  marketResponse
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
              return { result, explanation: await getExplanation({ type: 'OPTIMIZATION' }) } 
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
              <span>{optimization.source === 'MARKET_GUARDIAN' ? 'Market Guardian Recommendation' : 'Manual Optimization'}</span>
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
        ) : marketResponse?.recommendationData?.recommended ? (
          <div className="result-block mt-8">
            <div className="result-title">
              <span>Market Guardian Recommendation</span>
              <span className="result-state">Constraints checked</span>
            </div>
            {Object.entries(marketResponse.recommendationData.recommended.allocation).map(([assetId, value]) => (
              <div className="bar-row" key={assetId}>
                <span>{assetId}</span>
                <div className="mini-bar"><i style={{ width: `${value * 100}%` }} /></div>
                <strong>{percent(value)}</strong>
              </div>
            ))}
            <div className="result-metrics">
              <span>Return <b>{percent(marketResponse.recommendationData.recommended.expectedReturn)}</b></span>
              <span>Risk <b>{percent(marketResponse.recommendationData.recommended.risk)}</b></span>
              <span>Liquidity <b>{percent(marketResponse.recommendationData.recommended.liquidity)}</b></span>
            </div>
          </div>
        ) : null}
      </article>

    </div>
  )
}
