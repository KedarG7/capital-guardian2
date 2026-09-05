import { assetConfiguration } from '../config/asset-config.js'
import { calculatePortfolioMetrics } from './portfolio-calculation.js'

const TOLERANCE = 1e-10
const isNumeric = (value) => typeof value === 'number' && Number.isFinite(value)

function validateRiskInput(portfolio) {
  if (!portfolio) {
    throw new Error('Portfolio is required.')
  }

  if (!isNumeric(portfolio.maximumRisk) || portfolio.maximumRisk < 0) {
    throw new Error('Portfolio maximumRisk must be a non-negative number.')
  }

  if (!isNumeric(portfolio.minimumLiquidity) || portfolio.minimumLiquidity < 0) {
    throw new Error('Portfolio minimumLiquidity must be a non-negative number.')
  }
}

function getAllocationViolations(portfolio, assets) {
  const violations = []

  for (const [assetId, allocation] of Object.entries(portfolio.allocations)) {
    const asset = assets[assetId]

    if (!isNumeric(asset.minimumAllocation) || !isNumeric(asset.maximumAllocation)) {
      throw new Error(`Asset allocation bounds must be numeric for asset: ${assetId}.`)
    }

    if (allocation < asset.minimumAllocation - TOLERANCE) {
      violations.push({
        assetId,
        actual: allocation,
        minimum: asset.minimumAllocation,
        maximum: asset.maximumAllocation,
        message: `Allocation for ${assetId} is below the minimum allocation.`,
      })
    }

    if (allocation > asset.maximumAllocation + TOLERANCE) {
      violations.push({
        assetId,
        actual: allocation,
        minimum: asset.minimumAllocation,
        maximum: asset.maximumAllocation,
        message: `Allocation for ${assetId} exceeds the maximum allocation.`,
      })
    }
  }

  return violations
}

function getOverallStatus(riskBreached, liquidityBreached, allocationBreached, riskUtilization) {
  if (riskBreached && liquidityBreached) {
    return 'CRITICAL'
  }

  if (riskBreached || liquidityBreached || allocationBreached) {
    return 'HIGH'
  }

  if (riskUtilization >= 0.75) {
    return 'MODERATE'
  }

  return 'LOW'
}

export function assessPortfolioRisk(
  portfolio,
  assets = assetConfiguration,
  calculatedMetrics,
) {
  validateRiskInput(portfolio)

  if (calculatedMetrics === null) {
    throw new Error('Calculated portfolio metrics are required.')
  }

  const metrics = calculatedMetrics ?? calculatePortfolioMetrics(portfolio, assets)
  if (!metrics || !isNumeric(metrics.volatility) || !isNumeric(metrics.liquidityScore)) {
    throw new Error('Calculated portfolio metrics are invalid.')
  }

  const riskLimitPassed = metrics.volatility <= portfolio.maximumRisk + TOLERANCE
  const liquidityLimitPassed = metrics.liquidityScore >= portfolio.minimumLiquidity - TOLERANCE
  const allocationViolations = getAllocationViolations(portfolio, assets)
  const allocationPassed = allocationViolations.length === 0
  const riskUtilization = portfolio.maximumRisk === 0
    ? (metrics.volatility === 0 ? 0 : 1)
    : metrics.volatility / portfolio.maximumRisk
  const liquidityBuffer = metrics.liquidityScore - portfolio.minimumLiquidity
  const status = getOverallStatus(
    !riskLimitPassed,
    !liquidityLimitPassed,
    !allocationPassed,
    riskUtilization,
  )
  const breaches = []

  if (!riskLimitPassed) {
    breaches.push({
      type: 'RISK',
      metric: 'portfolioVolatility',
      actual: metrics.volatility,
      limit: portfolio.maximumRisk,
      message: 'Portfolio volatility exceeds the maximum allowed risk.',
    })
  }

  if (!liquidityLimitPassed) {
    breaches.push({
      type: 'LIQUIDITY',
      metric: 'liquidityScore',
      actual: metrics.liquidityScore,
      limit: portfolio.minimumLiquidity,
      message: 'Portfolio liquidity is below the minimum required level.',
    })
  }

  for (const violation of allocationViolations) {
    breaches.push({
      type: 'ALLOCATION',
      metric: 'allocationCompliance',
      ...violation,
    })
  }

  return {
    status,
    isWithinLimits: riskLimitPassed && liquidityLimitPassed && allocationPassed,
    risk: {
      portfolioVolatility: metrics.volatility,
      maximumRisk: portfolio.maximumRisk,
      riskUtilization,
      limitStatus: riskLimitPassed ? 'PASS' : 'BREACH',
    },
    liquidity: {
      liquidityScore: metrics.liquidityScore,
      minimumLiquidity: portfolio.minimumLiquidity,
      liquidityBuffer,
      limitStatus: liquidityLimitPassed ? 'PASS' : 'BREACH',
    },
    allocation: {
      status: allocationPassed ? 'PASS' : 'BREACH',
      violations: allocationViolations,
    },
    breaches,
  }
}
