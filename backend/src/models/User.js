import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: false },
  googleSubject: { type: String, unique: true, sparse: true },
}, { timestamps: true })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
