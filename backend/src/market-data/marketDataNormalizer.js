export function normalizeMarketData(currentRaw, previousRaw, source, isLive) {
  const prevMap = new Map()
  if (Array.isArray(previousRaw)) {
    previousRaw.forEach(p => prevMap.set(p.assetId, p.price ?? p.marketValue))
  } else if (previousRaw && previousRaw.assets) {
    previousRaw.assets.forEach(p => prevMap.set(p.assetId, p.marketValue))
  }

  return {
    mode: isLive ? 'live' : 'demo',
    source,
    timestamp: new Date().toISOString(),
    isLive,
    assets: currentRaw.map(asset => {
      const currentValue = asset.price ?? asset.marketValue
      const previousValue = prevMap.get(asset.assetId) ?? 0
      let changePercent = 0
      if (previousValue > 0 && currentValue != null) {
        changePercent = ((currentValue - previousValue) / previousValue) * 100
      } else if (!isLive && asset.dailyChangePercent !== undefined) {
        changePercent = asset.dailyChangePercent // Fallback if no prev available (only for demo)
      } else if (isLive && asset.dailyChangePercent !== undefined) {
        // We still pass daily change for display purposes, but observed change is 0 on first load
        changePercent = 0 
      }

      return {
        assetId: asset.assetId,
        assetName: asset.name,
        currentValue: currentValue,
        previousValue: previousValue,
        changePercent: changePercent,
        dailyChangePercent: asset.dailyChangePercent || 0,
        name: asset.name || asset.assetId,
        marketValue: currentValue,
      }
    })
  }
}
