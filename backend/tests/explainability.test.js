import test from 'node:test'
import assert from 'node:assert/strict'
import { generateExplanation } from '../src/services/explainability/explainability-service.js'

const healthyRisk = {
  status: 'LOW',
  isWithinLimits: true,
  risk: { portfolioVolatility: 0.09, maximumRisk: 0.4, riskUtilization: 0.225 },
  liquidity: { liquidityScore: 0.855, minimumLiquidity: 0.15, liquidityBuffer: 0.705 },
  breaches: [],
}

const controlResult = {
  controlAction: 'REBALANCE_RECOMMENDED',
  reason: ['Portfolio volatility exceeds the configured maximum risk limit.'],
  before: { allocation: { stocks: 0.4 }, expectedReturn: 0.087, volatility: 0.46, liquidity: 0.5, riskStatus: 'HIGH' },
  recommended: { allocation: { stocks: 0.3 }, expectedReturn: 0.08, volatility: 0.31, liquidity: 0.61, riskStatus: 'LOW' },
  changes: [{ assetId: 'stocks', oldWeight: 0.4, newWeight: 0.3, change: -0.1 }],
  impact: { riskChange: -0.15, liquidityChange: 0.11, returnChange: -0.007 },
  explanation: { summary: 'A deterministic rebalancing recommendation was generated.' },
}

test('explains a healthy no-action risk result', () => {
  const explanation = generateExplanation(healthyRisk)

  assert.equal(explanation.decision, 'NO_ACTION')
  assert.match(explanation.summary, /no rebalancing action is required/)
  assert.ok(explanation.metrics.some((metric) => metric.label === 'Risk utilization'))
  assert.equal(explanation.confidence, 'DETERMINISTIC')
})

test('explains risk, liquidity, and critical breaches from actual breach data', () => {
  const result = generateExplanation({
    ...healthyRisk,
    status: 'CRITICAL',
    isWithinLimits: false,
    breaches: [
      { type: 'RISK', message: 'Portfolio volatility exceeds the configured maximum risk limit.', actual: 0.46, limit: 0.4 },
      { type: 'LIQUIDITY', message: 'Portfolio liquidity is below the minimum required level.', actual: 0.1, limit: 0.15 },
    ],
  })

  assert.equal(result.decision, 'CRITICAL')
  assert.equal(result.reasons.length, 2)
  assert.ok(result.reasons[0].includes('Difference:'))
})

test('explains moderate utilization without calling it a hard breach', () => {
  const result = generateExplanation({
    ...healthyRisk,
    status: 'MODERATE',
    risk: { ...healthyRisk.risk, riskUtilization: 0.8 },
  })

  assert.equal(result.decision, 'MODERATE')
  assert.ok(result.reasons.some((reason) => reason.includes('elevated monitoring')))
})

test('explains optimization objective and actual metrics', () => {
  const result = generateExplanation({
    allocation: { stocks: 0.1, bonds: 0.4, gold: 0.1, cash: 0.4 },
    metrics: { expectedReturn: 0.064, volatility: 0.0418, liquidityScore: 0.88, riskAdjustedScore: 1.53 },
  })

  assert.equal(result.decision, 'OPTIMIZATION_RESULT')
  assert.ok(result.summary.includes('1.53'))
  assert.ok(result.reasons.some((reason) => reason.includes('feasible allocations')))
})

test('explains rebalancing before/after changes and impact', () => {
  const result = generateExplanation(controlResult)

  assert.equal(result.decision, 'REBALANCE_RECOMMENDED')
  assert.ok(result.reasons.some((reason) => reason.includes('decreased from 40.0% to 30.0%')))
  assert.ok(result.impact.some((impact) => impact.includes('31.0%')))
})

test('explains market shock asset impacts and risk result', () => {
  const result = generateExplanation({
    scenario: { name: 'Market Crash' },
    originalPortfolio: { totalValue: 10000000 },
    shockedPortfolio: { totalValue: 9200000, gainLossPercentage: -0.08, expectedReturn: 0.084, volatility: 0.085, liquidity: 0.849 },
    assetImpacts: [{ assetId: 'stocks', originalValue: 4000000, shockedValue: 3200000, shockPercentage: -0.2 }],
    riskAssessment: healthyRisk,
  })

  assert.equal(result.decision, 'LOW')
  assert.ok(result.summary.includes('Market Crash'))
  assert.ok(result.reasons[0].includes('stocks'))
})

test('handles missing input deterministically', () => {
  assert.deepEqual(generateExplanation(), generateExplanation(null))
  assert.equal(generateExplanation(null).decision, 'UNAVAILABLE')
})

test('same result produces identical explanation', () => {
  assert.deepEqual(generateExplanation(controlResult), generateExplanation(controlResult))
})
