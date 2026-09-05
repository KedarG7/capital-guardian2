import './config/environment.js'
import express from 'express'
import apiRoutes from './routes/api-routes.js'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import authRoutes from './routes/auth-routes.js'
import { authMiddleware } from './middleware/authMiddleware.js'

const app = express()

app.use(corsMiddleware)
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'capital-guardian-backend',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api', authMiddleware, apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
