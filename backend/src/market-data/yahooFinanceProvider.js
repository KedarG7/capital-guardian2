import yahooFinance from 'yahoo-finance2'

export async function fetchRealMarketData(symbols) {
  try {
    const results = []
    for (const symbol of symbols) {
      try {
        const quote = await yahooFinance.quote(symbol)
        if (quote && quote.regularMarketPrice !== undefined && !isNaN(quote.regularMarketPrice)) {
          results.push({
            assetId: quote.symbol,
            name: quote.shortName || quote.longName || quote.symbol,
            price: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            dailyChangePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            timestamp: quote.regularMarketTime ? quote.regularMarketTime.toISOString() : new Date().toISOString(),
            source: 'Yahoo Finance',
            mode: 'LIVE'
          })
        }
      } catch (e) {
        console.error(`Failed to fetch quote for ${symbol}:`, e.message)
      }
    }
    return results
  } catch (error) {
    console.error('Yahoo Finance provider failed:', error.message)
    throw new Error('MARKET_DATA_UNAVAILABLE')
  }
}
