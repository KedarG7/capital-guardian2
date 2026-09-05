import mongoose from 'mongoose'

const scenarioResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  scenarioName: { type: String, required: true, trim: true },
  originalPortfolioValue: { type: Number, required: true },
  shockedPortfolioValue: { type: Number, required: true },
  gainLoss: { type: Number, required: true },
  gainLossPercentage: { type: Number, required: true },
  shockedAllocation: { type: Map, of: Number },
  shockedReturn: { type: Number, required: true },
  shockedVolatility: { type: Number, required: true },
  shockedLiquidity: { type: Number, required: true },
  riskStatus: { type: String, required: true },
  breaches: { type: [mongoose.Schema.Types.Mixed], default: [] },
  assetImpacts: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true })

scenarioResultSchema.index({ createdAt: -1 })

export const ScenarioResult = mongoose.models.ScenarioResult || mongoose.model('ScenarioResult', scenarioResultSchema)
