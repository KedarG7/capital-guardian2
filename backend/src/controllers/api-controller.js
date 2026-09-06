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
  saveAlertRecord,
  listAlerts,
  markAlertRead,
  saveDecisionHistoryRecord,
  updateDecisionExplanation,
  listDecisionHistory,
  getDecisionHistory
} from '../services/database/persistence.js'
import { generateExplanation } from '../services/explainability/explainability-service.js'
import { explainDecision } from '../services/ai/aiExplanationService.js'

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
      console.error('Persistence error:', error)
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
    const prevMarket = await getPreviousMarketSnapshot(currentMarket.mode)
    
    // 3. Detect changes
    const detection = detectMarketChanges(prevMarket, currentMarket)
    
    // 4. Evaluate portfolio
    const stored = isDatabaseConfigured()
      ? await runDatabase(() => findLatestPortfolioRecord(request.user.id))
      : null
    const portfolio = toPortfolioConfiguration(stored) || demoPortfolio
    
    const marketResponse = generateMarketResponse(portfolio, detection.status, detection.changes, detection.events)

    let createdAlert = null
    // Automatically create alerts for significant risk/liquidity events if DB is configured
    if (isDatabaseConfigured() && request.user?.id) {
      const { risk } = marketResponse
      if (['HIGH', 'CRITICAL'].includes(risk.status) || (risk.liquidityBuffer !== undefined && risk.liquidityBuffer < 0)) {
        // Create deterministic event ID for deduplication
        const eventId = `market-event-${new Date().toISOString().split('T')[0]}-${risk.status}`
        
        const isLiquidity = risk.liquidityBuffer !== undefined && risk.liquidityBuffer < 0
        const type = isLiquidity ? 'LIQUIDITY_BREACH' : 'RISK_BREACH'
        const title = isLiquidity ? 'Liquidity Breach Detected' : 'Portfolio Risk Increased'
        
        let message = ''
        if (risk.status === 'CRITICAL') {
          message = 'Critical portfolio risk detected. Market conditions have caused your portfolio risk to exceed the configured threshold. Immediate review is recommended.'
        } else {
          message = `Capital Guardian detected a significant market movement. Your portfolio risk status is now ${risk.status}.`
        }

        const alertData = {
          eventId,
          type,
          severity: risk.status, // e.g. 'HIGH', 'CRITICAL'
          title,
          message,
          marketEvent: {
            severity: detection.severity,
            direction: detection.direction,
            affectedAssets: detection.affectedAssets
          },
          portfolioImpact: {
            riskAfter: risk.status
          },
          riskAssessment: {
            status: risk.status,
            riskUtilization: risk.riskUtilization,
            liquidityBuffer: risk.liquidityBuffer
          }
        }
        
        createdAlert = await runDatabase(() => saveAlertRecord(alertData, request.user.id))
      }
      // Also save decision history if it's a meaningful event
      if (detection.detected || ['HIGH', 'CRITICAL'].includes(risk.status) || marketResponse.recommendation?.action !== 'NO_RECOMMENDATION') {
        const decisionEventId = `decision-${new Date().toISOString().split('T')[0]}-${detection.status}-${risk.status}`
        marketResponse.decisionEventId = decisionEventId
        const decisionData = {
          eventId: decisionEventId,
          mode: currentMarket.isLive ? 'LIVE' : 'DEMO',
          marketEvent: {
            type: detection.detected ? 'OBSERVED_MARKET_EVENT' : 'PERIODIC_CHECK',
            severity: detection.severity,
            direction: detection.direction,
            affectedAssets: detection.affectedAssets
          },
          portfolioSnapshot: {
            totalCapital: portfolio.totalCapital,
            portfolioValue: marketResponse.recommendationData?.current?.portfolioValue || portfolio.totalCapital,
            allocation: portfolio.allocations
          },
          riskAssessment: {
            status: risk.status,
            riskBefore: marketResponse.controlDecision?.before?.volatility,
            riskAfter: risk.portfolioVolatility,
            liquidityBefore: marketResponse.controlDecision?.before?.liquidity,
            liquidityAfter: risk.liquidityScore
          },
          recommendation: {
            state: marketResponse.recommendation?.action || 'NO_RECOMMENDATION',
            currentAllocation: marketResponse.recommendationData?.current?.allocation,
            recommendedAllocation: marketResponse.recommendationData?.recommended?.allocation,
            changes: marketResponse.recommendationData?.changes
          }
        }
        await runDatabase(() => saveDecisionHistoryRecord(decisionData, request.user.id))
      }
    }

    response.json({ 
      success: true, 
      data: { 
        ...marketResponse, 
        market: currentMarket,
        detection: {
          detected: detection.detected,
          severity: detection.severity,
          direction: detection.direction,
          timestamp: detection.timestamp,
          affectedAssets: detection.affectedAssets,
          summary: detection.summary
        }
      } 
    })
  } catch (error) {
    console.error('Market response evaluation error:', error)
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
  if (!isDatabaseConfigured()) {
    return response.json({ success: true, data: [] })
  }

  const history = await runDatabase(() => listControlHistory(request.user.id))
  response.json({ success: true, data: history })
}

