import { evaluateControl } from './control-rebalancing.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'
import { assetConfiguration } from '../config/asset-config.js'

export function determineResponseLevel(riskStatus) {
  switch (riskStatus) {
    case 'LOW': return 'MONITOR'
    case 'MODERATE': return 'REVIEW_RECOMMENDED'
    case 'HIGH': return 'REBALANCE_RECOMMENDED'
    case 'CRITICAL': return 'URGENT_CONTROL_RECOMMENDED'
    default: return 'MONITOR'
  }
}

export function generateMarketResponse(portfolio, marketStatus, changes, events) {
  // Re-evaluate portfolio based on CURRENT base configuration
  const metrics = calculatePortfolioMetrics(portfolio, assetConfiguration)
  const risk = assessPortfolioRisk(portfolio, assetConfiguration, metrics)
  
  const responseLevel = determineResponseLevel(risk.status)
  
  let recommendation = {
    action: responseLevel,
    summary: '',
    reasons: []
  }

  // No-action condition
  if (marketStatus === 'STABLE' && risk.status === 'LOW') {
    recommendation.summary = 'Market conditions stable. No immediate portfolio action recommended.'
    recommendation.reasons.push('Asset movements are within stable thresholds.')
    return {
      marketStatus,
      responseLevel,
      events,
      risk: {
        status: risk.status,
        riskUtilization: risk.risk.riskUtilization,
        liquidityBuffer: risk.liquidity.liquidityBuffer
      },
      recommendation,
      controlDecision: null
    }
  }

  // If action is recommended, call Control Engine
  let controlDecision = null
  if (['REBALANCE_RECOMMENDED', 'URGENT_CONTROL_RECOMMENDED'].includes(responseLevel)) {
    controlDecision = evaluateControl(portfolio, risk, assetConfiguration)
    
    if (controlDecision.action === 'REBALANCE_RECOMMENDED') {
      recommendation.summary = `The Risk Engine classified the portfolio as ${risk.status}. The Control Engine recommends reviewing the current allocation.`
      recommendation.reasons.push(`Risk utilization is currently ${Math.round(risk.risk.riskUtilization * 100)}%.`)
    } else {
      recommendation.summary = 'Risk limit breached, but no feasible deterministic rebalance satisfies all constraints.'
    }
  } else {
    recommendation.summary = `Portfolio risk is ${risk.status}. Monitor market conditions closely.`
  }

  events.forEach(e => {
    if (e.asset) {
      recommendation.reasons.push(`${e.asset} experienced a ${e.severity.toLowerCase()} change of ${e.changePercent.toFixed(2)}%.`)
    }
  })

  return {
    marketStatus,
    responseLevel,
    events,
    risk: {
      status: risk.status,
      riskUtilization: risk.risk.riskUtilization,
      liquidityBuffer: risk.liquidity.liquidityBuffer
    },
    recommendation,
    controlDecision
  }
}
