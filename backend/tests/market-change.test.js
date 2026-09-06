import test from 'node:test'
import assert from 'node:assert/strict'
import { detectMarketChanges } from '../src/market-data/marketChangeDetector.js'

test('detectMarketChanges correctly flags < 2% as STABLE and undetected', () => {
  const currentSnapshot = {
    timestamp: '2026-09-01T00:00:00.000Z',
    assets: [
      { assetId: 'stocks', name: 'Stocks', changePercent: 1.5, previousValue: 100, currentValue: 101.5 }
    ]
  }
  const result = detectMarketChanges({}, currentSnapshot)
  assert.equal(result.detected, false)
  assert.equal(result.severity, 'STABLE')
  assert.equal(result.direction, 'STABLE')
  assert.equal(result.affectedAssets.length, 0)
})

test('detectMarketChanges correctly flags exactly 2% as NOTICE/affected', () => {
  const currentSnapshot = {
    assets: [
      { assetId: 'bonds', name: 'Bonds', changePercent: -2.0, previousValue: 100, currentValue: 98 }
    ]
  }
  const result = detectMarketChanges({}, currentSnapshot)
  assert.equal(result.detected, true)
  assert.equal(result.severity, 'NOTICE')
  assert.equal(result.direction, 'DOWN')
  assert.equal(result.affectedAssets.length, 1)
  assert.equal(result.affectedAssets[0].direction, 'DOWN')
})

test('detectMarketChanges correctly flags >= 5% as SIGNIFICANT and >= 10% as EXTREME', () => {
  const currentSnapshot = {
    assets: [
      { assetId: 'stocks', name: 'Stocks', changePercent: 5.5 },
      { assetId: 'gold', name: 'Gold', changePercent: -12.0 }
    ]
  }
  const result = detectMarketChanges({}, currentSnapshot)
  assert.equal(result.detected, true)
  assert.equal(result.severity, 'EXTREME')
  assert.equal(result.direction, 'MIXED')
  assert.equal(result.affectedAssets.length, 2)
})

test('detectMarketChanges safely handles NaN/Infinity missing values', () => {
  const currentSnapshot = {
    assets: [
      { assetId: 'cash', name: 'Cash', changePercent: NaN },
      { assetId: 'bonds', name: 'Bonds', changePercent: Infinity }
    ]
  }
  const result = detectMarketChanges({}, currentSnapshot)
  assert.equal(result.detected, false)
  assert.equal(result.severity, 'STABLE')
})

test('detectMarketChanges works with legacy snapshots missing changePercent', () => {
  const previousSnapshot = {
    assets: [{ assetId: 'stocks', marketValue: 100 }]
  }
  const currentSnapshot = {
    assets: [{ assetId: 'stocks', name: 'Stocks', marketValue: 106 }]
  }
  const result = detectMarketChanges(previousSnapshot, currentSnapshot)
  assert.equal(result.detected, true)
  assert.equal(result.severity, 'SIGNIFICANT')
  assert.equal(result.direction, 'UP')
})
