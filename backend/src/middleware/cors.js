export function corsMiddleware(request, response, next) {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
  const requestOrigin = request.headers.origin

  if (requestOrigin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
}
