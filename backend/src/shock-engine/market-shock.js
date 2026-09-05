import { assetConfiguration } from '../config/asset-config.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'

const isNumeric = (value) => typeof value === 'number' && Number.isFinite(value)
const TOLERANCE = 1e-10

export const demoShockScenarios = Object.freeze([
  Object.freeze({
    name: 'Market Crash',
    shocks: Object.freeze([
      Object.freeze({ assetId: 'stocks', shockPercentage: -0.20 }),
      Object.freeze({ assetId: 'bonds', shockPercentage: -0.05 }),
      Object.freeze({ assetId: 'gold', shockPercentage: 0.10 }),
      Object.freeze({ assetId: 'cash', shockPercentage: 0 }),
    ]),
  }),
  Object.freeze({
    name: 'Inflation Shock',
    shocks: Object.freeze([
      Object.freeze({ assetId: 'stocks', shockPercentage: -0.10 }),
      Object.freeze({ assetId: 'bonds', shockPercentage: -0.15 }),
      Object.freeze({ assetId: 'gold', shockPercentage: 0.15 }),
      Object.freeze({ assetId: 'cash', shockPercentage: 0 }),
    ]),
  }),
  Object.freeze({
    name: 'Positive Market',
    shocks: Object.freeze([
      Object.freeze({ assetId: 'stocks', shockPercentage: 0.15 }),
      Object.freeze({ assetId: 'bonds', shockPercentage: 0.05 }),
      Object.freeze({ assetId: 'gold', shockPercentage: 0.03 }),
      Object.freeze({ assetId: 'cash', shockPercentage: 0 }),
    ]),
  }),
])

function validateScenario(scenario, assets) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Market shock scenario is required.')
  }

  if (typeof scenario.name !== 'string' || scenario.name.trim() === '') {
    throw new Error('Market shock scenario name must be a non-empty string.')
  }

  if (!Array.isArray(scenario.shocks)) {
    throw new Error('Market shock scenario shocks must be an array.')
  }

  const seenAssets = new Set()
  for (const shock of scenario.shocks) {
    if (!shock || typeof shock !== 'object') {
      throw new Error('Each market shock must be an object.')
    }

    if (typeof shock.assetId !== 'string' || !Object.prototype.hasOwnProperty.call(assets, shock.assetId)) {
      throw new Error(`Asset configuration is missing for shocked asset: ${shock.assetId}.`)
    }

    if (seenAssets.has(shock.assetId)) {
      throw new Error(`Duplicate market shock for asset: ${shock.assetId}.`)
    }
    seenAssets.add(shock.assetId)

    if (!isNumeric(shock.shockPercentage)) {
      throw new Error(`Shock percentage must be numeric for asset: ${shock.assetId}.`)
    }

    if (shock.shockPercentage < -1 || shock.shockPercentage > 1) {
      throw new Error(`Shock percentage must be between -1 and 1 for asset: ${shock.assetId}.`)
    }
  }
}

function getShockMap(scenario) {
  return new Map(scenario.shocks.map(({ assetId, shockPercentage }) => [assetId, shockPercentage]))
}

function calculateZeroValueMetrics(totalCapital, assets) {
  return {
    portfolioValue: 0,
    totalCapital,
    expectedReturn: 0,
    liquidityScore: 0,
    volatility: 0,
    assets: Object.keys(assets).map((assetId) => ({
      assetId,
      allocation: 0,
      investedAmount: 0,
      expectedReturn: assets[assetId].expectedReturn,
      volatility: assets[assetId].volatility,
      liquidityScore: assets[assetId].liquidityScore,
    })),
  }
}

function calculateOriginalMetrics(portfolio, assets) {
  if (portfolio.totalCapital !== 0) {
    return calculatePortfolioMetrics(portfolio, assets)
  }

  const validatedMetrics = calculatePortfolioMetrics({ ...portfolio, totalCapital: 1 }, assets)

  return {
    ...validatedMetrics,
    portfolioValue: 0,
    totalCapital: 0,
    assets: validatedMetrics.assets.map((asset) => ({
      ...asset,
      investedAmount: 0,
    })),
  }
}

export function simulateMarketShock(portfolio, scenario, assets = assetConfiguration) {
  validateScenario(scenario, assets)

  const originalMetrics = calculateOriginalMetrics(portfolio, assets)
  const shockMap = getShockMap(scenario)
  const assetImpacts = originalMetrics.assets.map((asset) => {
    const shockPercentage = shockMap.get(asset.assetId) ?? 0
    const shockedValue = asset.investedAmount * (1 + shockPercentage)

    return {
      assetId: asset.assetId,
      originalValue: asset.investedAmount,
      shockPercentage,
      shockedValue,
      valueChange: shockedValue - asset.investedAmount,
    }
  })

  const shockedPortfolioValue = assetImpacts.reduce((total, asset) => total + asset.shockedValue, 0)
  const portfolioGainLoss = shockedPortfolioValue - originalMetrics.portfolioValue
  const portfolioLossPercentage = originalMetrics.portfolioValue === 0
    ? 0
    : portfolioGainLoss / originalMetrics.portfolioValue
  const shockedAllocations = Object.fromEntries(assetImpacts.map((asset) => [
    asset.assetId,
    shockedPortfolioValue === 0 ? 0 : asset.shockedValue / shockedPortfolioValue,
  ]))

  const shockedMetrics = shockedPortfolioValue === 0
    ? calculateZeroValueMetrics(shockedPortfolioValue, assets)
    : calculatePortfolioMetrics({
      ...portfolio,
      totalCapital: shockedPortfolioValue,
      allocations: shockedAllocations,
    }, assets)

  const assetImpactsWithAllocations = assetImpacts.map((asset) => ({
    ...asset,
    shockedAllocationWeight: shockedAllocations[asset.assetId],
  }))
  const shockedPortfolio = {
    ...portfolio,
    totalCapital: shockedPortfolioValue,
    allocations: shockedAllocations,
  }
  const riskAssessment = assessPortfolioRisk(shockedPortfolio, assets, shockedMetrics)

  return {
    scenario: {
      name: scenario.name,
      shocks: scenario.shocks.map((shock) => ({ ...shock })),
    },
    originalPortfolio: {
      totalValue: originalMetrics.portfolioValue,
      expectedReturn: originalMetrics.expectedReturn,
      volatility: originalMetrics.volatility,
      liquidity: originalMetrics.liquidityScore,
    },
    shockedPortfolio: {
      totalValue: shockedPortfolioValue,
      gainLoss: portfolioGainLoss,
      gainLossPercentage: portfolioLossPercentage,
      expectedReturn: shockedMetrics.expectedReturn,
      volatility: shockedMetrics.volatility,
      liquidity: shockedMetrics.liquidityScore,
    },
    assetImpacts: assetImpactsWithAllocations,
    riskAssessment,
  }
}
