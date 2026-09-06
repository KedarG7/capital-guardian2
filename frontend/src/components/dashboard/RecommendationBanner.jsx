import React from 'react'
import { percent, amount } from './Shared.jsx'

export default function RecommendationBanner({ recommendationData }) {
  if (!recommendationData) return null

  const { current, recommended, impact, decision } = recommendationData

  if (decision.status === 'NO_RECOMMENDATION') return null

  if (decision.status === 'NO_VALID_REBALANCE') {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h3 className="text-gray-800 font-bold mb-2 uppercase tracking-wider text-sm">No Valid Rebalance</h3>
        <p className="text-gray-600 text-sm">Risk limit breached, but no feasible allocation satisfies all your configured constraints (e.g., minimum liquidity, asset bounds). Consider adjusting your portfolio configuration.</p>
      </div>
    )
  }

  const isUrgent = decision.status === 'URGENT_REBALANCE_RECOMMENDED'

  return (
    <div className={`mb-6 rounded-xl border ${isUrgent ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'} shadow-sm overflow-hidden`}>
      <div className={`p-4 ${isUrgent ? 'bg-red-100 text-red-900' : 'bg-blue-100 text-blue-900'} flex items-center gap-3`}>
        <span className="text-2xl leading-none">🤖</span>
        <div>
          <h3 className="font-bold text-sm tracking-wider uppercase">Capital Guardian Recommendation</h3>
          <p className="text-sm opacity-90">{isUrgent ? 'URGENT: ' : ''}Portfolio risk exceeded your configured threshold after a significant market move.</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Allocation</h4>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {Object.entries(current.allocation).map(([asset, weight]) => (
              <div key={asset} className="bg-white p-2 rounded border border-gray-100 text-center">
                <div className="text-xs text-gray-500 capitalize">{asset}</div>
                <div className="font-semibold text-gray-800">{percent(weight)}</div>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recommended Allocation</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(recommended.allocation).map(([asset, weight]) => (
              <div key={asset} className="bg-white p-2 rounded border border-blue-100 text-center shadow-sm">
                <div className="text-xs text-blue-600 capitalize">{asset}</div>
                <div className="font-bold text-blue-900">{percent(weight)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-4 bg-white/50 p-4 rounded-lg">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-600">Risk</span>
            <div className="text-right">
              <span className="line-through text-gray-400 mr-2">{percent(current.risk)}</span>
              <span className="font-bold text-green-600">{percent(recommended.risk)}</span>
              <div className="text-xs text-green-600">{percent(impact.riskChange)}</div>
            </div>
          </div>
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-600">Liquidity</span>
            <div className="text-right">
              <span className="line-through text-gray-400 mr-2">{percent(current.liquidity)}</span>
              <span className="font-bold text-blue-600">{percent(recommended.liquidity)}</span>
              <div className="text-xs text-blue-600">+{percent(impact.liquidityChange)}</div>
            </div>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span className="text-sm font-semibold text-gray-600">Expected Return</span>
            <div className="text-right">
              <span className="line-through text-gray-400 mr-2">{percent(current.expectedReturn)}</span>
              <span className="font-bold text-gray-800">{percent(recommended.expectedReturn)}</span>
              <div className="text-xs text-gray-500">{percent(impact.returnChange)}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 text-sm text-gray-500 italic">
        * Recommendations are generated deterministically based on your configured portfolio constraints.
      </div>
    </div>
  )
}
