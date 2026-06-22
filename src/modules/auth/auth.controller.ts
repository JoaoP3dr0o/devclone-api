import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import * as authService from './auth.service'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const googleSchema = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().min(1),
})

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerSchema.parse(request.body)
  const user = await authService.registerWithEmailPassword(body)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await reply.jwtSign(
    { sub: user.id, email: user.email },
    { expiresIn: '7d' },
  )

  await authService.createSession(user.id, token, expiresAt)

  reply.status(201).send({ token, user })
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body)
  const user = await authService.loginWithEmailPassword(body)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await reply.jwtSign(
    { sub: user.id, email: user.email },
    { expiresIn: '7d' },
  )

  await authService.createSession(user.id, token, expiresAt)

  reply.send({ token, user })
}

export async function googleAuth(request: FastifyRequest, reply: FastifyReply) {
  const body = googleSchema.parse(request.body)
  const user = await authService.googleAuth(body)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await reply.jwtSign(
    { sub: user.id, email: user.email },
    { expiresIn: '7d' },
  )

  await authService.createSession(user.id, token, expiresAt)

  reply.send({ token, user })
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify()
  const payload = request.user as { sub: string; email: string }

  const token = await reply.jwtSign(
    { sub: payload.sub, email: payload.email },
    { expiresIn: '7d' },
  )

  reply.send({ token })
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    await authService.invalidateSession(token)
  }
  reply.status(204).send()
}
