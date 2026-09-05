export const marketDataConfig = {
  provider: process.env.MARKET_DATA_PROVIDER || 'demo',
  apiKey: process.env.MARKET_DATA_API_KEY || '',
  mode: process.env.MARKET_DATA_MODE || 'demo',
}
