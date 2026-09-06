import mongoose from 'mongoose'

const affectedAssetSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  assetName: { type: String, required: true },
  previousValue: { type: Number, required: true },
  currentValue: { type: Number, required: true },
  changePercent: { type: Number, required: true },
  severity: { type: String, required: true },
  direction: { type: String, required: true }
}, { _id: false })

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  eventId: { type: String, required: true, index: true }, // For deduplication
  type: { type: String, required: true }, // 'RISK_BREACH', 'LIQUIDITY_BREACH'
  severity: { type: String, required: true }, // 'HIGH', 'CRITICAL'
  title: { type: String, required: true },
  message: { type: String, required: true },
  marketEvent: {
    severity: String,
    direction: String,
    affectedAssets: [affectedAssetSchema]
  },
  portfolioImpact: {
    riskBefore: String, // E.g., 'LOW' (Optional, could just store the new one)
    riskAfter: String,  // 'HIGH'
    gainLoss: Number,
    gainLossPercent: Number
  },
  riskAssessment: {
    status: String,
    riskUtilization: Number,
    liquidityBuffer: Number
  },
  read: { type: Boolean, default: false }
}, { timestamps: true })

// Compound index to quickly find user's alerts and prevent duplicate events
alertSchema.index({ userId: 1, eventId: 1 }, { unique: true })
alertSchema.index({ userId: 1, createdAt: -1 })

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema)
