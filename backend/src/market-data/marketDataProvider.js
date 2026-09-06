import { marketDataConfig } from './marketDataConfig.js'
import { fetchRealMarketData } from './yahooFinanceProvider.js'

export async function fetchLiveMarketData() {
  if (marketDataConfig.useLive) {
    try {
      const symbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS']
      const realData = await fetchRealMarketData(symbols)
      if (realData && realData.length > 0) {
        // Keep bonds, gold, cash from demo data so the app doesn't break
        const baseData = fetchDemoMarketData().filter(a => a.assetId !== 'stocks')
        return [...baseData, ...realData]
      }
    } catch (e) {
      console.error(e)
    }
  }
  // Fallback to error if LIVE fails or is not enabled
  throw new Error('Live provider connection failed (mock failure)')
}

export function fetchDemoMarketData() {
  return [
    { assetId: 'stocks', name: 'Stocks', dailyChangePercent: -20.0, price: 12320.40 }, // EXTREME CRASH
    { assetId: 'bonds', name: 'Bonds', dailyChangePercent: -5.0, price: 98.78 },
    { assetId: 'gold', name: 'Gold', dailyChangePercent: 10.0, price: 2120.62 },
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
