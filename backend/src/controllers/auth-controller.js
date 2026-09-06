import { ApiError } from '../middleware/error-handler.js'
import { deleteUser, loginUser, registerUser, updateUser } from '../services/auth-service.js'

function requireBody(request) {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'A JSON request body is required.')
  }
  return request.body
}

function translateAuthError(error) {
  if (error instanceof ApiError) return error
  if (error.message === 'Invalid email or password.') {
    return new ApiError(401, 'INVALID_CREDENTIALS', error.message)
  }
  if (error.message.includes('already exists')) {
    return new ApiError(409, 'EMAIL_EXISTS', error.message)
  }
  if (error.message.includes('not configured')) {
    return new ApiError(503, 'AUTH_CONFIGURATION_ERROR', error.message)
  }
  if (error.message.includes('connection') || error.message.includes('unavailable')) {
    return new ApiError(503, 'DATABASE_UNAVAILABLE', 'Authentication service is unavailable.')
  }
  return new ApiError(422, 'INVALID_AUTH_INPUT', error.message)
}

export async function registerController(request, response) {
  try {
    const result = await registerUser(requireBody(request))
    response.status(201).json({ success: true, data: result })
  } catch (error) {
    throw translateAuthError(error)
  }
}

export async function loginController(request, response) {
  try {
    const result = await loginUser(requireBody(request))
    response.json({ success: true, data: result })
  } catch (error) {
    throw translateAuthError(error)
  }
}

export async function meController(request, response) {
  response.json({ success: true, data: { user: request.user } })
}

export async function updateMeController(request, response) {
  try { response.json({ success: true, data: { user: await updateUser(request.user.id, requireBody(request)) } }) } catch (error) { throw translateAuthError(error) }
}

export async function deleteMeController(request, response) {
  try { await deleteUser(request.user.id); response.status(204).end() } catch (error) { throw translateAuthError(error) }
}
