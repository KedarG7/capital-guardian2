import { useState, useEffect } from 'react'
import { amount, percent } from './Shared.jsx'

export default function AnimatedPortfolioMonitor({
  portfolio,
  currentRisk,
  currentMetrics,
  assets,
  marketData,
  marketResponse,
  marketError
}) {
  const [step, setStep] = useState(1)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setStep(6)
      return
    }

    const sequence = [
      { step: 1, delay: 800 },
      { step: 2, delay: 1500 },
      { step: 3, delay: 1500 },
      { step: 4, delay: 1500 },
      { step: 5, delay: 2000 },
      { step: 6, delay: 0 }
    ]
    
    let isCancelled = false
    let timeout
    
    const runSequence = async () => {
      setStep(0)
      await new Promise(r => { timeout = setTimeout(r, 400) })
      for (const s of sequence) {
        if (isCancelled) break
        setStep(s.step)
        if (s.delay > 0) {
          await new Promise(r => { timeout = setTimeout(r, s.delay) })
        }
      }
    }
    
    runSequence()
    return () => {
      isCancelled = true
      clearTimeout(timeout)
    }
  }, [portfolio.totalCapital, marketResponse])

  // Error/Loading states
  if (marketError && !marketData) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
        Market response unavailable
      </div>
    )
  }

  const hasEvents = marketResponse?.events?.length > 0
  const avgChange = hasEvents 
    ? marketResponse.events.reduce((acc, e) => acc + e.changePercent, 0) / marketResponse.events.length 
    : 0

  const hasControl = marketResponse?.controlDecision?.proposedAllocation != null

  // Calculate dynamic path based on events
  const startY = 120
  let impactY = startY
  let finalY = startY

  if (hasEvents) {
    impactY = avgChange < 0 ? 200 : 40
    if (hasControl) {
      // Rebalance brings it closer to stable
      finalY = avgChange < 0 ? 160 : 80
    } else {
      finalY = impactY
    }
  }

  // Generate smooth path
  // Start: 0 -> 200
  // Impact: 300 -> 500
  // Final: 600 -> 800
  const pathD = `M 0 ${startY} L 150 ${startY} C 220 ${startY}, 250 ${impactY}, 350 ${impactY} L 500 ${impactY} C 600 ${impactY}, 650 ${finalY}, 800 ${finalY}`

  const getClipWidth = (s) => {
    if (s <= 0) return 0
    if (s === 1) return 180
    if (s === 2) return 300
    if (s === 3) return 400
    if (s === 4) return 550
    if (s >= 5) return 800
  }

  const getTransitionDuration = (s) => {
    if (s === 0) return '0s'
    if (s === 1) return '0.8s'
    if (s === 2) return '1.2s'
    if (s === 3) return '1s'
    if (s === 4) return '1.5s'
    if (s >= 5) return '2s'
  }

  return (
    <div className="relative w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-start z-10 pointer-events-none">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Portfolio Risk Monitor</h2>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
            {marketData?.mode === 'live' ? (
              <span className="text-green-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>LIVE MARKET DATA</span>
            ) : (
              <span className="text-blue-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>DEMO MARKET DATA</span>
            )}
          </div>
        </div>
        
        {step >= 6 && (
          <div className="pointer-events-auto">
            <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${
              marketResponse?.responseLevel === 'MONITOR' ? 'bg-blue-50 text-blue-700' :
              marketResponse?.responseLevel === 'REVIEW_RECOMMENDED' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {marketResponse?.responseLevel?.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      {/* SVG GRAPH */}
      <div className="relative w-full h-[320px] sm:h-[360px] bg-gray-50/50">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="monitorArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hasEvents && avgChange < 0 ? '#fca5a5' : '#5eead4'} stopOpacity="0.4" />
              <stop offset="100%" stopColor={hasEvents && avgChange < 0 ? '#fef2f2' : '#f0fdf4'} stopOpacity="0" />
            </linearGradient>
            
            <clipPath id="monitorClip">
              <rect x="0" y="0" height="300" width={getClipWidth(step)} style={{ transition: `width ${getTransitionDuration(step)} ease-in-out` }} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          <g stroke="#f3f4f6" strokeWidth="1">
            <line x1="0" y1="60" x2="800" y2="60" />
            <line x1="0" y1="120" x2="800" y2="120" />
            <line x1="0" y1="180" x2="800" y2="180" />
            <line x1="0" y1="240" x2="800" y2="240" />
          </g>

          <g clipPath="url(#monitorClip)">
            {/* Area */}
            <path d={`${pathD} L 800 300 L 0 300 Z`} fill="url(#monitorArea)" />
            
            {/* Line */}
            <path d={pathD} fill="none" stroke={hasEvents && avgChange < 0 ? '#ef4444' : '#0f766e'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Shock Marker */}
            {hasEvents && (
              <g className={`transition-opacity duration-500 delay-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                <circle cx="350" cy={impactY} r="5" fill="#ef4444" className="animate-pulse" />
                <line x1="350" y1={impactY} x2="350" y2="280" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" />
              </g>
            )}
          </g>
        </svg>

        {/* OVERLAYS */}
        
        {/* State 1: Current Portfolio */}
        <div className={`absolute top-[140px] left-[5%] transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} pointer-events-none`}>
          <div className="bg-white/90 backdrop-blur border border-gray-200 p-2 sm:p-3 rounded-lg shadow-sm">
            <div className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Portfolio Value</div>
            <div className="text-sm sm:text-base font-bold text-gray-900">{amount(currentMetrics.totalValue)}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Exp Return: <span className="font-semibold text-gray-700">{percent(currentMetrics.expectedReturn)}</span></div>
          </div>
        </div>

        {/* State 2 & 3: Market Movement & Risk Impact */}
        <div className={`absolute top-[40px] sm:top-[60px] left-[35%] sm:left-[40%] transition-all duration-500 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 p-3 sm:p-4 rounded-xl shadow-lg min-w-[160px]">
            {hasEvents ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-600">Market Shock</span>
                </div>
                <div className="space-y-1 mb-3">
                  {marketResponse.events.map((e, i) => (
                    <div key={i} className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-gray-600 font-medium">{e.asset || e.type.replace(/_/g, ' ')}</span>
                      <span className={`font-['DM_Mono',monospace] font-semibold ${e.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {e.changePercent > 0 ? '↑' : '↓'} {Math.abs(e.changePercent).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className={`transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <div className="text-[10px] text-gray-500 font-medium uppercase mb-1">Portfolio Impact</div>
                    <div className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-gray-600">Risk Limit</span>
                      <span className="font-semibold text-gray-900">{percent(portfolio.maximumRisk)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-gray-600">Utilization</span>
                      <span className={`font-semibold ${marketResponse.risk.riskUtilization > 1 ? 'text-red-600' : 'text-gray-900'}`}>
                        {percent(marketResponse.risk.riskUtilization)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700">Market Stable</span>
              </div>
            )}
          </div>
        </div>

        {/* State 4 & 5: Risk Detection & Control Response */}
        <div className={`absolute top-[160px] sm:top-[120px] right-[5%] transition-all duration-500 delay-300 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 p-3 sm:p-4 rounded-xl shadow-lg min-w-[200px] sm:min-w-[240px]">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${marketResponse?.risk?.status === 'LOW' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${marketResponse?.risk?.status === 'LOW' ? 'text-green-700' : 'text-amber-700'}`}>
                {marketResponse?.risk?.status === 'LOW' ? 'Risk Monitored' : 'Risk Detected'}
              </span>
            </div>

            <div className={`transition-opacity duration-500 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="border-t border-gray-100 pt-3">
                {hasControl ? (
                  <>
                    <div className="text-[10px] sm:text-xs font-bold uppercase text-gray-800 mb-2">Control Recommended</div>
                    <div className="space-y-1.5">
                      {assets.map(asset => {
                        const proposed = marketResponse.controlDecision.proposedAllocation.find(p => p.assetId === asset.assetId)
                        const newAlloc = proposed ? proposed.allocation : asset.allocation
                        const diff = newAlloc - asset.allocation
                        return (
                          <div key={asset.assetId} className="flex flex-col gap-0.5">
                            <div className="flex justify-between text-[9px] sm:text-[10px] font-medium text-gray-600">
                              <span>{asset.assetId}</span>
                              <div className="flex gap-1">
                                <span>{Math.round(asset.allocation * 100)}%</span>
                                {Math.abs(diff) > 0.001 && (
                                  <>
                                    <span>→</span>
                                    <span className={diff > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                      {Math.round(newAlloc * 100)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                              {/* Visual diffing bar */}
                              <div className="h-full bg-gray-300 transition-all duration-1000" style={{ width: `${Math.min(asset.allocation, newAlloc) * 100}%` }}></div>
                              {diff > 0 && <div className="h-full bg-green-400 transition-all duration-1000 animate-pulse" style={{ width: `${diff * 100}%` }}></div>}
                              {diff < 0 && <div className="h-full bg-red-400 transition-all duration-1000" style={{ width: `${Math.abs(diff) * 100}%` }}></div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] sm:text-xs font-medium text-gray-600 italic">
                    {hasEvents ? 'No action required based on current limits.' : 'No active recommendation.'}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* RISK THRESHOLD VISUALIZATION FOOTER */}
      <div className="bg-gray-50 border-t border-gray-100 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            <span>Risk Level (0%)</span>
            <span>Max ({percent(portfolio.maximumRisk)})</span>
          </div>
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-visible">
            {/* Risk bar */}
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                currentRisk.isWithinLimits ? 'bg-teal-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(currentRisk.risk.riskUtilization * 100, 100)}%` }}
            />
            {/* Threshold marker */}
            <div className="absolute top-1/2 left-full -translate-y-1/2 -translate-x-1/2 w-1 h-3.5 bg-gray-900 rounded-sm z-10"></div>
            {/* Current Value Marker */}
            <div 
              className="absolute top-4 -translate-x-1/2 text-[10px] font-bold text-gray-700 whitespace-nowrap transition-all duration-1000"
              style={{ left: `${Math.min(currentRisk.risk.riskUtilization * 100, 100)}%` }}
            >
              {percent(currentMetrics.volatility)}
            </div>
          </div>
        </div>
        
        <div className="hidden sm:block w-px h-8 bg-gray-200"></div>

        <div className="flex-1 flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Liquidity Safety</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-sm font-bold ${currentRisk.liquidity.liquidityBuffer >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percent(currentRisk.liquidity.liquidityBuffer)} Buffer
            </span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-medium text-gray-500">{percent(portfolio.minimumLiquidity)} Min</span>
          </div>
        </div>
      </div>

    </div>
  )
}
