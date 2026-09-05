import test from 'node:test'
import assert from 'node:assert/strict'
import { Portfolio } from '../src/models/persistence/Portfolio.js'
import { Analysis } from '../src/models/Analysis.js'
import { ScenarioResult } from '../src/models/ScenarioResult.js'
import { ControlDecision } from '../src/models/ControlDecision.js'
import { demoPortfolio, validatePortfolio } from '../src/models/portfolio.js'
import { assetConfiguration } from '../src/config/asset-config.js'

const userId = '507f1f77bcf86cd799439011'

const validPortfolioDocument = () => new Portfolio({
  ...demoPortfolio,
  allocations: demoPortfolio.allocations,
  assets: Object.values(assetConfiguration),
})

test('portfolio schema supports required data and timestamps', async () => {
  const document = validPortfolioDocument()
  document.userId = userId

  await assert.doesNotReject(document.validate())
  assert.equal(Portfolio.schema.options.timestamps, true)
  assert.equal(document.totalCapital, 10000000)
})

test('portfolio schema requires capital and allocations', async () => {
  const document = new Portfolio({ maximumRisk: 0.4, minimumLiquidity: 0.15 })
  const error = await document.validate().catch((validationError) => validationError)

  assert.ok(error.errors.totalCapital)
  assert.ok(error.errors.allocations)
})

test('analysis schema supports flexible engine results and timestamps', async () => {
  const document = new Analysis({
    userId,
    analysisType: 'full',
    result: { status: 'LOW', metrics: { volatility: 0.09 } },
  })

  await assert.doesNotReject(document.validate())
  assert.equal(Analysis.schema.options.timestamps, true)
})

test('scenario result schema validates required simulation fields', async () => {
  const document = new ScenarioResult({
    userId,
    scenarioName: 'Market Crash',
    originalPortfolioValue: 100,
    shockedPortfolioValue: 90,
    gainLoss: -10,
    gainLossPercentage: -0.1,
    shockedReturn: 0.08,
    shockedVolatility: 0.1,
    shockedLiquidity: 0.8,
    riskStatus: 'LOW',
  })

  await assert.doesNotReject(document.validate())
  assert.equal(ScenarioResult.schema.options.timestamps, true)
})

test('control decision schema validates recommendation data', async () => {
  const document = new ControlDecision({
    userId,
    controlAction: 'NO_ACTION',
    actionRequired: false,
    originalAllocation: { stocks: 0.4 },
    before: { riskStatus: 'LOW' },
    explanation: { summary: 'No action required.' },
  })

  await assert.doesNotReject(document.validate())
  assert.equal(ControlDecision.schema.options.timestamps, true)
})

test('portfolio persistence uses existing Step 1 validation', () => {
  assert.doesNotThrow(() => validatePortfolio(demoPortfolio, assetConfiguration))
  assert.throws(() => validatePortfolio({ ...demoPortfolio, allocations: { stocks: 2 } }, assetConfiguration), {
    message: 'Asset allocation must be between 0 and 1 for asset: stocks.',
  })
})