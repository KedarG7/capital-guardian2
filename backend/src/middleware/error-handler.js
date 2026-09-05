export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

export function notFoundHandler(_request, _response, next) {
  next(new ApiError(404, 'NOT_FOUND', 'API route not found.'))
}

export function errorHandler(error, _request, response, _next) {
  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' },
    })
    return
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    })
    return
  }

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.',
    },
  })
}
