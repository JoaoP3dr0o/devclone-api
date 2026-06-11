import { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middlewares/auth.middleware'
import * as authController from './auth.controller'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', authController.register)
  app.post('/auth/login', authController.login)
  app.post('/auth/google', authController.googleAuth)
  app.post('/auth/refresh', { preHandler: [authenticate] }, authController.refresh)
  app.delete('/auth/logout', { preHandler: [authenticate] }, authController.logout)
}
