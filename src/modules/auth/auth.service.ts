import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env'
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

export async function googleAuth(data: {
  code: string
  codeVerifier: string
  redirectUri: string
}) {
  const client = new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: data.redirectUri,
  })

  // Step 1: Exchange authorization code + PKCE verifier for tokens
  let idToken: string
  try {
    const { tokens } = await client.getToken({
      code: data.code,
      codeVerifier: data.codeVerifier,
    })

    if (!tokens.id_token) {
      throw new AppError('Falha na autenticação com Google', 401)
    }

    idToken = tokens.id_token
  } catch (error) {
    if (error instanceof AppError) throw error

    // HTTP error response from Google = invalid/expired code
    const isGoogleAuthError =
      error != null && typeof error === 'object' && 'response' in error
    if (isGoogleAuthError) {
      throw new AppError('Falha na autenticação com Google', 401)
    }

    // Network-level error (connection refused, timeout, etc.)
    throw new AppError('Erro ao conectar com Google', 502)
  }

  // Step 2: Verify the id_token signature against our client_id
  let payload: {
    sub: string
    email: string
    name?: string
    picture?: string
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })

    const raw = ticket.getPayload()
    if (!raw?.sub || !raw.email) {
      throw new AppError('Falha na autenticação com Google', 401)
    }

    payload = {
      sub: raw.sub,
      email: raw.email,
      name: raw.name,
      picture: raw.picture,
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Falha na autenticação com Google', 401)
  }

  // Step 3: Find or create the user
  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } })

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: payload.email } })

    if (byEmail) {
      // Link Google account to existing email-based account
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: payload.sub,
          avatarUrl: byEmail.avatarUrl ?? payload.picture,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email,
          googleId: payload.sub,
          avatarUrl: payload.picture,
          passwordHash: null,
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
