import mongoose from 'mongoose'

const decisionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  eventId: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  mode: { type: String, required: true },
  
  marketEvent: {
    type: { type: String },
    severity: { type: String },
    direction: { type: String },
    affectedAssets: { type: mongoose.Schema.Types.Mixed },
  },

  portfolioSnapshot: {
    totalCapital: { type: Number },
    portfolioValue: { type: Number },
    allocation: { type: mongoose.Schema.Types.Mixed },
  },

  riskAssessment: {
    status: { type: String },
    riskBefore: { type: Number },
    riskAfter: { type: Number },
    liquidityBefore: { type: Number },
    liquidityAfter: { type: Number },
  },

  recommendation: {
    state: { type: String },
    currentAllocation: { type: mongoose.Schema.Types.Mixed },
    recommendedAllocation: { type: mongoose.Schema.Types.Mixed },
    changes: { type: mongoose.Schema.Types.Mixed },
  },

  explanation: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

decisionHistorySchema.index({ createdAt: -1 })
decisionHistorySchema.index({ userId: 1, eventId: 1 }, { unique: true })

export const DecisionHistory = mongoose.models.DecisionHistory || mongoose.model('DecisionHistory', decisionHistorySchema)
