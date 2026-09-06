import { assetConfiguration } from '../config/asset-config.js'
import { demoPortfolio } from '../models/portfolio.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { optimizePortfolio } from '../financial-engine/portfolio-optimization.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'
import { simulateMarketShock, demoShockScenarios } from '../shock-engine/market-shock.js'
import { evaluateControl } from '../control-engine/control-rebalancing.js'
import { runMonteCarlo } from '../financial-engine/monte-carlo.js'

export function resolveAssets(portfolio = {}) {
  if (!Array.isArray(portfolio.assets) || portfolio.assets.length === 0) return assetConfiguration
  return Object.fromEntries(portfolio.assets.map((asset) => [asset.assetId, { ...asset, minimumAllocation: asset.minimumAllocation ?? 0, maximumAllocation: asset.maximumAllocation ?? 1 }]))
}

export function getPortfolioData(portfolio = demoPortfolio) {
  const assets = resolveAssets(portfolio)
  const metrics = calculatePortfolioMetrics(portfolio, assets)
  const risk = assessPortfolioRisk(portfolio, assets, metrics)

  return {
    configuration: portfolio,
    metrics,
    risk,
  }
}

export function optimizePortfolioData(portfolio) {
  const assets = resolveAssets(portfolio)
  const optimization = optimizePortfolio(portfolio, assets)
  return { ...optimization, monteCarlo: runMonteCarlo({ ...portfolio, allocations: optimization.allocation }, assets) }
}

export function assessPortfolioData(portfolio) {
  const assets = resolveAssets(portfolio)
  const metrics = calculatePortfolioMetrics(portfolio, assets)
  return assessPortfolioRisk(portfolio, assets, metrics)
}

export function simulatePortfolioData(portfolio, scenario) {
  return simulateMarketShock(portfolio, scenario, resolveAssets(portfolio))
}

export function evaluateControlData(portfolio, riskAssessment, shockedPortfolio) {
  const assets = resolveAssets(portfolio)
  const control = evaluateControl(portfolio, riskAssessment, assets, shockedPortfolio)
  return { ...control, monteCarlo: control.recommended ? runMonteCarlo({ ...portfolio, allocations: control.recommended.allocation }, assets) : null }
}

export function analyzePortfolioData(portfolio) {
  const assets = resolveAssets(portfolio)
  const metrics = calculatePortfolioMetrics(portfolio, assets)
  const optimization = optimizePortfolioData(portfolio)
  const risk = assessPortfolioRisk(portfolio, assets, metrics)
  const control = evaluateControlData(portfolio, risk)

  return {
    portfolio: {
      configuration: portfolio,
      metrics,
    },
    optimization,
    risk,
    control,
  }
}

export function getDemoScenarios() {
  return demoShockScenarios
}
