import { Router } from 'express'
import {
  getPortfolioController,
  optimizeController,
  riskController,
  simulateController,
  controlController,
  analyzeController,
  scenariosController,
  savePortfolioController,
  saveAnalysisController,
  analysisHistoryController,
  saveScenarioResultController,
  scenarioHistoryController,
  saveControlDecisionController,
  controlHistoryController,
  explainController,
  getMarketDataController,
  getMarketResponseController,
  getAlertsController,
  markAlertReadController,
  listDecisionHistoryController,
  getDecisionHistoryController
} from '../controllers/api-controller.js'
import { asyncHandler } from '../middleware/async-handler.js'

const router = Router()

router.get('/market-data', asyncHandler(getMarketDataController))
router.get('/market-response', asyncHandler(getMarketResponseController))
router.get('/alerts', asyncHandler(getAlertsController))
router.patch('/alerts/:id/read', asyncHandler(markAlertReadController))
router.get('/decision-history', asyncHandler(listDecisionHistoryController))
router.get('/decision-history/:id', asyncHandler(getDecisionHistoryController))
router.get('/portfolio', asyncHandler(getPortfolioController))
router.post('/portfolio', asyncHandler(savePortfolioController))
router.post('/optimize', asyncHandler(optimizeController))
router.post('/risk', asyncHandler(riskController))
router.post('/simulate', asyncHandler(simulateController))
router.post('/control', asyncHandler(controlController))
router.post('/analyze', asyncHandler(analyzeController))
router.get('/scenarios', asyncHandler(scenariosController))
router.post('/explain', asyncHandler(explainController))
router.post('/analysis', asyncHandler(saveAnalysisController))
router.get('/analysis/history', asyncHandler(analysisHistoryController))
router.post('/scenarios/results', asyncHandler(saveScenarioResultController))
router.get('/scenarios/history', asyncHandler(scenarioHistoryController))
router.post('/control/history', asyncHandler(saveControlDecisionController))
router.get('/control/history', asyncHandler(controlHistoryController))

export default router
