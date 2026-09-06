import { getFrontendUrl } from '../config/environment.js'
import { ApiError } from '../middleware/error-handler.js'
import { createGoogleAuthorization, deleteUser, googleLogin, loginUser, registerUser, requestLoginOtp, requestRegistrationOtp, updateUser, verifyOtp } from '../services/auth-service.js'

function oauthCookie(value, maxAge) {
  const secure = getFrontendUrl().startsWith('https') || process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `oauth_state=${value}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax${secure}`
}

function frontendRedirect(path) {
  return `${getFrontendUrl()}${path}`
}

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

export async function requestLoginOtpController(request, response) {
  try { response.json({ success: true, data: await requestLoginOtp(requireBody(request)) }) } catch (error) { throw translateAuthError(error) }
}

export async function requestRegistrationOtpController(request, response) {
  try { response.json({ success: true, data: await requestRegistrationOtp(requireBody(request)) }) } catch (error) { throw translateAuthError(error) }
}

export async function verifyOtpController(request, response) {
  try { response.json({ success: true, data: await verifyOtp(requireBody(request)) }) } catch (error) { throw translateAuthError(error) }
}

export function googleStartController(_request, response) {
  try {
    const { authorizationUrl, state } = createGoogleAuthorization()
    response.setHeader('Set-Cookie', oauthCookie(encodeURIComponent(state), 600))
    response.redirect(302, authorizationUrl)
  } catch (error) {
    response.redirect(302, frontendRedirect(`/?oauth_error=${encodeURIComponent(error.message)}`))
  }
}

export async function googleCallbackController(request, response) {
  try {
    const cookies = Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
      const [key, ...value] = part.trim().split('=')
      return [key, decodeURIComponent(value.join('='))]
    }))
    const result = await googleLogin({ code: request.query.code, state: request.query.state, stateCookie: cookies.oauth_state })
    response.setHeader('Set-Cookie', oauthCookie('', 0))
    response.redirect(302, frontendRedirect(`/#oauth_token=${encodeURIComponent(result.token)}`))
  } catch (_error) {
    response.redirect(302, frontendRedirect('/?oauth_error=' + encodeURIComponent('Google sign-in could not be completed.')))
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
