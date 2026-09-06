import test from 'node:test'
import assert from 'node:assert/strict'
import { generateMarketResponse, determineResponseLevel } from '../src/control-engine/marketResponseService.js'

test('Step 5 - Generate recommendationData correctly', async (t) => {
  const portfolio = {
    totalCapital: 2500000,
    maximumRisk: 0.05,
    minimumLiquidity: 0.10,
    allocations: {
      stocks: 0.40,
      bonds: 0.30,
      gold: 0.15,
      cash: 0.15
    }
  }

  // Crash
  const changes = [
    { assetId: 'stocks', changePercent: -20 },
    { assetId: 'bonds', changePercent: -5 },
    { assetId: 'gold', changePercent: 10 },
    { assetId: 'cash', changePercent: 0 }
  ]

  const response = generateMarketResponse(portfolio, 'EXTREME', changes, [])

  console.log('DEBUG:', response)
  assert.ok(response.recommendationData, 'recommendationData should be populated for risk breach')
  assert.equal(response.recommendationData.decision.recommendationAvailable, true)
  assert.equal(response.recommendationData.current.status, 'HIGH')
  
  // Verify weights sum
  const newAllocations = Object.values(response.recommendationData.recommended.allocation)
  const sum = newAllocations.reduce((a, b) => a + b, 0)
  assert.ok(Math.abs(sum - 1) < 1e-5, 'Recommended weights sum to 1')
  
  // Verify monetary changes
  const stockChange = response.recommendationData.changes.find(c => c.asset === 'stocks')
  assert.ok(stockChange.monetaryChange, 'Monetary change calculated')

  // Verify Risk Improvement
  assert.ok(response.recommendationData.impact.riskChange <= 0, 'Risk should decrease or stay same')
})

test('Step 5 - No Valid Rebalance handles constraints', async (t) => {
  const portfolio = {
    totalCapital: 1000000,
    maximumRisk: 0.01, // Impossible
    minimumLiquidity: 0.10,
    allocations: {
      stocks: 0.40,
      bonds: 0.30,
      gold: 0.15,
      cash: 0.15
    }
  }

  const changes = [
    { assetId: 'stocks', changePercent: -20 }
  ]

  const response = generateMarketResponse(portfolio, 'EXTREME', changes, [])
  assert.equal(response.recommendationData.decision.status, 'NO_VALID_REBALANCE')
  assert.equal(response.recommendationData.decision.recommendationAvailable, false)
})

test('Step 5 - Healthy portfolio produces NO_RECOMMENDATION (null)', async (t) => {
  const portfolio = {
    totalCapital: 1000000,
    maximumRisk: 0.50, // High risk tolerance
    minimumLiquidity: 0.10,
    allocations: {
      stocks: 0.40,
      bonds: 0.30,
      gold: 0.15,
      cash: 0.15
    }
  }

  const changes = [
    { assetId: 'stocks', changePercent: -1 }
  ]

  const response = generateMarketResponse(portfolio, 'STABLE', changes, [])
  assert.equal(response.recommendationData, undefined) // Not generated because responseLevel is 'MONITOR'
})
