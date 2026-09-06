import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDatabase } from '../config/database.js'
import { User } from '../models/User.js'
import { EmailOtp } from '../models/EmailOtp.js'
import { sendOtpEmail } from './email-service.js'
import { OAuth2Client } from 'google-auth-library'
import crypto from 'node:crypto'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.')
  }
  return process.env.JWT_SECRET
}

function safeUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email }
}

function normalizedEmail(email) { return email.trim().toLowerCase() }

function validateCredentials({ name, email, password }, requireName = false) {
  if (requireName && (typeof name !== 'string' || name.trim().length < 2)) {
    throw new Error('Name must contain at least 2 characters.')
  }
  if (typeof email !== 'string' || !emailPattern.test(email.trim())) {
    throw new Error('A valid email is required.')
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must contain at least 8 characters.')
  }
}

function createToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, getJwtSecret(), { expiresIn: '1d' })
}

export async function registerUser(input) {
  validateCredentials(input, true)
  await connectDatabase()
  const email = normalizedEmail(input.email)
  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    const user = await User.create({ name: input.name.trim(), email, passwordHash, emailVerified: false })
    try {
      await issueOtp(email, 'register')
    } catch (error) {
      await User.deleteOne({ _id: user._id })
      throw error
    }
    return { user: safeUser(user), verificationRequired: true }
  } catch (error) {
    if (error.code === 11000) throw new Error('An account with this email already exists.')
    throw error
  }
}

export async function loginUser(input) {
  validateCredentials(input)
  await connectDatabase()
  const email = normalizedEmail(input.email)
  const user = await User.findOne({ email }).select('+passwordHash')
  const valid = user && await bcrypt.compare(input.password, user.passwordHash)
  if (!valid || !user.emailVerified) throw new Error('Invalid email or password.')

  return { user: safeUser(user), token: createToken(user) }
}

export async function requestLoginOtp(input) {
  validateCredentials(input)
  await connectDatabase()
  const email = normalizedEmail(input.email)
  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || !user.emailVerified || !(await bcrypt.compare(input.password, user.passwordHash))) throw new Error('Invalid email or password.')
  await issueOtp(email, 'login')
  return { verificationRequired: true, email }
}

export async function requestRegistrationOtp(input) {
  if (typeof input?.email !== 'string' || !emailPattern.test(input.email.trim())) {
    throw new Error('A valid email is required.')
  }
  await connectDatabase()
  const email = normalizedEmail(input.email)
  const user = await User.findOne({ email })
  if (!user) throw new Error('No account was found for this email.')
  if (user.emailVerified) throw new Error('This email is already verified. Sign in instead.')
  await issueOtp(email, 'register')
  return { verificationRequired: true, email }
}

async function issueOtp(email, purpose) {
  const recentlyIssued = await EmailOtp.findOne({ email, purpose, createdAt: { $gt: new Date(Date.now() - 60_000) } })
  if (recentlyIssued) throw new Error('Please wait one minute before requesting another code.')
  const code = crypto.randomInt(100000, 1000000).toString()
  await EmailOtp.deleteMany({ email, purpose })
  await EmailOtp.create({ email, purpose, codeHash: await bcrypt.hash(code, 12), expiresAt: new Date(Date.now() + 10 * 60_000) })
  await sendOtpEmail(email, code)
}

export async function verifyOtp({ email, code, purpose }) {
  if (!emailPattern.test(String(email || '').trim()) || !/^\d{6}$/.test(String(code || '')) || !['register', 'login'].includes(purpose)) throw new Error('Enter a valid six-digit verification code.')
  await connectDatabase()
  const normalized = normalizedEmail(email)
  const record = await EmailOtp.findOne({ email: normalized, purpose }).select('+codeHash')
  if (!record || record.expiresAt < new Date() || record.attempts >= 5) throw new Error('This code has expired. Request a new code.')
  record.attempts += 1
  const valid = await bcrypt.compare(code, record.codeHash)
  if (!valid) { await record.save(); throw new Error('That verification code is incorrect.') }
  await EmailOtp.deleteOne({ _id: record._id })
  const user = await User.findOneAndUpdate({ email: normalized }, { emailVerified: true }, { new: true })
  if (!user) throw new Error('Account not found.')
  return { user: safeUser(user), token: createToken(user) }
}

function googleClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) throw new Error('Google OAuth is not configured.')
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
}

export function createGoogleAuthorization() {
  const state = jwt.sign({ nonce: crypto.randomUUID() }, getJwtSecret(), { expiresIn: '10m' })
  const authorizationUrl = googleClient().generateAuthUrl({ access_type: 'offline', scope: ['openid', 'email', 'profile'], prompt: 'select_account', state })
  return { authorizationUrl, state }
}

export async function googleLogin({ code, state, stateCookie }) {
  if (!code || !state || !stateCookie || state !== stateCookie) throw new Error('Invalid Google OAuth state.')
  jwt.verify(state, getJwtSecret())
  const client = googleClient(); const { tokens } = await client.getToken(code)
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID })
  const profile = ticket.getPayload()
  if (!profile?.email || !profile.email_verified || !profile.sub) throw new Error('Google did not provide a verified email address.')
  await connectDatabase()
  const email = normalizedEmail(profile.email)
  let user = await User.findOne({ $or: [{ googleSubject: profile.sub }, { email }] })
  if (!user) user = await User.create({ name: profile.name || email.split('@')[0], email, googleSubject: profile.sub, emailVerified: true, passwordHash: await bcrypt.hash(crypto.randomUUID(), 12) })
  else if (!user.googleSubject) { user.googleSubject = profile.sub; user.emailVerified = true; await user.save() }
  return { user: safeUser(user), token: createToken(user) }
}

export async function getUserById(userId) {
  await connectDatabase()
  const user = await User.findById(userId)
  return user ? safeUser(user) : null
}

export async function updateUser(userId, input) {
  if (typeof input.name !== 'string' || input.name.trim().length < 2) throw new Error('Name must contain at least 2 characters.')
  await connectDatabase()
  const user = await User.findByIdAndUpdate(userId, { name: input.name.trim() }, { new: true })
  if (!user) throw new Error('User not found.')
  return safeUser(user)
}

export async function deleteUser(userId) {
  await connectDatabase()
  await User.findByIdAndDelete(userId)
  return true
}

export function safeUserFromToken(payload) {
  return { id: payload.sub, name: payload.name || payload.email, email: payload.email }
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret())
}
