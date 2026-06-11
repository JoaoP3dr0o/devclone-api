import bcrypt from 'bcryptjs'
import { prisma } from '../../database/prisma'
import { AppError } from '../../shared/errors/AppError'

export async function registerWithEmailPassword(data: {
  name: string
  email: string
  password: string
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new AppError('Email already in use', 409)
  }

  const passwordHash = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  })

  return user
}

export async function loginWithEmailPassword(data: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401)
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash)
  if (!valid) {
    throw new AppError('Invalid credentials', 401)
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

export async function loginWithGoogle(idToken: string) {
  const { OAuth2Client } = await import('googleapis/build/src/auth/oauth2client')
  const { env } = await import('../../config/env')

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  })

  const payload = ticket.getPayload()
  if (!payload || !payload.email || !payload.sub) {
    throw new AppError('Invalid Google token', 401)
  }

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } })

  if (!user) {
    user = await prisma.user.findUnique({ where: { email: payload.email } })
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, avatarUrl: user.avatarUrl ?? payload.picture },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email,
          googleId: payload.sub,
          avatarUrl: payload.picture,
        },
      })
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  await prisma.session.create({
    data: { userId, token, expiresAt },
  })
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { token } })
}
