import { marketDataConfig } from './marketDataConfig.js'

export async function fetchLiveMarketData() {
  if (!marketDataConfig.apiKey) {
    throw new Error('API key is missing')
  }
  // For a hackathon, we would connect to Alpha Vantage or Yahoo Finance.
  // Since we don't have a real API configured by default, fail gracefully.
  throw new Error('Live provider connection failed (mock failure)')
}

export function fetchDemoMarketData() {
  return [
    { assetId: 'stocks', name: 'Stocks', dailyChangePercent: -7.2, price: 14291.66 }, // SIGNIFICANT DOWNTURN
    { assetId: 'bonds', name: 'Bonds', dailyChangePercent: 0.21, price: 104.20 },
    { assetId: 'gold', name: 'Gold', dailyChangePercent: 1.15, price: 1950.00 },
    { assetId: 'cash', name: 'Cash', dailyChangePercent: 0.00, price: 1.00 }
  ]
}

export function fetchPreviousDemoMarketData() {
  return [
    { assetId: 'stocks', name: 'Stocks', price: 15400.50 },
    { assetId: 'bonds', name: 'Bonds', price: 103.98 },
    { assetId: 'gold', name: 'Gold', price: 1927.84 },
    { assetId: 'cash', name: 'Cash', price: 1.00 }
  ]
}
