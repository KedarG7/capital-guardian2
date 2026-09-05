import test from 'node:test'
import assert from 'node:assert/strict'
import { assetConfiguration } from '../src/config/asset-config.js'
import { demoPortfolio } from '../src/models/portfolio.js'
import { calculatePortfolioMetrics } from '../src/financial-engine/portfolio-calculation.js'
import { optimizePortfolio } from '../src/financial-engine/portfolio-optimization.js'

const tolerance = 1e-10
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < tolerance)

test('returns an optimized allocation', () => {
  const result = optimizePortfolio(demoPortfolio)

  assert.deepEqual(Object.keys(result.allocation), Object.keys(assetConfiguration))
  assert.ok(result.metadata.validCandidates > 0)
})

test('optimized allocations sum to 1', () => {
  const result = optimizePortfolio(demoPortfolio)
  const total = Object.values(result.allocation).reduce((sum, weight) => sum + weight, 0)

  closeTo(total, 1)
})

test('optimized allocations respect minimum bounds', () => {
  const result = optimizePortfolio(demoPortfolio)

  for (const [assetId, weight] of Object.entries(result.allocation)) {
    assert.ok(weight >= assetConfiguration[assetId].minimumAllocation)
  }
})

test('optimized allocations respect maximum bounds', () => {
  const result = optimizePortfolio(demoPortfolio)

  for (const [assetId, weight] of Object.entries(result.allocation)) {
    assert.ok(weight <= assetConfiguration[assetId].maximumAllocation)
  }
})

test('optimized metrics respect portfolio constraints', () => {
  const result = optimizePortfolio(demoPortfolio)

  assert.ok(result.metrics.volatility <= demoPortfolio.maximumRisk)
  assert.ok(result.metrics.liquidityScore >= demoPortfolio.minimumLiquidity)
})

test('returned metrics match the calculation engine', () => {
  const result = optimizePortfolio(demoPortfolio)
  const expectedMetrics = calculatePortfolioMetrics({
    ...demoPortfolio,
    allocations: result.allocation,
  })

  assert.deepEqual(result.metrics.portfolioValue, expectedMetrics.portfolioValue)
  assert.deepEqual(result.metrics.expectedReturn, expectedMetrics.expectedReturn)
  assert.deepEqual(result.metrics.liquidityScore, expectedMetrics.liquidityScore)
  assert.deepEqual(result.metrics.volatility, expectedMetrics.volatility)
})

test('calculates risk-adjusted score correctly', () => {
  const result = optimizePortfolio(demoPortfolio)

  closeTo(result.metrics.riskAdjustedScore, result.metrics.expectedReturn / result.metrics.volatility)
})

test('is deterministic', () => {
  assert.deepEqual(optimizePortfolio(demoPortfolio), optimizePortfolio(demoPortfolio))
})

test('does not mutate the original portfolio', () => {
  const original = structuredClone(demoPortfolio)

  optimizePortfolio(demoPortfolio)

  assert.deepEqual(demoPortfolio, original)
})

test('rejects impossible constraints', () => {
  const portfolio = { ...demoPortfolio, maximumRisk: 0, minimumLiquidity: 1 }

  assert.throws(() => optimizePortfolio(portfolio), {
    message: 'No feasible portfolio allocation satisfies the current constraints.',
  })
})

test('rejects invalid allocation bounds', () => {
  const assets = {
    ...assetConfiguration,
    stocks: { ...assetConfiguration.stocks, minimumAllocation: 0.8, maximumAllocation: 0.2 },
  }

  assert.throws(() => optimizePortfolio(demoPortfolio, assets), {
    message: 'Allocation bounds are invalid for asset: stocks.',
  })
})

test('rejects invalid allocation step', () => {
  assert.throws(() => optimizePortfolio(demoPortfolio, assetConfiguration, 0), {
    message: 'Allocation step must be greater than 0 and no greater than 1.',
  })
})

test('evaluates the complete deterministic grid without hardcoded allocation', () => {
  const result = optimizePortfolio(demoPortfolio)

  assert.equal(result.metadata.allocationStep, 0.05)
  assert.ok(result.metadata.candidatesEvaluated > result.metadata.validCandidates)
})
