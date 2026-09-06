import mongoose from 'mongoose'

const assetSnapshotSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  label: { type: String },
  ticker: { type: String },
  expectedReturn: { type: Number, required: true },
  volatility: { type: Number, required: true },
  liquidityScore: { type: Number, required: true },
  minimumAllocation: { type: Number, required: true },
  maximumAllocation: { type: Number, required: true },
}, { _id: false })

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  totalCapital: { type: Number, required: true, min: 0 },
  maximumRisk: { type: Number, required: true, min: 0 },
  minimumLiquidity: { type: Number, required: true, min: 0 },
  targetReturn: { type: Number },
  allocations: { type: Map, of: Number, required: true },
  assets: { type: [assetSnapshotSchema], default: [] },
}, { timestamps: true })

portfolioSchema.index({ updatedAt: -1 })

export const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema)
