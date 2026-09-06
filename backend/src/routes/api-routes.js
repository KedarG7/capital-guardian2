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
  marketIntelligenceController,
  reportController,
} from '../controllers/api-controller.js'
import { asyncHandler } from '../middleware/async-handler.js'

const router = Router()

router.get('/portfolio', asyncHandler(getPortfolioController))
router.post('/portfolio', asyncHandler(savePortfolioController))
router.post('/optimize', optimizeController)
router.post('/risk', riskController)
router.post('/simulate', simulateController)
router.post('/control', controlController)
router.post('/analyze', analyzeController)
router.get('/scenarios', scenariosController)
router.post('/explain', explainController)
router.post('/market-intelligence', marketIntelligenceController)
router.post('/report', reportController)
router.post('/analysis', asyncHandler(saveAnalysisController))
router.get('/analysis/history', asyncHandler(analysisHistoryController))
router.post('/scenarios/results', asyncHandler(saveScenarioResultController))
router.get('/scenarios/history', asyncHandler(scenarioHistoryController))
router.post('/control/history', asyncHandler(saveControlDecisionController))
router.get('/control/history', asyncHandler(controlHistoryController))

export default router
