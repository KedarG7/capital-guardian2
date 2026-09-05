import mongoose from 'mongoose'

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' },
  analysisType: { type: String, required: true, trim: true },
  expectedReturn: { type: Number },
  volatility: { type: Number },
  liquidity: { type: Number },
  riskStatus: { type: String },
  riskUtilization: { type: Number },
  liquidityBuffer: { type: Number },
  allocation: { type: Map, of: Number },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

analysisSchema.index({ createdAt: -1 })

export const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema)
