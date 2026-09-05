import mongoose from 'mongoose'

const controlDecisionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  controlAction: { type: String, required: true },
  actionRequired: { type: Boolean, required: true },
  originalAllocation: { type: Map, of: Number, required: true },
  recommendedAllocation: { type: Map, of: Number },
  before: { type: mongoose.Schema.Types.Mixed, required: true },
  after: { type: mongoose.Schema.Types.Mixed },
  riskImprovement: { type: Number },
  liquidityImprovement: { type: Number },
  returnDifference: { type: Number },
  explanation: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

controlDecisionSchema.index({ createdAt: -1 })

export const ControlDecision = mongoose.models.ControlDecision || mongoose.model('ControlDecision', controlDecisionSchema)
