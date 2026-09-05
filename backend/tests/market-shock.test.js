import test from 'node:test'
import assert from 'node:assert/strict'
import { assetConfiguration } from '../src/config/asset-config.js'
import { demoPortfolio } from '../src/models/portfolio.js'
import { calculatePortfolioMetrics } from '../src/financial-engine/portfolio-calculation.js'
import { demoShockScenarios, simulateMarketShock } from '../src/shock-engine/market-shock.js'

const tolerance = 1e-6
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < tolerance)
const noShockScenario = {
  name: 'No Shock',
  shocks: Object.keys(assetConfiguration).map((assetId) => ({ assetId, shockPercentage: 0 })),
}

test('supports demo scenarios', () => {
  assert.equal(demoShockScenarios.length, 3)
  assert.deepEqual(demoShockScenarios.map((scenario) => scenario.name), [
    'Market Crash',
    'Inflation Shock',
    'Positive Market',
  ])
})

test('no shock preserves portfolio value, allocation, and metrics', () => {
  const result = simulateMarketShock(demoPortfolio, noShockScenario)
  const original = calculatePortfolioMetrics(demoPortfolio)

  closeTo(result.shockedPortfolio.totalValue, original.portfolioValue)
  closeTo(result.shockedPortfolio.gainLoss, 0)
  closeTo(result.shockedPortfolio.gainLossPercentage, 0)
  closeTo(result.shockedPortfolio.expectedReturn, original.expectedReturn)
  closeTo(result.shockedPortfolio.liquidity, original.liquidityScore)
  closeTo(result.shockedPortfolio.volatility, original.volatility)
  for (const asset of result.assetImpacts) {
    closeTo(asset.shockedAllocationWeight, demoPortfolio.allocations[asset.assetId])
  }
})

test('negative stock shock reduces stocks and total value', () => {
  const result = simulateMarketShock(demoPortfolio, {
    name: 'Stock Decline',
    shocks: [{ assetId: 'stocks', shockPercentage: -0.20 }],
  })
  const stocks = result.assetImpacts.find((asset) => asset.assetId === 'stocks')

  closeTo(stocks.shockedValue, 3200000)
  assert.ok(stocks.valueChange < 0)
  assert.ok(result.shockedPortfolio.totalValue < result.originalPortfolio.totalValue)
  assert.ok(result.shockedPortfolio.gainLoss < 0)
})

test('positive stock shock increases stocks and total value', () => {
  const result = simulateMarketShock(demoPortfolio, {
    name: 'Stock Rally',
    shocks: [{ assetId: 'stocks', shockPercentage: 0.20 }],
  })
  const stocks = result.assetImpacts.find((asset) => asset.assetId === 'stocks')

  closeTo(stocks.shockedValue, 4800000)
  assert.ok(stocks.valueChange > 0)
  assert.ok(result.shockedPortfolio.totalValue > result.originalPortfolio.totalValue)
})

test('calculates every asset in the mixed market crash scenario', () => {
  const result = simulateMarketShock(demoPortfolio, demoShockScenarios[0])
  const impacts = Object.fromEntries(result.assetImpacts.map((asset) => [asset.assetId, asset]))

  closeTo(impacts.stocks.shockedValue, 3200000)
  closeTo(impacts.bonds.shockedValue, 2850000)
  closeTo(impacts.gold.shockedValue, 1650000)
  closeTo(impacts.cash.shockedValue, 1500000)
  closeTo(result.shockedPortfolio.totalValue, 9200000)
  closeTo(result.shockedPortfolio.gainLoss, -800000)
  closeTo(result.shockedPortfolio.gainLossPercentage, -0.08)
})

test('recalculates shocked allocations from shocked values', () => {
  const result = simulateMarketShock(demoPortfolio, demoShockScenarios[0])
  const total = result.assetImpacts.reduce((sum, asset) => sum + asset.shockedAllocationWeight, 0)

  closeTo(total, 1)
  closeTo(result.assetImpacts.find((asset) => asset.assetId === 'stocks').shockedAllocationWeight, 3200000 / 9200000)
})

test('calculates shocked return, liquidity, and volatility with Step 2 formulas', () => {
  const result = simulateMarketShock(demoPortfolio, demoShockScenarios[0])
  const weights = Object.fromEntries(result.assetImpacts.map((asset) => [asset.assetId, asset.shockedAllocationWeight]))
  const expectedReturn = Object.entries(weights).reduce(
    (sum, [assetId, weight]) => sum + weight * assetConfiguration[assetId].expectedReturn,
    0,
  )
  const liquidity = Object.entries(weights).reduce(
    (sum, [assetId, weight]) => sum + weight * assetConfiguration[assetId].liquidityScore,
    0,
  )
  const volatility = Math.sqrt(Object.entries(weights).reduce(
    (sum, [assetId, weight]) => sum + (weight * assetConfiguration[assetId].volatility) ** 2,
    0,
  ))

  closeTo(result.shockedPortfolio.expectedReturn, expectedReturn)
  closeTo(result.shockedPortfolio.liquidity, liquidity)
  closeTo(result.shockedPortfolio.volatility, volatility)
})

