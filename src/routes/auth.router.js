import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validateRequest.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";


const authRouter = Router()


authRouter.post(
    '/register',
    validateRequest(registerSchema),
    AuthController.register
)

authRouter.get(
    '/verify-email/:token', 
    AuthController.verifyEmail
)

authRouter.post(
    '/login',
    validateRequest(loginSchema),
    AuthController.login
)
authRouter.post(
    '/forgot-password', 
    AuthController.forgotPassword);

authRouter.post(
    '/reset-password/:reset_token', 
    AuthController.resetPassword);


export default authRouter