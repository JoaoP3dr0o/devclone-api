import { randomBytes } from 'crypto'
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../database/prisma'
import { sendPasswordResetEmail } from '../../services/email.service'
import * as authService from './auth.service'
import bcrypt from 'bcryptjs'

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

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email } = z.object({ email: z.string().email() }).parse(request.body)

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) return reply.send({ message: 'Se este email existir, você receberá as instruções.' })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  await sendPasswordResetEmail(user.email, token)

  reply.send({ message: 'Se este email existir, você receberá as instruções.' })
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, newPassword } = z
    .object({ token: z.string(), newPassword: z.string().min(6) })
    .parse(request.body)

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return reply.status(400).send({ message: 'Token inválido ou expirado.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  reply.send({ message: 'Senha alterada com sucesso.' })
}
