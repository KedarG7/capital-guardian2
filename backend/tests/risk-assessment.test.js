import test from 'node:test'
import assert from 'node:assert/strict'
import { assetConfiguration } from '../src/config/asset-config.js'
import { demoPortfolio } from '../src/models/portfolio.js'
import { calculatePortfolioMetrics } from '../src/financial-engine/portfolio-calculation.js'
import { assessPortfolioRisk } from '../src/financial-engine/risk-assessment.js'

const tolerance = 1e-10
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < tolerance)

test('demo portfolio is within limits with LOW status', () => {
  const result = assessPortfolioRisk(demoPortfolio)

  assert.equal(result.status, 'LOW')
  assert.equal(result.isWithinLimits, true)
  assert.equal(result.risk.limitStatus, 'PASS')
  assert.equal(result.liquidity.limitStatus, 'PASS')
  assert.equal(result.allocation.status, 'PASS')
  closeTo(result.risk.portfolioVolatility, 0.09396009791395495)
  closeTo(result.risk.riskUtilization, 0.09396009791395495 / 0.4)
  closeTo(result.liquidity.liquidityScore, 0.855)
  closeTo(result.liquidity.liquidityBuffer, 0.705)
  assert.deepEqual(result.breaches, [])
})

test('reports a risk limit breach as HIGH', () => {
  const portfolio = { ...demoPortfolio, maximumRisk: 0.05 }
  const result = assessPortfolioRisk(portfolio)

  assert.equal(result.risk.limitStatus, 'BREACH')
  assert.equal(result.liquidity.limitStatus, 'PASS')
  assert.equal(result.status, 'HIGH')
  assert.equal(result.isWithinLimits, false)
  assert.equal(result.breaches[0].type, 'RISK')
})

test('reports a liquidity limit breach as HIGH', () => {
  const portfolio = { ...demoPortfolio, minimumLiquidity: 0.9 }
  const result = assessPortfolioRisk(portfolio)

  assert.equal(result.risk.limitStatus, 'PASS')
  assert.equal(result.liquidity.limitStatus, 'BREACH')
  assert.equal(result.status, 'HIGH')
  assert.equal(result.isWithinLimits, false)
  assert.equal(result.breaches[0].type, 'LIQUIDITY')
})

test('reports simultaneous risk and liquidity breaches as CRITICAL', () => {
  const portfolio = { ...demoPortfolio, maximumRisk: 0.05, minimumLiquidity: 0.9 }

  assert.equal(assessPortfolioRisk(portfolio).status, 'CRITICAL')
})

test('reports MODERATE status when utilization is at least 75 percent without breach', () => {
  const portfolio = { ...demoPortfolio, maximumRisk: 0.1 }
  const result = assessPortfolioRisk(portfolio)

  assert.equal(result.risk.limitStatus, 'PASS')
  assert.ok(result.risk.riskUtilization >= 0.75)
  assert.equal(result.status, 'MODERATE')
})

test('reports allocation violations without changing the portfolio', () => {
  const portfolio = {
    ...demoPortfolio,
    allocations: { stocks: 0.05, bonds: 0.35, gold: 0.15, cash: 0.45 },
  }
  const result = assessPortfolioRisk(portfolio)

  assert.equal(result.allocation.status, 'BREACH')
  assert.equal(result.allocation.violations[0].assetId, 'stocks')
  assert.equal(result.allocation.violations[0].actual, 0.05)
  assert.equal(result.breaches[0].type, 'ALLOCATION')
  assert.equal(result.breaches[0].metric, 'allocationCompliance')
  assert.equal(result.isWithinLimits, false)
})

test('calculates risk utilization from volatility and maximum risk', () => {
  const result = assessPortfolioRisk(demoPortfolio)
  const metrics = calculatePortfolioMetrics(demoPortfolio)

  closeTo(result.risk.riskUtilization, metrics.volatility / demoPortfolio.maximumRisk)
})

test('calculates liquidity buffer from liquidity and minimum liquidity', () => {
  const result = assessPortfolioRisk(demoPortfolio)
  const metrics = calculatePortfolioMetrics(demoPortfolio)

  closeTo(result.liquidity.liquidityBuffer, metrics.liquidityScore - demoPortfolio.minimumLiquidity)
})

test('does not mutate the original portfolio or assets', () => {
  const portfolio = structuredClone(demoPortfolio)
  const assets = structuredClone(assetConfiguration)

  assessPortfolioRisk(portfolio, assets)

  assert.deepEqual(portfolio, demoPortfolio)
  assert.deepEqual(assets, assetConfiguration)
})

test('is deterministic for the same input', () => {
  assert.deepEqual(assessPortfolioRisk(demoPortfolio), assessPortfolioRisk(demoPortfolio))
})

test('handles maximumRisk zero safely', () => {
  const portfolio = { ...demoPortfolio, maximumRisk: 0 }
  const result = assessPortfolioRisk(portfolio)

  assert.equal(result.risk.riskUtilization, 1)
  assert.equal(Number.isFinite(result.risk.riskUtilization), true)
  assert.equal(result.risk.limitStatus, 'BREACH')
})

test('rejects missing or invalid input clearly', () => {
  assert.throws(() => assessPortfolioRisk(), { message: 'Portfolio is required.' })
  assert.throws(() => assessPortfolioRisk({ ...demoPortfolio, maximumRisk: '0.4' }), {
    message: 'Portfolio maximumRisk must be a non-negative number.',
  })
  assert.throws(() => assessPortfolioRisk(demoPortfolio, assetConfiguration, null), {
    message: 'Calculated portfolio metrics are required.',
  })
  assert.throws(() => assessPortfolioRisk(demoPortfolio, {
    ...assetConfiguration,
    stocks: { ...assetConfiguration.stocks, volatility: '0.22' },
  }), { message: 'Asset volatility must be numeric.' })
  assert.throws(() => assessPortfolioRisk(demoPortfolio, {
    ...assetConfiguration,
    stocks: { ...assetConfiguration.stocks, maximumAllocation: '0.6' },
  }), { message: 'Asset allocation bounds must be numeric for asset: stocks.' })
})
