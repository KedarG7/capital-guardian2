import { evaluateControl } from './control-rebalancing.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'
import { assetConfiguration } from '../config/asset-config.js'
import { simulateMarketShock } from '../shock-engine/market-shock.js'

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
  const standardShocks = []
  let totalStockValue = 0
  let stockShockSum = 0
  
  // Demo holdings mapping for Step 9/10 Real Market Integration
  const demoHoldings = {
    'RELIANCE.NS': { qty: 50, price: 2900 },
    'TCS.NS': { qty: 20, price: 3800 },
    'INFY.NS': { qty: 100, price: 1600 },
    'HDFCBANK.NS': { qty: 150, price: 1400 },
  }
  
  changes.forEach(c => {
    if (assetConfiguration[c.assetId]) {
      standardShocks.push({ assetId: c.assetId, shockPercentage: (c.changePercent || 0) / 100 })
    } else if (demoHoldings[c.assetId]) {
      const h = demoHoldings[c.assetId]
      const value = h.qty * h.price
      totalStockValue += value
      stockShockSum += value * ((c.changePercent || 0) / 100)
    }
  })
  
  if (totalStockValue > 0) {
     const blendedStockShock = stockShockSum / totalStockValue
     const existing = standardShocks.find(s => s.assetId === 'stocks')
     if (existing) existing.shockPercentage += blendedStockShock
     else standardShocks.push({ assetId: 'stocks', shockPercentage: blendedStockShock })
  }

  const scenario = {
    name: 'Detected Market Movement',
    shocks: standardShocks
  }

  const shockResult = simulateMarketShock(portfolio, scenario, assetConfiguration)
  
  // The risk assessment after applying market shocks
  const risk = shockResult.riskAssessment
  
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
        liquidityBuffer: risk.liquidity.liquidityBuffer,
        portfolioVolatility: risk.risk.portfolioVolatility,
        liquidityScore: risk.liquidity.liquidityScore
      },
      recommendation,
      controlDecision: null,
      impact: {
        totalReturn: shockResult.shockedPortfolio.expectedReturn
      }
    }
  }

  // If action is recommended, call Control Engine
  let controlDecision = null
  let recommendationData = null
  
  if (['REVIEW_RECOMMENDED', 'REBALANCE_RECOMMENDED', 'URGENT_CONTROL_RECOMMENDED'].includes(responseLevel) || risk.liquidity.liquidityBuffer < 0) {
    // Generate full recommendation
    controlDecision = evaluateControl(portfolio, risk, assetConfiguration, shockResult)
    
    // Map control decision to the requested recommendation structure
    const totalCap = portfolio.totalCapital
    
    let decisionStatus = 'NO_RECOMMENDATION'
    if (controlDecision.controlAction === 'CRITICAL_BREACH' && !controlDecision.recommended) {
      decisionStatus = 'NO_VALID_REBALANCE'
    } else if (controlDecision.recommended) {
      decisionStatus = responseLevel === 'URGENT_CONTROL_RECOMMENDED' ? 'URGENT_REBALANCE_RECOMMENDED' : 'REBALANCE_RECOMMENDED'
    } else {
      decisionStatus = responseLevel
    }

    let recChanges = []
    if (controlDecision.recommended && controlDecision.changes) {
      recChanges = controlDecision.changes.map(c => ({
        asset: c.assetId,
        currentWeight: c.oldWeight,
        recommendedWeight: c.newWeight,
        change: c.change,
        monetaryChange: (c.newWeight * totalCap) - (c.oldWeight * totalCap)
      }))
    }

    recommendationData = {
      trigger: {
        marketEvent: marketStatus,
        affectedAssets: changes.filter(c => Math.abs(c.changePercent) > 2).map(c => ({
          asset: c.assetId,
          change: c.changePercent
        }))
      },
      current: {
        allocation: controlDecision.before.allocation,
        portfolioValue: controlDecision.before.portfolioValue,
        risk: controlDecision.before.volatility,
        liquidity: controlDecision.before.liquidity,
        expectedReturn: controlDecision.before.expectedReturn,
        status: controlDecision.before.riskStatus
      },
      recommended: controlDecision.recommended ? {
        allocation: controlDecision.recommended.allocation,
        portfolioValue: controlDecision.recommended.portfolioValue,
        risk: controlDecision.recommended.volatility,
        liquidity: controlDecision.recommended.liquidity,
        expectedReturn: controlDecision.recommended.expectedReturn,
        status: controlDecision.recommended.riskStatus
      } : null,
      changes: recChanges,
      impact: controlDecision.impact ? {
        riskChange: controlDecision.impact.riskChange,
        liquidityChange: controlDecision.impact.liquidityChange,
        returnChange: controlDecision.impact.returnChange,
        portfolioValueChange: 0 // Rebalancing just moves weights, value stays the same instantly
      } : null,
      decision: {
        status: decisionStatus,
        recommendationAvailable: !!controlDecision.recommended,
        reason: controlDecision.validation?.message || (controlDecision.recommended ? 'A safer allocation was found.' : 'No allocation satisfying the configured constraints was found.')
      }
    }
    
    if (recommendationData.decision.recommendationAvailable) {
      recommendation.summary = `The Risk Engine classified the portfolio as ${risk.status}. A safer allocation has been recommended.`
      recommendation.reasons.push(`Risk utilization is currently ${(risk.risk.riskUtilization * 100).toFixed(1)}%.`)
    } else if (decisionStatus === 'NO_VALID_REBALANCE') {
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
      liquidityBuffer: risk.liquidity.liquidityBuffer,
      portfolioVolatility: risk.risk.portfolioVolatility,
      liquidityScore: risk.liquidity.liquidityScore
    },
    recommendation,
    recommendationData, // Full deterministic Step 5 payload
    controlDecision,
    impact: {
      totalReturn: shockResult.shockedPortfolio.expectedReturn
    }
  }
}