export async function getAlertsController(request, response) {
  if (!isDatabaseConfigured()) {
    return response.json({ success: true, data: [] })
  }
  const alerts = await runDatabase(() => listAlerts(request.user.id))
  response.json({ success: true, data: alerts })
}

export async function markAlertReadController(request, response) {
  if (!isDatabaseConfigured()) {
    return response.json({ success: false, error: 'Database not configured' })
  }
  const alertId = request.params.id
  response.json({ success: true, data: await runDatabase(() => markAlertRead(alertId, request.user.id)) })
}

export async function listDecisionHistoryController(request, response) {
  if (!isDatabaseConfigured()) {
    return response.json({ success: true, data: { decisions: [], pagination: { total: 0 } } })
  }
  
  const page = parseInt(request.query.page) || 1
  const limit = Math.min(parseInt(request.query.limit) || 50, 50)
  const filters = {
    riskStatus: request.query.riskStatus,
    mode: request.query.mode,
  }
  
  response.json({ 
    success: true, 
    data: await runDatabase(() => listDecisionHistory(request.user.id, { page, limit, filters })) 
  })
}

export async function getDecisionHistoryController(request, response) {
  if (!isDatabaseConfigured()) {
    return response.json({ success: false, error: 'Database not configured' })
  }
  const decision = await runDatabase(() => getDecisionHistory(request.params.id, request.user.id))
  if (!decision) {
    throw new ApiError(404, 'DECISION_NOT_FOUND', 'Decision not found')
  }
  response.json({ success: true, data: decision })
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

export async function controlController(request, response) {
  const body = requireBody(request)
  const portfolio = getPortfolio(body)
  const result = runEngine(() => evaluateControlData(portfolio, body.riskAssessment, body.shockedPortfolio))
  
  if (isDatabaseConfigured()) {
    const decisionEventId = `control-${new Date().toISOString().split('T')[0]}-${Date.now()}`
    result.decisionEventId = decisionEventId
    
    await runDatabase(() => saveDecisionHistoryRecord({
      eventId: decisionEventId,
      mode: 'HYPOTHETICAL',
      portfolioSnapshot: {
        totalCapital: portfolio.totalCapital,
        portfolioValue: portfolio.totalCapital,
        allocation: portfolio.allocations
      },
      riskAssessment: {
        status: body.riskAssessment?.status || 'LOW',
        riskBefore: body.riskAssessment?.portfolioVolatility,
        riskAfter: result.recommended?.volatility,
        liquidityBefore: body.riskAssessment?.liquidityScore,
        liquidityAfter: result.recommended?.liquidity
      },
      recommendation: {
        state: result.controlAction || 'NO_RECOMMENDATION',
        currentAllocation: result.before?.allocation,
        recommendedAllocation: result.recommended?.allocation,
        changes: result.changes
      }
    }, request.user.id))
  }
  
  response.json({ success: true, data: result })
}

export function analyzeController(request, response) {
  const body = requireBody(request)
  response.json({ success: true, data: runEngine(() => analyzePortfolioData(getPortfolio(body))) })
}

export function scenariosController(_request, response) {
  response.json({ success: true, data: runEngine(() => getDemoScenarios()) })
}

import { optimizePortfolio } from '../financial-engine/portfolio-optimization.js'
import { simulateMarketShock } from '../shock-engine/market-shock.js'

export async function explainController(request, response) {
  const body = requireBody(request)
  let payload = body
  
  // Re-verify the input on the backend to guarantee User isolation and prevent prompt manipulation
  if (body.type) {
    const stored = isDatabaseConfigured() ? await runDatabase(() => findLatestPortfolioRecord(request.user.id)) : null
    const portfolio = toPortfolioConfiguration(stored) || demoPortfolio
    
    if (body.type === 'MARKET_GUARDIAN') {
      const currentMarket = await getMarketSnapshot()
      const prevMarket = await getPreviousMarketSnapshot()
      const detection = detectMarketChanges(prevMarket, currentMarket)
      payload = generateMarketResponse(portfolio, detection.status, detection.changes, detection.events)
    } else if (body.type === 'OPTIMIZATION') {
      payload = optimizePortfolio(portfolio)
    } else if (body.type === 'WHAT_IF') {
      payload = simulateMarketShock(portfolio, body.scenario)
    } else if (body.type === 'CONTROL') {
      const shocked = simulateMarketShock(portfolio, body.scenario)
      payload = evaluateControlData(portfolio, shocked.riskAssessment, shocked.shockedPortfolio)
    } else if (body.type === 'ANALYSIS') {
      payload = analyzePortfolioData(portfolio)
    }
  }

  const result = await explainDecision(payload)
  
  if (body.eventId && isDatabaseConfigured()) {
    const explanationData = {
      type: result.source === 'AI' ? 'AI_EXPLANATION' : 'DETERMINISTIC_FALLBACK',
      ...result.explanation
    }
    await runDatabase(() => updateDecisionExplanation(body.eventId, request.user.id, explanationData))
  }
  
  // Return in standard API format so frontend api.js unwraps `.data`
  response.json({ 
    success: true, 
    data: {
      ...result.explanation,
      dataMode: result.source === 'AI' ? 'AI_EXPLANATION' : 'DETERMINISTIC_FALLBACK'
    }
  })
}
