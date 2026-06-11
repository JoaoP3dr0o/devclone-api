import { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middlewares/auth.middleware'
import * as usersController from './users.controller'

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [authenticate] }, usersController.getMe)
  app.patch('/users/me', { preHandler: [authenticate] }, usersController.updateMe)
}
