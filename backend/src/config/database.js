import mongoose from 'mongoose'

let connectionPromise

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI)
}

export function getDatabaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  return states[mongoose.connection.readyState] || 'unknown'
}

export async function connectDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error('MONGODB_URI is not configured.')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    }).catch((error) => {
      connectionPromise = undefined
      throw new Error(`MongoDB connection failed: ${error.message}`)
    })
  }

  await connectionPromise
  return mongoose.connection
}

export async function disconnectDatabase() {
  connectionPromise = undefined
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}
