import { ApiError } from './error-handler.js'
import { isDatabaseConfigured } from '../config/database.js'
import { getUserById, safeUserFromToken, verifyToken } from '../services/auth-service.js'

export async function authMiddleware(request, _response, next) {
  try {
    const header = request.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.')
    }

    const payload = verifyToken(header.slice(7))
    const user = isDatabaseConfigured() ? await getUserById(payload.sub) : safeUserFromToken(payload)
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.')
    request.user = user
    next()
  } catch (error) {
    if (error instanceof ApiError) return next(error)
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.'))
    }
    if (error.message === 'JWT_SECRET is not configured.') {
      return next(new ApiError(503, 'AUTH_CONFIGURATION_ERROR', error.message))
    }
    return next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'Authentication service is unavailable.'))
  }
}
