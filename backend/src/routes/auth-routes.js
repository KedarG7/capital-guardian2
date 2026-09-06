import { Router } from 'express'
import { deleteMeController, googleCallbackController, googleStartController, loginController, meController, registerController, requestLoginOtpController, requestRegistrationOtpController, updateMeController, verifyOtpController } from '../controllers/auth-controller.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../middleware/async-handler.js'

const router = Router()

router.post('/register', asyncHandler(registerController))
router.post('/login', asyncHandler(loginController))
router.post('/login/request-otp', asyncHandler(requestLoginOtpController))
router.post('/register/resend-otp', asyncHandler(requestRegistrationOtpController))
router.post('/verify-otp', asyncHandler(verifyOtpController))
router.get('/google', googleStartController)
router.get('/google/callback', asyncHandler(googleCallbackController))
router.get('/me', authMiddleware, asyncHandler(meController))
router.patch('/me', authMiddleware, asyncHandler(updateMeController))
router.delete('/me', authMiddleware, asyncHandler(deleteMeController))

export default router
