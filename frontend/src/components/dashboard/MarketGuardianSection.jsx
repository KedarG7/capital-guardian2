import React, { useState } from 'react'
import { SectionHeading, ActionButton, percent, amount, signedPercent } from './Shared.jsx'
import RecommendationBanner from './RecommendationBanner.jsx'
import { getExplanation } from '../../services/api.js'

export default function MarketGuardianSection({ marketData, marketResponse, marketError, currentRisk, currentCapital, setExplanation }) {
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  
  const handleExplainDecision = async () => {
    setLoadingExplanation(true)
    try {
      const result = await getExplanation({ type: 'MARKET_GUARDIAN', eventId: marketResponse?.decisionEventId })
      setExplanation(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingExplanation(false)
    }
  }

  const detection = marketResponse?.detection
  const riskAfter = marketResponse?.risk
  const riskBefore = currentRisk

  return (
    <section className="panel mb-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <SectionHeading kicker="System Monitor" title="Market Guardian" />
      </div>

      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Market Status</span>
          <strong className={`text-lg ${detection?.severity === 'EXTREME' ? 'text-red-600' : 'text-gray-900'}`}>
            {detection?.severity || 'STABLE'}
          </strong>
        </div>
        <div>
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Risk Status</span>
          <strong className={`text-lg ${riskAfter?.status === 'CRITICAL' || riskAfter?.status === 'HIGH' ? 'text-red-600' : 'text-gray-900'}`}>
            {riskAfter?.status || riskBefore?.status || 'UNKNOWN'}
          </strong>
        </div>
        <div>
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Checked</span>
          <strong className="text-lg text-gray-900">
            {marketData?.timestamp ? new Date(marketData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}
          </strong>
        </div>
        <div>
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data Source</span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-xs mt-1 ${
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
      </div>

      <div className="border-t border-gray-100 p-6 bg-white">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Real Market Monitor</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {marketData?.assets?.filter(a => a.assetId !== 'stocks' && a.assetId !== 'bonds' && a.assetId !== 'gold' && a.assetId !== 'cash').map(asset => (
            <div key={asset.assetId} className="flex flex-col p-3 bg-gray-50 rounded border border-gray-100">
              <span className="font-medium text-gray-700 uppercase">{asset.assetName || asset.assetId}</span>
              <div className="flex justify-between mt-1 items-center">
                <span className="text-gray-900 font-bold">₹{asset.currentValue?.toFixed(2)}</span>
                <span className={`font-semibold text-sm ${
                  (asset.dailyChangePercent || 0) > 0 ? 'text-green-600' : 
                  (asset.dailyChangePercent || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {(asset.dailyChangePercent || 0) > 0 ? '+' : ''}{(asset.dailyChangePercent || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detection?.detected && (
        <div className="border-t border-gray-100 p-6 bg-red-50/30">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Market Event Detected</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="block text-xs text-gray-500">Severity</span>
              <strong className="text-gray-900">{detection.severity}</strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Direction</span>
              <strong className="text-gray-900">{detection.direction}</strong>
            </div>
            <div className="col-span-2">
              <span className="block text-xs text-gray-500">Summary</span>
              <span className="text-sm text-gray-800">{detection.summary}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {detection.affectedAssets?.map(asset => {
              const change = asset.changePercent || 0;
              return (
                <div key={asset.assetId} className="flex justify-between items-center p-3 bg-white rounded border border-gray-100">
                  <span className="font-medium text-gray-700 capitalize">{asset.assetId}</span>
                  <span className={`font-semibold ${
                    change > 0 ? 'text-green-600' : 
                    change < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {change > 0 ? '+' : ''}{(change).toFixed(1)}% {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detection?.detected && riskAfter && riskBefore && (
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Portfolio Impact</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="block text-xs text-gray-500 mb-1">Portfolio Value</span>
              <div className="text-sm">
                <span className="line-through text-gray-400 block">{amount(currentCapital)}</span>
                <span className="font-bold text-gray-900">{amount(currentCapital * (1 + (marketResponse.impact?.totalReturn || 0)))}</span>
              </div>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Gain/Loss</span>
              <div className="text-sm">
                <strong className={marketResponse.impact?.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {amount(currentCapital * (marketResponse.impact?.totalReturn || 0))}
                </strong>
                <span className={`ml-2 ${marketResponse.impact?.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({signedPercent(marketResponse.impact?.totalReturn || 0)})
                </span>
              </div>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Risk Change</span>
              <div className="text-sm flex items-center gap-2">
                <span className="text-gray-600">{percent(riskBefore.risk?.portfolioVolatility ?? riskBefore.portfolioVolatility)}</span>
                <span className="text-gray-400">→</span>
                <strong className={riskAfter.portfolioVolatility > (riskBefore.risk?.portfolioVolatility ?? riskBefore.portfolioVolatility) ? 'text-red-600' : 'text-green-600'}>
                  {percent(riskAfter.portfolioVolatility)}
                </strong>
              </div>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Liquidity Change</span>
              <div className="text-sm flex items-center gap-2">
                <span className="text-gray-600">{percent(riskBefore.liquidity?.liquidityScore ?? riskBefore.liquidityScore)}</span>
                <span className="text-gray-400">→</span>
                <strong className={riskAfter.liquidityScore < (riskBefore.liquidity?.liquidityScore ?? riskBefore.liquidityScore) ? 'text-red-600' : 'text-blue-600'}>
                  {percent(riskAfter.liquidityScore)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {marketResponse?.recommendationData && marketResponse.recommendationData.decision.status !== 'NO_RECOMMENDATION' && (
        <div className="border-t border-gray-100 p-6 bg-white">
          <RecommendationBanner recommendationData={marketResponse.recommendationData} />
        </div>
      )}

      {marketResponse && (
        <div className="border-t border-gray-100 p-6 bg-gray-50 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Why did Capital Guardian make this decision?</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-lg">
            Capital Guardian uses your configured portfolio constraints and current market conditions to calculate risk and recommend allocations.
          </p>
          <ActionButton onClick={handleExplainDecision} loading={loadingExplanation}>
            Explain Decision
          </ActionButton>
        </div>
      )}

    </section>
  )
}
