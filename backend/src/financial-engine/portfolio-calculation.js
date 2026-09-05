import { assetConfiguration } from '../config/asset-config.js'
import { validatePortfolio } from '../models/portfolio.js'

export function calculatePortfolioMetrics(portfolio, assets = assetConfiguration) {
  validatePortfolio(portfolio, assets)

  const calculatedAssets = Object.entries(portfolio.allocations).map(([assetId, allocation]) => {
    const asset = assets[assetId]
    const investedAmount = portfolio.totalCapital * allocation

    return {
      assetId,
      allocation,
      investedAmount,
      expectedReturn: asset.expectedReturn,
      volatility: asset.volatility,
      liquidityScore: asset.liquidityScore,
    }
  })

  const portfolioValue = calculatedAssets.reduce((total, asset) => total + asset.investedAmount, 0)
  const expectedReturn = calculatedAssets.reduce(
    (total, asset) => total + asset.allocation * asset.expectedReturn,
    0,
  )
  const liquidityScore = calculatedAssets.reduce(
    (total, asset) => total + asset.allocation * asset.liquidityScore,
    0,
  )
  const portfolioVariance = calculatedAssets.reduce(
    (total, asset) => total + (asset.allocation * asset.volatility) ** 2,
    0,
  )

  return {
    portfolioValue,
    totalCapital: portfolio.totalCapital,
    expectedReturn,
    liquidityScore,
    volatility: Math.sqrt(portfolioVariance),
    assets: calculatedAssets,
  }
}
