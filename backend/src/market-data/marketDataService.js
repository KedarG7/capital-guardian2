import { marketDataConfig } from './marketDataConfig.js'
import { fetchLiveMarketData, fetchDemoMarketData } from './marketDataProvider.js'
import { normalizeMarketData } from './marketDataNormalizer.js'

export async function getMarketSnapshot() {
  try {
    if (marketDataConfig.mode === 'live') {
      const liveData = await fetchLiveMarketData()
      return normalizeMarketData(liveData, marketDataConfig.provider || 'external-api', true)
    }
  } catch (error) {
    // Expected to fail safely and fallback if no API key is present
    console.warn(`[Market Data] Live fetch failed: ${error.message}. Falling back to DEMO mode.`)
  }

  // Fallback / Demo
  const demoData = fetchDemoMarketData()
  return normalizeMarketData(demoData, 'demo-provider', false)
}

export async function getPreviousMarketSnapshot() {
  // In a real application, fetch from time-series DB or yesterday's close
  if (marketDataConfig.mode === 'live') {
    return null // Simulated missing history for live data unless implemented
  }

  const prevData = await import('./marketDataProvider.js').then(m => m.fetchPreviousDemoMarketData())
  return normalizeMarketData(prevData, 'demo-provider', false)
}
