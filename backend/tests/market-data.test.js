import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMarketData } from '../src/market-data/marketDataNormalizer.js'
import { getMarketSnapshot } from '../src/market-data/marketDataService.js'

test('market-data normalizer calculates percentage change correctly', () => {
  const currentRaw = [
    { assetId: 'stocks', name: 'Stocks', price: 110 }
  ]
  const prevRaw = [
    { assetId: 'stocks', price: 100 }
  ]

  const normalized = normalizeMarketData(currentRaw, prevRaw, 'test-source', true)
  
  assert.equal(normalized.mode, 'live')
  assert.equal(normalized.source, 'test-source')
  assert.equal(normalized.isLive, true)
  
  const stocks = normalized.assets[0]
  assert.equal(stocks.assetId, 'stocks')
  assert.equal(stocks.assetName, 'Stocks')
  assert.equal(stocks.currentValue, 110)
  assert.equal(stocks.previousValue, 100)
  assert.equal(stocks.changePercent, 10)
})

test('market-data normalizer handles previous value = 0 safely without Infinity/NaN', () => {
  const currentRaw = [
    { assetId: 'cash', name: 'Cash', price: 100, dailyChangePercent: 0 }
  ]
  const prevRaw = [
    { assetId: 'cash', price: 0 }
  ]

  const normalized = normalizeMarketData(currentRaw, prevRaw, 'test-source', false)
  const cash = normalized.assets[0]
  
  assert.equal(cash.previousValue, 0)
  assert.equal(cash.currentValue, 100)
  // When prev is 0, changePercent falls back to dailyChangePercent if available, or stays 0
  assert.equal(cash.changePercent, 0)
})

test('market-data normalizer falls back safely on missing values', () => {
  const currentRaw = [
    { assetId: 'bonds', name: 'Bonds', price: null, dailyChangePercent: 5 }
  ]
  const prevRaw = [] // no previous

  const normalized = normalizeMarketData(currentRaw, prevRaw, 'test', false)
  const bonds = normalized.assets[0]
  
  assert.equal(bonds.previousValue, 0)
  // Falls back to dailyChangePercent
  assert.equal(bonds.changePercent, 5) 
})

test('market-data service returns demo data if live fails (provider failure)', async () => {
  // Config defaults to live=false or missing key, so it should fallback to demo
  const snapshot = await getMarketSnapshot()
  
  assert.equal(snapshot.mode, 'demo')
  assert.equal(snapshot.source, 'demo-provider')
  assert.equal(snapshot.assets.length, 4) // Stocks, Bonds, Gold, Cash
  
  const stocks = snapshot.assets.find(a => a.assetId === 'stocks')
  assert.ok(stocks)
  assert.ok(stocks.currentValue > 0)
  assert.ok(stocks.previousValue > 0)
  assert.equal(typeof stocks.changePercent, 'number')
  assert.ok(Number.isFinite(stocks.changePercent))
})
