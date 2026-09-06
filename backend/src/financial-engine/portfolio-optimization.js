import { assetConfiguration } from '../config/asset-config.js'
import { validatePortfolio } from '../models/portfolio.js'
import { calculatePortfolioMetrics } from './portfolio-calculation.js'

export const DEFAULT_ALLOCATION_STEP = 0.05
const ALLOCATION_TOLERANCE = 1e-10
const SCORE_TOLERANCE = 1e-12

const isNumeric = (value) => typeof value === 'number' && Number.isFinite(value)

function validateOptimizationInput(portfolio, assets, allocationStep) {
  validatePortfolio(portfolio, assets)

  if (!assets || typeof assets !== 'object' || Object.keys(assets).length === 0) {
    throw new Error('Asset configuration is required.')
  }

  if (!isNumeric(portfolio.maximumRisk) || portfolio.maximumRisk < 0) {
    throw new Error('Portfolio maximumRisk must be a non-negative number.')
  }

  if (!isNumeric(portfolio.minimumLiquidity) || portfolio.minimumLiquidity < 0) {
    throw new Error('Portfolio minimumLiquidity must be a non-negative number.')
  }

  if (!isNumeric(allocationStep) || allocationStep <= 0 || allocationStep > 1) {
    throw new Error('Allocation step must be greater than 0 and no greater than 1.')
  }

  for (const [assetId, asset] of Object.entries(assets)) {
    if (!isNumeric(asset.minimumAllocation) || !isNumeric(asset.maximumAllocation)) {
      throw new Error(`Allocation bounds are invalid for asset: ${assetId}.`)
    }

    if (
      asset.minimumAllocation < 0 ||
      asset.maximumAllocation > 1 ||
      asset.minimumAllocation > asset.maximumAllocation
    ) {
      throw new Error(`Allocation bounds are invalid for asset: ${assetId}.`)
    }
  }
}

function calculateRiskAdjustedScore(expectedReturn, volatility) {
  if (volatility === 0) {
    return expectedReturn > 0 ? Number.MAX_VALUE : 0
  }

  return expectedReturn / volatility
}

function isBetterCandidate(candidate, currentBest) {
  if (!currentBest) {
    return true
  }

  if (candidate.riskAdjustedScore > currentBest.riskAdjustedScore + SCORE_TOLERANCE) {
    return true
  }

  if (Math.abs(candidate.riskAdjustedScore - currentBest.riskAdjustedScore) > SCORE_TOLERANCE) {
    return false
  }

  if (candidate.metrics.expectedReturn > currentBest.metrics.expectedReturn + SCORE_TOLERANCE) {
    return true
  }

  if (Math.abs(candidate.metrics.expectedReturn - currentBest.metrics.expectedReturn) > SCORE_TOLERANCE) {
    return false
  }

  if (candidate.metrics.volatility < currentBest.metrics.volatility - SCORE_TOLERANCE) {
    return true
  }

  if (Math.abs(candidate.metrics.volatility - currentBest.metrics.volatility) > SCORE_TOLERANCE) {
    return false
  }

  return candidate.metrics.liquidityScore > currentBest.metrics.liquidityScore + SCORE_TOLERANCE
}

export function optimizePortfolio(
  portfolio,
  assets = assetConfiguration,
  allocationStep = DEFAULT_ALLOCATION_STEP,
) {
  validateOptimizationInput(portfolio, assets, allocationStep)

  const assetIds = Object.keys(assets)
  let candidatesEvaluated = 0
  let validCandidates = 0
  let bestCandidate

  function evaluateAllocation(allocation) {
    candidatesEvaluated += 1

    const allocationTotal = Object.values(allocation).reduce((total, weight) => total + weight, 0)
    if (Math.abs(allocationTotal - 1) > ALLOCATION_TOLERANCE) {
      return
    }

    for (const assetId of assetIds) {
      const weight = allocation[assetId]
      const asset = assets[assetId]
      if (
        weight < asset.minimumAllocation - ALLOCATION_TOLERANCE ||
        weight > asset.maximumAllocation + ALLOCATION_TOLERANCE
      ) {
        return
      }
    }

    const candidatePortfolio = {
      ...portfolio,
      allocations: { ...allocation },
    }
    const calculatedMetrics = calculatePortfolioMetrics(candidatePortfolio, assets)

    if (
      calculatedMetrics.volatility > portfolio.maximumRisk + ALLOCATION_TOLERANCE ||
      calculatedMetrics.liquidityScore < portfolio.minimumLiquidity - ALLOCATION_TOLERANCE
    ) {
      return
    }

    validCandidates += 1
    const metrics = {
      portfolioValue: calculatedMetrics.portfolioValue,
      expectedReturn: calculatedMetrics.expectedReturn,
      liquidityScore: calculatedMetrics.liquidityScore,
      volatility: calculatedMetrics.volatility,
    }
    const candidate = {
      allocation: { ...allocation },
      metrics,
      riskAdjustedScore: calculateRiskAdjustedScore(metrics.expectedReturn, metrics.volatility),
    }

    if (isBetterCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate
    }
  }

  function generateAllocations(assetIndex, allocation, allocationTotal) {
    if (assetIndex === assetIds.length - 1) {
      const lastAssetId = assetIds[assetIndex]
      const lastWeight = 1 - allocationTotal

      evaluateAllocation({ ...allocation, [lastAssetId]: lastWeight })
      return
    }

    const assetId = assetIds[assetIndex]
    for (let index = 0; index <= Math.round(1 / allocationStep); index += 1) {
      const weight = index * allocationStep
      if (weight > 1 - allocationTotal + ALLOCATION_TOLERANCE) {
        break
      }

      generateAllocations(assetIndex + 1, { ...allocation, [assetId]: weight }, allocationTotal + weight)
    }
  }

  // An exhaustive grid is precise for the standard four-asset plan, but grows
  // exponentially when founders add assets. Use deterministic sampling beyond
  // that threshold so the button always responds in a practical time.
  if (assetIds.length <= 4) {
    generateAllocations(0, {}, 0)
  } else {
    let seed = Math.round(portfolio.totalCapital) + assetIds.length
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    evaluateAllocation({ ...portfolio.allocations })
    for (let attempt = 0; attempt < 25000; attempt += 1) {
      const raw = assetIds.map(() => -Math.log(Math.max(random(), Number.EPSILON)))
      const total = raw.reduce((sum, value) => sum + value, 0)
      evaluateAllocation(Object.fromEntries(assetIds.map((assetId, index) => [assetId, raw[index] / total])))
    }
  }

  if (!bestCandidate) {
    throw new Error('No feasible portfolio allocation satisfies the current constraints.')
  }

  return {
    allocation: bestCandidate.allocation,
    metrics: { ...bestCandidate.metrics, riskAdjustedScore: bestCandidate.riskAdjustedScore },
    constraints: {
      maximumRisk: portfolio.maximumRisk,
      minimumLiquidity: portfolio.minimumLiquidity,
    },
    metadata: {
      allocationStep,
      candidatesEvaluated,
      validCandidates,
    },
  }
}
