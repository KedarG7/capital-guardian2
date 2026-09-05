import { assetConfiguration } from '../config/asset-config.js'

export const demoPortfolio = Object.freeze({
  totalCapital: 10000000,
  maximumRisk: 0.40,
  minimumLiquidity: 0.15,
  allocations: Object.freeze({
    stocks: 0.40,
    bonds: 0.30,
    gold: 0.15,
    cash: 0.15,
  }),
})

const isNumeric = (value) => typeof value === 'number' && Number.isFinite(value)

export function validatePortfolio(portfolio, assets = assetConfiguration) {
  if (!portfolio) {
    throw new Error('Portfolio is required.')
  }

  if (!isNumeric(portfolio.totalCapital) || portfolio.totalCapital <= 0) {
    throw new Error('Portfolio totalCapital must be a positive number.')
  }

  if (!portfolio.allocations || typeof portfolio.allocations !== 'object') {
    throw new Error('Portfolio allocation is required.')
  }

  const allocationEntries = Object.entries(portfolio.allocations)

  for (const [assetId, allocation] of allocationEntries) {
    if (!Object.prototype.hasOwnProperty.call(assets, assetId)) {
      throw new Error(`Asset configuration is missing for asset: ${assetId}.`)
    }

    if (!isNumeric(allocation)) {
      throw new Error(`Asset allocation must be numeric for asset: ${assetId}.`)
    }

    if (allocation < 0 || allocation > 1) {
      throw new Error(`Asset allocation must be between 0 and 1 for asset: ${assetId}.`)
    }
  }

  const allocationTotal = allocationEntries.reduce((total, [, allocation]) => total + allocation, 0)

  if (Math.abs(allocationTotal - 1) > 1e-10) {
    throw new Error('Asset allocations must sum to 1.')
  }

  for (const asset of Object.values(assets)) {
    for (const field of ['expectedReturn', 'volatility', 'liquidityScore']) {
      if (!isNumeric(asset[field])) {
        throw new Error(`Asset ${field} must be numeric.`)
      }
    }
  }

  return true
}
