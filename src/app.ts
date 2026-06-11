import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { env } from './config/env'
import { AppError } from './shared/errors/AppError'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { profilesRoutes } from './modules/profiles/profiles.routes'
import { ZodError } from 'zod'

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV === 'development' })

  app.register(cors, { origin: true })
  app.register(cookie)
  app.register(jwt, { secret: env.JWT_SECRET })

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(authRoutes)
  app.register(usersRoutes)
  app.register(profilesRoutes)

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        errors: error.flatten().fieldErrors,
      })
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message })
    }

    app.log.error(error)
    return reply.status(500).send({ message: 'Internal server error' })
  })

  return app
}
