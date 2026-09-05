export function normalizeMarketData(rawAssets, source, isLive) {
  return {
    mode: isLive ? 'live' : 'demo',
    source,
    timestamp: new Date().toISOString(),
    isLive,
    assets: rawAssets.map(asset => ({
      assetId: asset.assetId,
      name: asset.name,
      dailyChangePercent: asset.dailyChangePercent,
      marketValue: asset.price,
    }))
  }
}
