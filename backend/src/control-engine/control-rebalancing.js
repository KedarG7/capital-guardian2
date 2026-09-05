import { assetConfiguration } from '../config/asset-config.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { optimizePortfolio } from '../financial-engine/portfolio-optimization.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'

const TOLERANCE = 1e-10

function getWorkingPortfolio(portfolio, shockedPortfolio) {
  if (!shockedPortfolio) {
    return portfolio
  }

  if (shockedPortfolio.allocations) {
    return { ...shockedPortfolio, allocations: { ...shockedPortfolio.allocations } }
  }

  if (shockedPortfolio.assetImpacts && shockedPortfolio.shockedPortfolio) {
    return {
      ...portfolio,
      totalCapital: shockedPortfolio.shockedPortfolio.totalValue,
      allocations: Object.fromEntries(
        shockedPortfolio.assetImpacts.map((asset) => [asset.assetId, asset.shockedAllocationWeight]),
      ),
    }
  }

  throw new Error('Shocked portfolio must contain allocations or a Step 5 simulation result.')
}

function getBeforeResult(portfolio, assets) {
  const metrics = calculatePortfolioMetrics(portfolio, assets)
  const riskAssessment = assessPortfolioRisk(portfolio, assets, metrics)

  return { metrics, riskAssessment }
}

function getControlState(riskAssessment) {
  const riskBreached = riskAssessment.risk.limitStatus === 'BREACH'
  const liquidityBreached = riskAssessment.liquidity.limitStatus === 'BREACH'
  const allocationBreached = riskAssessment.allocation.status === 'BREACH'

  if (!riskBreached && !liquidityBreached && !allocationBreached) {
    return { action: 'NO_ACTION', riskBreached, liquidityBreached, allocationBreached }
  }

  if (riskBreached && liquidityBreached) {
    return { action: 'CRITICAL_BREACH', riskBreached, liquidityBreached, allocationBreached }
  }

  return { action: null, riskBreached, liquidityBreached, allocationBreached }
}

function getReasons(riskAssessment) {
  return riskAssessment.breaches.map((breach) => breach.message)
}

function getExplanation(before, recommended, reasons, controlAction) {
  const explanationReasons = [...reasons]

  if (recommended) {
    if (recommended.volatility < before.volatility - TOLERANCE) {
      explanationReasons.push('Recommended allocation reduces exposure to higher-volatility assets.')
    }

    if (recommended.liquidity > before.liquidity + TOLERANCE) {
      explanationReasons.push('Recommended allocation increases exposure to more liquid assets.')
    }

    if (explanationReasons.length === 0) {
      explanationReasons.push('Recommended allocation satisfies the configured control constraints.')
    }
  }

  let summary = 'No control action is required for the current portfolio.'
  if (controlAction === 'CRITICAL_BREACH') {
    summary = 'Critical control breach detected; no automatic trades were executed.'
  } else if (controlAction === 'REBALANCE_RECOMMENDED') {
    summary = 'A deterministic rebalancing recommendation was generated; no automatic trades were executed.'
  } else if (controlAction === 'RISK_BREACH') {
    summary = 'Risk breach detected and no feasible rebalancing allocation was found.'
  } else if (controlAction === 'LIQUIDITY_BREACH') {
    summary = 'Liquidity breach detected and no feasible rebalancing allocation was found.'
  }

  return { summary, reasons: explanationReasons }
}

function getComparison(portfolio, metrics, riskAssessment) {
  return {
    allocation: { ...portfolio.allocations },
    expectedReturn: metrics.expectedReturn,
    volatility: metrics.volatility,
    liquidity: metrics.liquidityScore,
    riskStatus: riskAssessment.status,
    portfolioValue: metrics.portfolioValue,
  }
}

export function evaluateControl(
  portfolio,
  riskAssessment,
  assets = assetConfiguration,
  shockedPortfolio,
) {
  const workingPortfolio = getWorkingPortfolio(portfolio, shockedPortfolio)
  const beforeResult = getBeforeResult(workingPortfolio, assets)
  const assessment = riskAssessment ?? beforeResult.riskAssessment

  if (assessment.isWithinLimits) {
    return {
      controlAction: 'NO_ACTION',
      reason: [],
      before: getComparison(workingPortfolio, beforeResult.metrics, assessment),
      recommended: null,
      changes: [],
      impact: {
        riskChange: 0,
        liquidityChange: 0,
        returnChange: 0,
      },
      validation: { status: 'NOT_REQUIRED' },
      explanation: getExplanation(
        getComparison(workingPortfolio, beforeResult.metrics, assessment),
        null,
        [],
        'NO_ACTION',
      ),
    }
  }

  const controlState = getControlState(assessment)
  const before = getComparison(workingPortfolio, beforeResult.metrics, assessment)
  let optimizationResult
  let failureMessage

  try {
    optimizationResult = optimizePortfolio(workingPortfolio, assets)
  } catch (error) {
    failureMessage = error.message
  }

  if (!optimizationResult) {
    const controlAction = 'CRITICAL_BREACH'
    const reason = getReasons(assessment)
    const explanation = getExplanation(before, null, [
      ...reason,
      'No feasible allocation was found that satisfies the configured constraints.',
    ], controlAction)

    return {
      controlAction,
      reason,
      before,
      recommended: null,
      changes: [],
      impact: null,
      validation: {
        status: 'FAIL',
        message: failureMessage ?? 'No feasible allocation was found that satisfies the configured constraints.',
      },
      explanation,
    }
  }

  const recommendedPortfolio = {
    ...workingPortfolio,
    allocations: { ...optimizationResult.allocation },
  }
  const recommendedMetrics = calculatePortfolioMetrics(recommendedPortfolio, assets)
  const recommendedRisk = assessPortfolioRisk(recommendedPortfolio, assets, recommendedMetrics)
  const recommended = getComparison(recommendedPortfolio, recommendedMetrics, recommendedRisk)
  const changes = Object.keys(assets).map((assetId) => ({
    assetId,
    oldWeight: workingPortfolio.allocations[assetId] ?? 0,
    newWeight: recommendedPortfolio.allocations[assetId],
    change: recommendedPortfolio.allocations[assetId] - (workingPortfolio.allocations[assetId] ?? 0),
  }))
  const reason = getReasons(assessment)

  return {
    controlAction: controlState.action ?? 'REBALANCE_RECOMMENDED',
    reason,
    before,
    recommended,
    changes,
    impact: {
      riskChange: recommended.volatility - before.volatility,
      liquidityChange: recommended.liquidity - before.liquidity,
      returnChange: recommended.expectedReturn - before.expectedReturn,
    },
    validation: {
      status: 'PASS',
      allocationSum: Object.values(recommended.allocation).reduce((sum, value) => sum + value, 0),
      riskAssessment: recommendedRisk,
    },
    explanation: getExplanation(before, recommended, reason, controlState.action ?? 'REBALANCE_RECOMMENDED'),
  }
}