test('passes shocked metrics through the Risk Engine', () => {
  const result = simulateMarketShock(
    demoPortfolio,
    {
      name: 'Concentrated Stress',
      shocks: [
        { assetId: 'stocks', shockPercentage: 1 },
        { assetId: 'bonds', shockPercentage: -1 },
        { assetId: 'gold', shockPercentage: -1 },
        { assetId: 'cash', shockPercentage: -1 },
      ],
    },
    assetConfiguration,
  )
  const constrainedPortfolio = { ...demoPortfolio, maximumRisk: 0.01, minimumLiquidity: 0.95 }
  const constrainedResult = simulateMarketShock(constrainedPortfolio, {
    name: 'Constrained Stress',
    shocks: [
      { assetId: 'stocks', shockPercentage: 1 },
      { assetId: 'bonds', shockPercentage: -1 },
      { assetId: 'gold', shockPercentage: -1 },
      { assetId: 'cash', shockPercentage: -1 },
    ],
  })

  assert.equal(result.riskAssessment.status, 'HIGH')
  assert.equal(constrainedResult.riskAssessment.status, 'CRITICAL')
  assert.ok(constrainedResult.riskAssessment.breaches.length > 0)
})

test('does not mutate the original portfolio', () => {
  const original = structuredClone(demoPortfolio)

  simulateMarketShock(demoPortfolio, demoShockScenarios[0])

  assert.deepEqual(demoPortfolio, original)
})

test('handles a zero shocked portfolio without NaN or Infinity', () => {
  const result = simulateMarketShock(demoPortfolio, {
    name: 'Total Loss',
    shocks: Object.keys(assetConfiguration).map((assetId) => ({ assetId, shockPercentage: -1 })),
  })

  assert.equal(result.shockedPortfolio.totalValue, 0)
  assert.equal(result.shockedPortfolio.gainLossPercentage, -1)
  assert.equal(result.shockedPortfolio.expectedReturn, 0)
  assert.equal(result.shockedPortfolio.liquidity, 0)
  assert.equal(result.shockedPortfolio.volatility, 0)
  for (const asset of result.assetImpacts) {
    assert.equal(asset.shockedAllocationWeight, 0)
  }
})

test('handles a zero-capital portfolio without NaN or Infinity', () => {
  const portfolio = { ...demoPortfolio, totalCapital: 0 }
  const result = simulateMarketShock(portfolio, noShockScenario)

  assert.equal(result.originalPortfolio.totalValue, 0)
  assert.equal(result.shockedPortfolio.totalValue, 0)
  assert.equal(result.shockedPortfolio.gainLoss, 0)
  assert.equal(result.shockedPortfolio.gainLossPercentage, 0)
  assert.equal(Number.isFinite(result.shockedPortfolio.expectedReturn), true)
  assert.equal(Number.isFinite(result.shockedPortfolio.liquidity), true)
  assert.equal(Number.isFinite(result.shockedPortfolio.volatility), true)
})

test('rejects unknown, invalid, and duplicate shocks', () => {
  assert.throws(() => simulateMarketShock(demoPortfolio, {
    name: 'Unknown Asset',
    shocks: [{ assetId: 'crypto', shockPercentage: 0 }],
  }), { message: 'Asset configuration is missing for shocked asset: crypto.' })
  assert.throws(() => simulateMarketShock(demoPortfolio, {
    name: 'Too Large',
    shocks: [{ assetId: 'stocks', shockPercentage: 1.1 }],
  }), { message: 'Shock percentage must be between -1 and 1 for asset: stocks.' })
  assert.throws(() => simulateMarketShock(demoPortfolio, {
    name: 'Not Numeric',
    shocks: [{ assetId: 'stocks', shockPercentage: '-0.2' }],
  }), { message: 'Shock percentage must be numeric for asset: stocks.' })
  assert.throws(() => simulateMarketShock(demoPortfolio, {
    name: 'Duplicate',
    shocks: [
      { assetId: 'stocks', shockPercentage: 0 },
      { assetId: 'stocks', shockPercentage: 0.1 },
    ],
  }), { message: 'Duplicate market shock for asset: stocks.' })
})

test('rejects invalid scenarios', () => {
  assert.throws(() => simulateMarketShock(demoPortfolio), { message: 'Market shock scenario is required.' })
  assert.throws(() => simulateMarketShock(demoPortfolio, { name: '', shocks: [] }), {
    message: 'Market shock scenario name must be a non-empty string.',
  })
  assert.throws(() => simulateMarketShock(demoPortfolio, { name: 'Missing Shocks' }), {
    message: 'Market shock scenario shocks must be an array.',
  })
})

test('is deterministic for the same portfolio and scenario', () => {
  assert.deepEqual(
    simulateMarketShock(demoPortfolio, demoShockScenarios[0]),
    simulateMarketShock(demoPortfolio, demoShockScenarios[0]),
  )
})
