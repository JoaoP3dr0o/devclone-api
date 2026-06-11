import { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middlewares/auth.middleware'
import * as profilesController from './profiles.controller'

export async function profilesRoutes(app: FastifyInstance) {
  app.get('/profiles', { preHandler: [authenticate] }, profilesController.list)
  app.post('/profiles', { preHandler: [authenticate] }, profilesController.create)
  app.patch('/profiles/:id', { preHandler: [authenticate] }, profilesController.update)
  app.delete('/profiles/:id', { preHandler: [authenticate] }, profilesController.remove)
  app.patch('/profiles/:id/activate', { preHandler: [authenticate] }, profilesController.activate)
}
