import { Router } from 'express'
import { deleteMeController, loginController, meController, registerController, updateMeController } from '../controllers/auth-controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../middleware/async-handler.js'

const router = Router()

router.post('/register', asyncHandler(registerController))
router.post('/login', asyncHandler(loginController))
router.get('/me', authMiddleware, asyncHandler(meController))
router.patch('/me', authMiddleware, asyncHandler(updateMeController))
router.delete('/me', authMiddleware, asyncHandler(deleteMeController))

export default router
