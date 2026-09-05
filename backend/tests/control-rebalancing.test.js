import test from 'node:test'
import assert from 'node:assert/strict'
import { assetConfiguration } from '../src/config/asset-config.js'
import { demoPortfolio } from '../src/models/portfolio.js'
import { validatePortfolio } from '../src/models/portfolio.js'
import { assessPortfolioRisk } from '../src/financial-engine/risk-assessment.js'
import { evaluateControl } from '../src/control-engine/control-rebalancing.js'

const tolerance = 1e-10
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < tolerance)

function getPortfolio(overrides = {}) {
  return { ...demoPortfolio, ...overrides }
}

test('healthy portfolio requires NO_ACTION', () => {
  const result = evaluateControl(demoPortfolio)

  assert.equal(result.controlAction, 'NO_ACTION')
  assert.equal(result.recommended, null)
  assert.deepEqual(result.changes, [])
  assert.equal(result.explanation.reasons.length, 0)
})

test('risk breach produces a safer rebalancing recommendation', () => {
  const portfolio = getPortfolio({ maximumRisk: 0.05 })
  const result = evaluateControl(portfolio)

  assert.equal(result.controlAction, 'REBALANCE_RECOMMENDED')
  assert.ok(result.recommended)
  assert.ok(result.recommended.volatility < result.before.volatility)
  assert.ok(result.recommended.volatility <= portfolio.maximumRisk)
  assert.notEqual(result.recommended.riskStatus, 'HIGH')
  assert.ok(result.explanation.reasons.some((reason) => reason.includes('volatility')))
})

test('liquidity breach produces a more liquid recommendation', () => {
  const portfolio = getPortfolio({ minimumLiquidity: 0.86 })
  const result = evaluateControl(portfolio)

  assert.equal(result.controlAction, 'REBALANCE_RECOMMENDED')
  assert.ok(result.recommended.liquidity > result.before.liquidity)
  assert.ok(result.recommended.riskStatus !== undefined)
  assert.ok(result.explanation.reasons.some((reason) => reason.includes('liquidity')))
})

test('low liquidity breach improves when a feasible target exists', () => {
  const assets = {
    ...assetConfiguration,
    stocks: { ...assetConfiguration.stocks, liquidityScore: 0 },
    bonds: { ...assetConfiguration.bonds, liquidityScore: 0.05 },
    gold: { ...assetConfiguration.gold, liquidityScore: 0.10 },
    cash: { ...assetConfiguration.cash, liquidityScore: 0.50 },
  }
  const portfolio = getPortfolio({ minimumLiquidity: 0.15 })
  const result = evaluateControl(portfolio, undefined, assets)

  assert.equal(result.before.liquidity < portfolio.minimumLiquidity, true)
  assert.equal(result.controlAction, 'REBALANCE_RECOMMENDED')
  assert.ok(result.recommended.liquidity > result.before.liquidity)
  assert.equal(result.validation.riskAssessment.liquidity.limitStatus, 'PASS')
})

test('both breaches produce CRITICAL_BREACH', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.05, minimumLiquidity: 0.86 }))

  assert.equal(result.controlAction, 'CRITICAL_BREACH')
  assert.ok(result.reason.length >= 2)
})

test('recommended allocation sums to one and respects bounds', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.05 }))
  const total = Object.values(result.recommended.allocation).reduce((sum, weight) => sum + weight, 0)

  closeTo(total, 1)
  for (const [assetId, weight] of Object.entries(result.recommended.allocation)) {
    assert.equal(typeof weight, 'number')
    assert.ok(weight >= assetConfiguration[assetId].minimumAllocation)
    assert.ok(weight <= assetConfiguration[assetId].maximumAllocation)
  }
  validatePortfolio({ ...demoPortfolio, allocations: result.recommended.allocation })
  assert.equal(result.validation.status, 'PASS')
  assert.equal(result.validation.riskAssessment.isWithinLimits, true)
})

test('recommended metrics and risk assessment are calculated by existing engines', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.05 }))

  assert.equal(result.recommended.portfolioValue, demoPortfolio.totalCapital)
  assert.equal(result.recommended.riskStatus, result.validation.riskAssessment.status)
  assert.equal(result.validation.riskAssessment.risk.limitStatus, 'PASS')
  assert.equal(result.validation.riskAssessment.liquidity.limitStatus, 'PASS')
})

test('changes and impact compare before and after allocations', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.05 }))
  const stockChange = result.changes.find((change) => change.assetId === 'stocks')

  closeTo(stockChange.change, stockChange.newWeight - stockChange.oldWeight)
  closeTo(result.impact.riskChange, result.recommended.volatility - result.before.volatility)
  closeTo(result.impact.liquidityChange, result.recommended.liquidity - result.before.liquidity)
  closeTo(result.impact.returnChange, result.recommended.expectedReturn - result.before.expectedReturn)
  closeTo(result.changes.reduce((sum, change) => sum + change.change, 0), 0)
})

test('returns a safe failure for impossible constraints', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.001, minimumLiquidity: 0.99 }))

  assert.equal(result.controlAction, 'CRITICAL_BREACH')
  assert.equal(result.recommended, null)
  assert.equal(result.validation.status, 'FAIL')
  assert.match(result.explanation.summary, /Critical control breach/)
  assert.ok(result.explanation.reasons.some((reason) => reason.includes('No feasible allocation')))
})

test('returns CRITICAL_BREACH when a risk-only request has no feasible target', () => {
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.001 }))

  assert.equal(result.controlAction, 'CRITICAL_BREACH')
  assert.equal(result.recommended, null)
  assert.equal(result.validation.status, 'FAIL')
})

test('does not mutate the original portfolio', () => {
  const portfolio = structuredClone(demoPortfolio)
  portfolio.maximumRisk = 0.05
  const original = structuredClone(portfolio)

  evaluateControl(portfolio)

  assert.deepEqual(portfolio, original)
})

test('is deterministic', () => {
  const portfolio = getPortfolio({ maximumRisk: 0.05 })

  assert.deepEqual(evaluateControl(portfolio), evaluateControl(portfolio))
})

test('uses a Step 5 simulation result as the rebalancing context', async () => {
  const { demoShockScenarios, simulateMarketShock } = await import('../src/shock-engine/market-shock.js')
  const simulation = simulateMarketShock(demoPortfolio, demoShockScenarios[0])
  const result = evaluateControl(demoPortfolio, simulation.riskAssessment, assetConfiguration, simulation)

  assert.deepEqual(result.before.allocation, Object.fromEntries(
    simulation.assetImpacts.map((asset) => [asset.assetId, asset.shockedAllocationWeight]),
  ))
})

test('explanation follows actual breach and improvement results', () => {
  const riskAssessment = assessPortfolioRisk(getPortfolio({ maximumRisk: 0.05 }))
  const result = evaluateControl(getPortfolio({ maximumRisk: 0.05 }), riskAssessment)

  assert.ok(result.explanation.reasons.some((reason) => reason.includes('volatility')))
  assert.ok(result.explanation.reasons.some((reason) => reason.includes('reduces exposure')))
})
