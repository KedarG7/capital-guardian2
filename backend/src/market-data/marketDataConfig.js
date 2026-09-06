export const marketDataConfig = {
  provider: process.env.MARKET_DATA_PROVIDER || 'yahoo',
  apiKey: process.env.MARKET_DATA_API_KEY || '',
  mode: process.env.MARKET_DATA_MODE || 'live',
  useLive: process.env.MARKET_DATA_MODE !== 'demo'
}
