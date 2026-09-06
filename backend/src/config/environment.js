import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const environmentFile = fileURLToPath(new URL('../../../.env', import.meta.url))
dotenv.config({ path: environmentFile })
dotenv.config()

if (process.env.NODE_TEST_CONTEXT) {
  delete process.env.MONGODB_URI
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-jwt-secret'
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
}

export function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '')
}

export function getAllowedOrigins() {
  const configured = process.env.FRONTEND_URL || 'http://localhost:5173'
  return configured.split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean)
}
