const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
]

export function corsMiddleware(request, response, next) {
  const envOrigin = process.env.FRONTEND_URL
  const isProduction = process.env.NODE_ENV === 'production'

  const allowedOrigins = isProduction
    ? [envOrigin].filter(Boolean)
    : Array.from(
        new Set([
          ...DEV_ORIGINS,
          ...(envOrigin ? envOrigin.split(',').map((o) => o.trim()) : []),
        ])
      )

  const requestOrigin = request.headers.origin

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  next()
}
