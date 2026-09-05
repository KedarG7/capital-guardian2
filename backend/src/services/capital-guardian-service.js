import { assetConfiguration } from '../config/asset-config.js'
import { demoPortfolio } from '../models/portfolio.js'
import { calculatePortfolioMetrics } from '../financial-engine/portfolio-calculation.js'
import { optimizePortfolio } from '../financial-engine/portfolio-optimization.js'
import { assessPortfolioRisk } from '../financial-engine/risk-assessment.js'
import { simulateMarketShock, demoShockScenarios } from '../shock-engine/market-shock.js'
import { evaluateControl } from '../control-engine/control-rebalancing.js'

export function getPortfolioData(portfolio = demoPortfolio) {
  const metrics = calculatePortfolioMetrics(portfolio, assetConfiguration)
  const risk = assessPortfolioRisk(portfolio, assetConfiguration, metrics)

  return {
    configuration: portfolio,
    metrics,
    risk,
  }
}

export function optimizePortfolioData(portfolio) {
  return optimizePortfolio(portfolio, assetConfiguration)
}

export function assessPortfolioData(portfolio) {
  const metrics = calculatePortfolioMetrics(portfolio, assetConfiguration)
  return assessPortfolioRisk(portfolio, assetConfiguration, metrics)
}

export function simulatePortfolioData(portfolio, scenario) {
  return simulateMarketShock(portfolio, scenario, assetConfiguration)
}

export function evaluateControlData(portfolio, riskAssessment, shockedPortfolio) {
  return evaluateControl(portfolio, riskAssessment, assetConfiguration, shockedPortfolio)
}

export function analyzePortfolioData(portfolio) {
  const metrics = calculatePortfolioMetrics(portfolio, assetConfiguration)
  const optimization = optimizePortfolio(portfolio, assetConfiguration)
  const risk = assessPortfolioRisk(portfolio, assetConfiguration, metrics)
  const control = evaluateControl(portfolio, risk, assetConfiguration)

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
