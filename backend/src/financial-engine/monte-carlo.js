import { calculatePortfolioMetrics } from './portfolio-calculation.js'

function seededRandom(seed) {
  let state = seed >>> 0
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
}
function normal(random) {
  const u = Math.max(random(), Number.EPSILON); const v = Math.max(random(), Number.EPSILON)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
// A reproducible one-year log-normal simulation; it supports comparison, not trade execution.
export function runMonteCarlo(portfolio, assets, iterations = 5000) {
  const metrics = calculatePortfolioMetrics(portfolio, assets)
  const random = seededRandom(Math.round(portfolio.totalCapital) + Math.round(metrics.expectedReturn * 1e7))
  const values = []; let losses = 0
  for (let index = 0; index < iterations; index += 1) {
    const annualReturn = metrics.expectedReturn + metrics.volatility * normal(random)
    const value = portfolio.totalCapital * Math.exp(annualReturn - (metrics.volatility ** 2) / 2)
    values.push(value); if (value < portfolio.totalCapital) losses += 1
  }
  values.sort((a, b) => a - b)
  const at = (p) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))]
  return { method: 'Monte Carlo / log-normal annual return model', iterations, seed: 'portfolio-derived', expectedEndValue: values.reduce((sum, value) => sum + value, 0) / values.length, downsideValueAtRisk95: portfolio.totalCapital - at(0.05), percentile5: at(0.05), percentile50: at(0.5), percentile95: at(0.95), probabilityOfLoss: losses / iterations }
}
