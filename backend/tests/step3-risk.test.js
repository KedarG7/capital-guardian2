import test from 'node:test'
import assert from 'node:assert/strict'
import { generateMarketResponse } from '../src/control-engine/marketResponseService.js'

test('generateMarketResponse re-evaluates risk based on market shock', () => {
  const portfolio = {
    totalCapital: 1000000,
    maximumRisk: 0.15, // tight limit
    minimumLiquidity: 0.1,
    allocations: {
      stocks: 0.90, // huge stocks, close to risk limit normally
      bonds: 0.10,
      gold: 0.00,
      cash: 0.00
    }
  }

  // Without market change, risk might be MODERATE or HIGH
  const stableResponse = generateMarketResponse(portfolio, 'STABLE', [], [])
  
  // Now apply a massive shock to Stocks
  const changes = [
    { assetId: 'stocks', changePercent: -50 } // -50% shock
  ]
  const shockResponse = generateMarketResponse(portfolio, 'EXTREME_CHANGE', changes, [])

  // The shockResponse should reflect the newly calculated risk
  assert.ok(shockResponse.risk)
  assert.ok(shockResponse.risk.status === 'CRITICAL' || shockResponse.risk.status === 'HIGH')
  assert.ok(shockResponse.responseLevel === 'URGENT_CONTROL_RECOMMENDED' || shockResponse.responseLevel === 'REBALANCE_RECOMMENDED')
})

test('generateMarketResponse returns MONITOR if risk remains LOW despite market change', () => {
  const portfolio = {
    totalCapital: 1000000,
    maximumRisk: 0.50, // very loose
    minimumLiquidity: 0.01,
    allocations: {
      stocks: 0.20,
      bonds: 0.30,
      gold: 0.20,
      cash: 0.30
    }
  }

  const changes = [
    { assetId: 'stocks', changePercent: -20 } // Stocks crash, but they are only 10%
  ]

  const response = generateMarketResponse(portfolio, 'EXTREME_CHANGE', changes, [])
  assert.equal(response.risk.status, 'LOW')
  assert.equal(response.responseLevel, 'MONITOR')
})
