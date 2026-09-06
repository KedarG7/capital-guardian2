import React from 'react'
import { ActionButton } from './Shared.jsx'

export default function AlertBanner({ alert, onDismiss }) {
  if (!alert) return null

  const isCritical = alert.severity === 'CRITICAL'
  const isLiquidity = alert.type === 'LIQUIDITY_BREACH'

  return (
    <div className={`mb-6 rounded-xl border ${isCritical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} p-5 relative shadow-sm`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isCritical ? 'bg-red-600' : 'bg-orange-500'}`} />
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isCritical ? 'text-red-800' : 'text-orange-800'}`}>
            MARKET GUARDIAN ALERT
          </h3>
        </div>
        <button 
          onClick={() => onDismiss(alert._id)}
          className={`text-xl leading-none px-2 rounded hover:bg-black/5 ${isCritical ? 'text-red-500 hover:text-red-700' : 'text-orange-500 hover:text-orange-700'}`}
          title="Mark as read"
        >
          ×
        </button>
      </div>
      
      <h4 className={`text-lg font-bold mb-2 ${isCritical ? 'text-red-900' : 'text-orange-900'}`}>
        {alert.title}
      </h4>
      
      <p className={`text-sm mb-4 ${isCritical ? 'text-red-800' : 'text-orange-800'}`}>
        {alert.message}
      </p>

      {alert.marketEvent && alert.marketEvent.affectedAssets?.length > 0 && (
        <div className="mb-4 text-sm">
          <strong className={isCritical ? 'text-red-900' : 'text-orange-900'}>Market Context:</strong>
          <ul className={`mt-1 list-disc list-inside ${isCritical ? 'text-red-800' : 'text-orange-800'}`}>
            {alert.marketEvent.affectedAssets.map(asset => (
              <li key={asset.assetId}>
                {asset.assetName} {asset.direction === 'DOWN' ? '↓' : '↑'} {Math.abs(asset.changePercent).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {alert.riskAssessment && (
        <div className={`inline-flex items-center gap-4 text-sm font-medium px-3 py-2 rounded bg-white/60 border ${isCritical ? 'border-red-100 text-red-900' : 'border-orange-100 text-orange-900'}`}>
          {!isLiquidity && (
            <span>Risk Utilization: {(alert.riskAssessment.riskUtilization * 100).toFixed(1)}%</span>
          )}
          {isLiquidity && (
            <span>Liquidity Buffer: {(alert.riskAssessment.liquidityBuffer * 100).toFixed(1)}%</span>
          )}
          <span>Status: {alert.riskAssessment.status}</span>
        </div>
      )}
    </div>
  )
}
