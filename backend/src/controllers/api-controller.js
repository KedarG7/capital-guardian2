import { demoPortfolio } from '../models/portfolio.js'
import {
  getPortfolioData,
  optimizePortfolioData,
  assessPortfolioData,
  simulatePortfolioData,
  evaluateControlData,
  analyzePortfolioData,
  getDemoScenarios,
} from '../services/capital-guardian-service.js'
import { ApiError } from '../middleware/error-handler.js'
import { isDatabaseConfigured } from '../config/database.js'
import {
  savePortfolioRecord,
  findLatestPortfolioRecord,
  toPortfolioConfiguration,
  saveAnalysisRecord,
  listAnalysisHistory,
  saveScenarioResultRecord,
  listScenarioHistory,
  saveControlDecisionRecord,
  listControlHistory,
} from '../services/database/persistence.js'
import { generateExplanation } from '../services/explainability/explainability-service.js'

function requireBody(request) {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'A JSON request body is required.')
  }

  return request.body
}

function getPortfolio(body) {
  const portfolio = body.portfolio ?? body
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) {
    throw new ApiError(400, 'INVALID_PORTFOLIO', 'A portfolio object is required.')
  }

  return portfolio
}

function runEngine(operation) {
  try {
    return operation()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(422, 'INVALID_DOMAIN_INPUT', error.message)
  }
}

async function runDatabase(operation) {
  if (!isDatabaseConfigured()) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'MongoDB is not configured.')
  }

  try {
    return await operation()
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      throw new ApiError(422, 'INVALID_PERSISTENCE_INPUT', 'The persistence request is invalid.')
    }

    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'MongoDB is unavailable.')
  }
}

export async function getPortfolioController(request, response) {
  const stored = isDatabaseConfigured()
    ? await runDatabase(() => findLatestPortfolioRecord(request.user.id))
    : null
  const portfolio = toPortfolioConfiguration(stored) || demoPortfolio
  response.json({ 
    success: true, 
    data: {
      ...runEngine(() => getPortfolioData(portfolio)),
      isConfigured: !!stored
    } 
  })
}

export async function savePortfolioController(request, response) {
  const body = requireBody(request)
  let portfolio = getPortfolio(body)

  // Support partial updates (e.g., just { totalCapital: 1000000 }) by merging with existing/demo portfolio
  if (!portfolio.allocations || typeof portfolio.allocations !== 'object') {
    const stored = isDatabaseConfigured() ? await runDatabase(() => findLatestPortfolioRecord(request.user.id)) : null
    const existing = toPortfolioConfiguration(stored) || demoPortfolio
    portfolio = { ...existing, ...portfolio }
  }

  const saved = await runDatabase(() => savePortfolioRecord(portfolio, request.user.id))
  
  response.status(201).json({ 
    success: true, 
    data: {
      ...runEngine(() => getPortfolioData(toPortfolioConfiguration(saved))),
      isConfigured: true
    }
  })
}

export async function saveAnalysisController(request, response) {
  const body = requireBody(request)
  response.status(201).json({ success: true, data: await runDatabase(() => saveAnalysisRecord(body, request.user.id)) })
}

export async function analysisHistoryController(request, response) {
  response.json({ success: true, data: await runDatabase(() => listAnalysisHistory(request.user.id)) })
}

export async function saveScenarioResultController(request, response) {
  const body = requireBody(request)
  response.status(201).json({ success: true, data: await runDatabase(() => saveScenarioResultRecord(body, request.user.id)) })
}

import { getMarketSnapshot, getPreviousMarketSnapshot } from '../market-data/marketDataService.js'
import { detectMarketChanges } from '../market-data/marketChangeDetector.js'
import { generateMarketResponse } from '../control-engine/marketResponseService.js'

export async function getMarketDataController(request, response) {
  try {
    const marketData = await getMarketSnapshot()
    response.json({ success: true, data: marketData })
  } catch (error) {
    throw new ApiError(500, 'MARKET_DATA_ERROR', 'Failed to retrieve market data.')
  }
}

export async function getMarketResponseController(request, response) {
  try {
    // 1. Get current market snapshot
    const currentMarket = await getMarketSnapshot()
    // 2. Get previous market snapshot
    const prevMarket = await getPreviousMarketSnapshot()
    
    // 3. Detect changes
    const detection = detectMarketChanges(prevMarket, currentMarket)
    
    // 4. Evaluate portfolio
    const stored = isDatabaseConfigured()
      ? await runDatabase(() => findLatestPortfolioRecord(request.user.id))
      : null
    const portfolio = toPortfolioConfiguration(stored) || demoPortfolio
    
    // 5-9. Run Risk, Determine response, Generate recommendation
    const marketResponse = generateMarketResponse(portfolio, detection.status, detection.changes, detection.events)

    response.json({ success: true, data: { ...marketResponse, market: currentMarket } })
  } catch (error) {
    throw new ApiError(500, 'MARKET_RESPONSE_ERROR', 'Failed to evaluate market response.')
  }
}

export async function scenarioHistoryController(request, response) {
  response.json({ success: true, data: await runDatabase(() => listScenarioHistory(request.user.id)) })
}

export async function saveControlDecisionController(request, response) {
  const body = requireBody(request)
  response.status(201).json({ success: true, data: await runDatabase(() => saveControlDecisionRecord(body, request.user.id)) })
}

export async function controlHistoryController(request, response) {
  response.json({ success: true, data: await runDatabase(() => listControlHistory(request.user.id)) })
}

export function optimizeController(request, response) {
  const body = requireBody(request)
  response.json({ success: true, data: runEngine(() => optimizePortfolioData(getPortfolio(body))) })
}

export function riskController(request, response) {
  const body = requireBody(request)
  response.json({ success: true, data: runEngine(() => assessPortfolioData(getPortfolio(body))) })
}

export function simulateController(request, response) {
  const body = requireBody(request)
  if (!body.scenario) {
    throw new ApiError(400, 'INVALID_SCENARIO', 'A market shock scenario is required.')
  }

  response.json({
    success: true,
    data: runEngine(() => simulatePortfolioData(body.portfolio ?? demoPortfolio, body.scenario)),
  })
}

export function controlController(request, response) {
  const body = requireBody(request)
  response.json({
    success: true,
    data: runEngine(() => evaluateControlData(
      getPortfolio(body),
      body.riskAssessment,
      body.shockedPortfolio,
    )),
  })
}

export function analyzeController(request, response) {
  const body = requireBody(request)
  response.json({ success: true, data: runEngine(() => analyzePortfolioData(getPortfolio(body))) })
}

export function scenariosController(_request, response) {
  response.json({ success: true, data: runEngine(() => getDemoScenarios()) })
}

export function explainController(request, response) {
  const body = requireBody(request)
  response.json({ success: true, data: generateExplanation(body.result ?? body.analysis ?? body) })
}
