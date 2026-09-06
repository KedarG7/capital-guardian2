const defaultTickers = { stocks: '^NSEI', equity: '^NSEI', bonds: 'INDA', gold: 'GC=F', cash: 'INR=X' }

function annualizedStats(closes) {
  const returns = closes.slice(1).map((value, index) => Math.log(value / closes[index])).filter(Number.isFinite)
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1)
  return { annualReturn: Math.exp(mean * 252) - 1, annualVolatility: Math.sqrt(variance * 252) }
}

export async function getMarketIntelligence(portfolio = {}) {
  const assets = portfolio.assets || Object.keys(portfolio.allocations || defaultTickers).map((assetId) => ({ assetId }))
  const results = await Promise.all(assets.map(async (asset) => {
    const ticker = asset.ticker || defaultTickers[asset.assetId.toLowerCase()] || null
    if (!ticker) return { assetId: asset.assetId, status: 'manual', message: 'No market ticker configured; using your planning assumptions.' }
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`, { signal: AbortSignal.timeout(4500), headers: { 'User-Agent': 'CapitalGuardian/1.0' } })
      if (!response.ok) throw new Error('quote provider unavailable')
      const quote = (await response.json()).chart?.result?.[0]
      const closes = (quote?.indicators?.quote?.[0]?.close || []).filter(Number.isFinite)
      if (closes.length < 20) throw new Error('insufficient quote history')
      const stats = annualizedStats(closes)
      return { assetId: asset.assetId, ticker, status: 'live', asOf: new Date((quote.meta?.regularMarketTime || Date.now() / 1000) * 1000).toISOString(), lastPrice: closes.at(-1), ...stats }
    } catch { return { assetId: asset.assetId, ticker, status: 'fallback', message: 'Live quote unavailable; analysis uses saved planning assumptions.' } }
  }))
  return { source: 'Yahoo Finance daily market data', generatedAt: new Date().toISOString(), assets: results }
}
