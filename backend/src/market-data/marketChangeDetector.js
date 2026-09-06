export const marketChangeThresholds = {
  stable: 2,
  notice: 5,
  significant: 10,
}

export function detectMarketChanges(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) {
    return { detected: false, severity: 'STABLE', direction: 'STABLE', status: 'INSUFFICIENT_HISTORY', changes: [], events: [], affectedAssets: [] }
  }

  // The normalizer already provides changePercent directly on currentSnapshot in Step 1.
  // We can just rely on that if available, otherwise compute it.
  
  const changes = currentSnapshot.assets.map(current => {
    let changePercent = current.changePercent
    if (changePercent === undefined) {
      const prevAssets = Object.fromEntries(previousSnapshot.assets.map(a => [a.assetId, a]))
      const prev = prevAssets[current.assetId]
      if (!prev || !prev.marketValue) {
        changePercent = 0
      } else {
        changePercent = ((current.marketValue - prev.marketValue) / prev.marketValue) * 100
      }
    }
    
    // Safety against NaN / Infinity
    if (!Number.isFinite(changePercent)) changePercent = 0

    const absChange = Math.abs(changePercent)
    let severity = 'STABLE'
    if (absChange >= marketChangeThresholds.significant) severity = 'EXTREME'
    else if (absChange >= marketChangeThresholds.notice) severity = 'SIGNIFICANT'
    else if (absChange >= marketChangeThresholds.stable) severity = 'NOTICE'

    let direction = 'STABLE'
    if (changePercent > 0) direction = 'UP'
    if (changePercent < 0) direction = 'DOWN'

    return {
      assetId: current.assetId,
      assetName: current.name || current.assetName,
      previousValue: current.previousValue ?? 0,
      currentValue: current.currentValue ?? current.marketValue ?? 0,
      changePercent,
      severity,
      direction,
      name: current.name || current.assetName // backwards compat
    }
  })

  const affectedAssets = changes.filter(c => Math.abs(c.changePercent) >= marketChangeThresholds.stable)
  
  let overallSeverity = 'STABLE'
  if (affectedAssets.some(a => a.severity === 'EXTREME')) overallSeverity = 'EXTREME'
  else if (affectedAssets.some(a => a.severity === 'SIGNIFICANT')) overallSeverity = 'SIGNIFICANT'
  else if (affectedAssets.some(a => a.severity === 'NOTICE')) overallSeverity = 'NOTICE'

  const hasUp = affectedAssets.some(a => a.direction === 'UP')
  const hasDown = affectedAssets.some(a => a.direction === 'DOWN')
  let overallDirection = 'STABLE'
  if (hasUp && hasDown) overallDirection = 'MIXED'
  else if (hasUp) overallDirection = 'UP'
  else if (hasDown) overallDirection = 'DOWN'

  const events = detectEvents(changes)
  
  const status = overallSeverity === 'EXTREME' ? 'EXTREME_CHANGE' 
    : overallSeverity === 'SIGNIFICANT' ? 'SIGNIFICANT_CHANGE' 
    : overallSeverity === 'NOTICE' ? 'NOTICE_CHANGE' 
    : 'STABLE'

  return { 
    detected: affectedAssets.length > 0,
    severity: overallSeverity,
    direction: overallDirection,
    timestamp: currentSnapshot.timestamp || new Date().toISOString(),
    affectedAssets,
    summary: affectedAssets.length > 0 ? 'Significant market movement detected.' : 'Market conditions are stable.',
    // Backwards compatibility fields
    status, 
    changes, 
    events 
  }
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
