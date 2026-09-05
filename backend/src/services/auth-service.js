import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDatabase } from '../config/database.js'
import { User } from '../models/User.js'

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
  const email = input.email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    const user = await User.create({ name: input.name.trim(), email, passwordHash })
    return { user: safeUser(user), token: createToken(user) }
  } catch (error) {
    if (error.code === 11000) throw new Error('An account with this email already exists.')
    throw error
  }
}

export async function loginUser(input) {
  validateCredentials(input)
  await connectDatabase()
  const email = input.email.trim().toLowerCase()
  const user = await User.findOne({ email }).select('+passwordHash')
  const valid = user && await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) throw new Error('Invalid email or password.')

  return { user: safeUser(user), token: createToken(user) }
}

export async function getUserById(userId) {
  await connectDatabase()
  const user = await User.findById(userId)
  return user ? safeUser(user) : null
}

export function safeUserFromToken(payload) {
  return { id: payload.sub, name: payload.name || payload.email, email: payload.email }
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret())
}
