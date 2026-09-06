import mongoose from 'mongoose'

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ['register', 'login'], required: true },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
}, { timestamps: true })

emailOtpSchema.index({ email: 1, purpose: 1 })
export const EmailOtp = mongoose.models.EmailOtp || mongoose.model('EmailOtp', emailOtpSchema)
