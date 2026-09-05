export const marketChangeThresholds = {
  stable: 2,
  notice: 5,
  significant: 10,
}

export function detectMarketChanges(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return { status: 'INSUFFICIENT_HISTORY', changes: [], events: [] }
  }

  const prevAssets = Object.fromEntries(previousSnapshot.assets.map(a => [a.assetId, a]))
  
  const changes = currentSnapshot.assets.map(current => {
    const prev = prevAssets[current.assetId]
    if (!prev || !prev.marketValue) {
      return { assetId: current.assetId, name: current.name, changePercent: 0, severity: 'STABLE' }
    }

    const changePercent = ((current.marketValue - prev.marketValue) / prev.marketValue) * 100
    const absChange = Math.abs(changePercent)
    
    let severity = 'STABLE'
    if (absChange >= marketChangeThresholds.significant) severity = 'EXTREME'
    else if (absChange >= marketChangeThresholds.notice) severity = 'SIGNIFICANT'
    else if (absChange >= marketChangeThresholds.stable) severity = 'NOTICE'

    return {
      assetId: current.assetId,
      name: current.name,
      changePercent,
      severity
    }
  })

  const events = detectEvents(changes)
  
  // Aggregate status based on worst severity or highest change
  const isExtreme = changes.some(c => c.severity === 'EXTREME')
  const isSignificant = changes.some(c => c.severity === 'SIGNIFICANT')
  const isNotice = changes.some(c => c.severity === 'NOTICE')
  
  const status = isExtreme ? 'EXTREME_CHANGE' 
    : isSignificant ? 'SIGNIFICANT_CHANGE' 
    : isNotice ? 'NOTICE_CHANGE' 
    : 'STABLE'

  return { status, changes, events }
}

function detectEvents(changes) {
  const events = []
  
  const stocks = changes.find(c => c.assetId === 'stocks')
  const gold = changes.find(c => c.assetId === 'gold')
  const bonds = changes.find(c => c.assetId === 'bonds')

  if (stocks && stocks.changePercent <= -marketChangeThresholds.notice) {
    events.push({ type: 'STOCK_DOWNTURN', asset: 'Stocks', changePercent: stocks.changePercent, severity: stocks.severity })
  }
  
  if (gold && gold.changePercent >= marketChangeThresholds.notice) {
    events.push({ type: 'GOLD_SURGE', asset: 'Gold', changePercent: gold.changePercent, severity: gold.severity })
  }
  
  if (bonds && bonds.changePercent <= -marketChangeThresholds.notice) {
    events.push({ type: 'BOND_STRESS', asset: 'Bonds', changePercent: bonds.changePercent, severity: bonds.severity })
  }

  const downAssets = changes.filter(c => c.changePercent <= -marketChangeThresholds.stable)
  if (downAssets.length >= 2) {
    events.push({ type: 'BROAD_MARKET_DOWNTURN', changePercent: downAssets[0].changePercent, severity: 'SIGNIFICANT' })
  }

  const upAssets = changes.filter(c => c.changePercent >= marketChangeThresholds.stable)
  if (downAssets.length >= 1 && upAssets.length >= 1) {
    events.push({ type: 'MIXED_MARKET', severity: 'NOTICE' })
  }

  return events
}
