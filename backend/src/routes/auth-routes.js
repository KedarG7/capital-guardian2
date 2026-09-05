import { Router } from 'express'
import { loginController, meController, registerController } from '../controllers/auth-controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../middleware/async-handler.js'

const router = Router()

router.post('/register', asyncHandler(registerController))
router.post('/login', asyncHandler(loginController))
router.get('/me', authMiddleware, asyncHandler(meController))

export default router
