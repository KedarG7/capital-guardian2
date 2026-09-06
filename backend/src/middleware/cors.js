import { getAllowedOrigins } from '../config/environment.js'

export function corsMiddleware(request, response, next) {
  const allowedOrigins = getAllowedOrigins()
  const requestOrigin = request.headers.origin

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
}
