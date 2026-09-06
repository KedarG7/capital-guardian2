import { marketDataConfig } from './marketDataConfig.js'
import { fetchLiveMarketData, fetchDemoMarketData } from './marketDataProvider.js'
import { normalizeMarketData } from './marketDataNormalizer.js'

let lastLiveRaw = null

export async function getMarketSnapshot() {
  let currentRaw = null
  let previousRaw = null
  let mode = 'demo'
  let source = 'demo-provider'
  let isLive = false

  try {
    if (marketDataConfig.useLive) {
      const liveData = await fetchLiveMarketData()
      currentRaw = liveData
      previousRaw = lastLiveRaw 
      lastLiveRaw = currentRaw
      mode = 'live'
      source = marketDataConfig.provider || 'yahoo-finance'
      isLive = true
    }
  } catch (error) {
    console.warn(`[Market Data] Live fetch failed: ${error.message}. Falling back to DEMO mode.`)
  }

  if (!currentRaw) {
    currentRaw = fetchDemoMarketData()
    previousRaw = await import('./marketDataProvider.js').then(m => m.fetchPreviousDemoMarketData())
    mode = 'demo'
    source = 'demo-provider'
    isLive = false
  }

  return normalizeMarketData(currentRaw, previousRaw, source, isLive)
}

export async function getPreviousMarketSnapshot(currentMode = null) {
  // If currentMode is demo (e.g. fallback), return demo history
  if ((marketDataConfig.mode === 'live' && currentMode !== 'demo') || currentMode === 'live') {
    return null // Simulated missing history for live data unless implemented
  }

  const prevData = await import('./marketDataProvider.js').then(m => m.fetchPreviousDemoMarketData())
  return normalizeMarketData(prevData, null, 'demo-provider', false)
}
