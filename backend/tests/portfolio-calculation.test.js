import test from 'node:test'
import assert from 'node:assert/strict'
import { assetConfiguration } from '../src/config/asset-config.js'
import { demoPortfolio } from '../src/models/portfolio.js'
import { calculatePortfolioMetrics } from '../src/financial-engine/portfolio-calculation.js'

const tolerance = 1e-10
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < tolerance)

test('calculates the demo portfolio metrics', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)

  closeTo(result.portfolioValue, 10000000)
  closeTo(result.expectedReturn, 0.087)
  closeTo(result.liquidityScore, 0.855)
  closeTo(result.volatility, Math.sqrt(0.0088285))
})

test('calculates invested amounts for each asset', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)
  const investedAmounts = Object.fromEntries(result.assets.map((asset) => [asset.assetId, asset.investedAmount]))

  assert.deepEqual(investedAmounts, {
    stocks: 4000000,
    bonds: 3000000,
    gold: 1500000,
    cash: 1500000,
  })
})

test('invested amounts sum to the portfolio value', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)
  const investedAmountTotal = result.assets.reduce((total, asset) => total + asset.investedAmount, 0)

  closeTo(investedAmountTotal, result.portfolioValue)
})

test('uses the weighted expected return formula', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)
  const expectedReturn = Object.entries(demoPortfolio.allocations).reduce(
    (total, [assetId, allocation]) => total + allocation * assetConfiguration[assetId].expectedReturn,
    0,
  )

  closeTo(result.expectedReturn, expectedReturn)
})

test('uses the weighted liquidity formula', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)
  const liquidityScore = Object.entries(demoPortfolio.allocations).reduce(
    (total, [assetId, allocation]) => total + allocation * assetConfiguration[assetId].liquidityScore,
    0,
  )

  closeTo(result.liquidityScore, liquidityScore)
})

test('uses the simplified zero-correlation volatility formula', () => {
  const result = calculatePortfolioMetrics(demoPortfolio)
  const variance = Object.entries(demoPortfolio.allocations).reduce(
    (total, [assetId, allocation]) => total + (allocation * assetConfiguration[assetId].volatility) ** 2,
    0,
  )

  closeTo(result.volatility, Math.sqrt(variance))
})

test('is deterministic for the same input', () => {
  assert.deepEqual(calculatePortfolioMetrics(demoPortfolio), calculatePortfolioMetrics(demoPortfolio))
})

test('rejects a missing portfolio', () => {
  assert.throws(() => calculatePortfolioMetrics(), { message: 'Portfolio is required.' })
})

test('rejects a missing asset configuration', () => {
  const portfolio = { totalCapital: 100, allocations: { stocks: 1 } }

  assert.throws(() => calculatePortfolioMetrics(portfolio, {}), {
    message: 'Asset configuration is missing for asset: stocks.',
  })
})

test('rejects non-numeric financial input', () => {
  const portfolio = { totalCapital: 100, allocations: { stocks: 1 } }
  const assets = { stocks: { expectedReturn: '0.12', volatility: 0.22, liquidityScore: 0.9 } }

  assert.throws(() => calculatePortfolioMetrics(portfolio, assets), {
    message: 'Asset expectedReturn must be numeric.',
  })
})

test('continues to reject invalid allocations through portfolio validation', () => {
  const portfolio = { totalCapital: 100, allocations: { stocks: 0.7, bonds: 0.2 } }

  assert.throws(() => calculatePortfolioMetrics(portfolio), {
    message: 'Asset allocations must sum to 1.',
  })
})

test('calculates a portfolio allocated entirely to one asset', () => {
  const portfolio = { totalCapital: 1000, allocations: { cash: 1 } }
  const result = calculatePortfolioMetrics(portfolio)

  closeTo(result.portfolioValue, 1000)
  closeTo(result.expectedReturn, 0.04)
  closeTo(result.liquidityScore, 1)
  closeTo(result.volatility, 0.01)
})
