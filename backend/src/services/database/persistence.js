import mongoose from 'mongoose'
import { assetConfiguration } from '../../config/asset-config.js'
import { validatePortfolio } from '../../models/portfolio.js'
import { connectDatabase } from '../../config/database.js'
import { Portfolio } from '../../models/persistence/Portfolio.js'
import { Analysis } from '../../models/Analysis.js'
import { ScenarioResult } from '../../models/ScenarioResult.js'
import { ControlDecision } from '../../models/ControlDecision.js'

function plain(document) {
  if (!document) return null
  return document.toObject({ flattenMaps: true, versionKey: false })
}

function mapFromValue(value) {
  if (value instanceof Map) return Object.fromEntries(value)
  return value || {}
}

function portfolioAssets() {
  return Object.values(assetConfiguration).map((asset) => ({ ...asset }))
}

export function toPortfolioConfiguration(record) {
  if (!record) return null

  return {
    totalCapital: record.totalCapital,
    maximumRisk: record.maximumRisk,
    minimumLiquidity: record.minimumLiquidity,
    ...(record.targetReturn === undefined ? {} : { targetReturn: record.targetReturn }),
    allocations: mapFromValue(record.allocations),
  }
}

export async function savePortfolioRecord(portfolio, userId) {
  validatePortfolio(portfolio, assetConfiguration)
  await connectDatabase()

  const updateData = {
    totalCapital: portfolio.totalCapital,
    maximumRisk: portfolio.maximumRisk,
    minimumLiquidity: portfolio.minimumLiquidity,
    targetReturn: portfolio.targetReturn,
    allocations: portfolio.allocations,
    assets: portfolioAssets(),
  }

  // UPDATE existing or create if not exists
  const record = await Portfolio.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, upsert: true }
  )

  return plain(record)
}

export async function findLatestPortfolioRecord(userId) {
  await connectDatabase()
  return plain(await Portfolio.findOne({ userId }).sort({ updatedAt: -1 }))
}

export async function saveAnalysisRecord(payload, userId) {
  await connectDatabase()
  const result = payload.result ?? payload.analysis ?? payload
  const risk = result.risk || result.riskAssessment
  const metrics = result.metrics || result.shockedPortfolio || result.recommended
  const configuration = result.portfolio?.configuration
  const portfolioId = payload.portfolioId && mongoose.isValidObjectId(payload.portfolioId)
    ? payload.portfolioId
    : undefined

  const record = await Analysis.create({
    userId,
    portfolio: portfolioId,
    analysisType: payload.analysisType || 'full',
    expectedReturn: metrics?.expectedReturn,
    volatility: metrics?.volatility,
    liquidity: metrics?.liquidity ?? metrics?.liquidityScore,
    riskStatus: risk?.status,
    riskUtilization: risk?.risk?.riskUtilization,
    liquidityBuffer: risk?.liquidity?.liquidityBuffer,
    allocation: configuration?.allocations || result.allocation,
    result,
  })

  return plain(record)
}

export async function listAnalysisHistory(userId) {
  await connectDatabase()
  return (await Analysis.find({ userId }).sort({ createdAt: -1 }).limit(20)).map(plain)
}

export async function saveScenarioResultRecord(payload, userId) {
  await connectDatabase()
  const result = payload.result ?? payload
  const scenario = result.scenario
  const original = result.originalPortfolio
  const shocked = result.shockedPortfolio
  const record = await ScenarioResult.create({
    userId,
    scenarioName: scenario?.name,
    originalPortfolioValue: original?.totalValue,
    shockedPortfolioValue: shocked?.totalValue,
    gainLoss: shocked?.gainLoss,
    gainLossPercentage: shocked?.gainLossPercentage,
    shockedAllocation: Object.fromEntries((result.assetImpacts || []).map((asset) => [
      asset.assetId,
      asset.shockedAllocationWeight,
    ])),
    shockedReturn: shocked?.expectedReturn,
    shockedVolatility: shocked?.volatility,
    shockedLiquidity: shocked?.liquidity,
    riskStatus: result.riskAssessment?.status,
    breaches: result.riskAssessment?.breaches || [],
    assetImpacts: result.assetImpacts || [],
  })

  return plain(record)
}

export async function listScenarioHistory(userId) {
  await connectDatabase()
  return (await ScenarioResult.find({ userId }).sort({ createdAt: -1 }).limit(20)).map(plain)
}

export async function saveControlDecisionRecord(payload, userId) {
  await connectDatabase()
  const result = payload.result ?? payload
  const record = await ControlDecision.create({
    userId,
    controlAction: result.controlAction,
    actionRequired: result.controlAction !== 'NO_ACTION',
    originalAllocation: result.before?.allocation,
    recommendedAllocation: result.recommended?.allocation,
    before: result.before,
    after: result.recommended,
    riskImprovement: result.impact?.riskChange === undefined ? undefined : -result.impact.riskChange,
    liquidityImprovement: result.impact?.liquidityChange,
    returnDifference: result.impact?.returnChange,
    explanation: result.explanation,
  })

  return plain(record)
}

export async function listControlHistory(userId) {
  await connectDatabase()
  return (await ControlDecision.find({ userId }).sort({ createdAt: -1 }).limit(20)).map(plain)
}

import { Alert } from '../../models/persistence/Alert.js'

export async function saveAlertRecord(alertData, userId) {
  await connectDatabase()
  
  // Use eventId to prevent duplicates
  // We use findOneAndUpdate with upsert to insert ONLY if it doesn't exist
  // We setONInsert to preserve original data and not overwrite it if it exists
  const record = await Alert.findOneAndUpdate(
    { userId, eventId: alertData.eventId },
    { $setOnInsert: { ...alertData, userId } },
    { upsert: true, new: true }
  )
  return plain(record)
}

export async function listAlerts(userId) {
  await connectDatabase()
  return (await Alert.find({ userId }).sort({ createdAt: -1 }).limit(50)).map(plain)
}

export async function markAlertRead(alertId, userId) {
  await connectDatabase()
  const record = await Alert.findOneAndUpdate(
    { _id: alertId, userId },
    { $set: { read: true } },
    { new: true }
  )
  return plain(record)
}

import { DecisionHistory } from '../../models/DecisionHistory.js'

export async function saveDecisionHistoryRecord(decisionData, userId) {
  await connectDatabase()
  
  const record = await DecisionHistory.findOneAndUpdate(
    { userId, eventId: decisionData.eventId },
    { $setOnInsert: { ...decisionData, userId } },
    { upsert: true, new: true }
  )
  return plain(record)
}

export async function updateDecisionExplanation(eventId, userId, explanation) {
  await connectDatabase()
  const record = await DecisionHistory.findOneAndUpdate(
    { eventId, userId },
    { $set: { explanation } },
    { new: true }
  )
  return plain(record)
}

export async function listDecisionHistory(userId, { page = 1, limit = 50, filters = {} } = {}) {
  await connectDatabase()
  
  const query = { userId }
  
  if (filters.riskStatus && filters.riskStatus !== 'ALL') {
    query['riskAssessment.status'] = filters.riskStatus
  }
  if (filters.mode && filters.mode !== 'ALL') {
    query['mode'] = filters.mode
  }
  
  const skip = (page - 1) * limit
  
  const records = await DecisionHistory.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    
  const total = await DecisionHistory.countDocuments(query)
  
  return {
    decisions: records.map(plain),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

export async function getDecisionHistory(decisionId, userId) {
  await connectDatabase()
  return plain(await DecisionHistory.findOne({ _id: decisionId, userId }))
}
