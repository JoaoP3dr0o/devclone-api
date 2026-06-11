import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — variables used inside factories must be created with vi.hoisted()
const { mockPrismaUser, mockGetToken, mockVerifyIdToken } = vi.hoisted(() => ({
  mockPrismaUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockGetToken: vi.fn(),
  mockVerifyIdToken: vi.fn(),
}))

vi.mock('../../../config/env', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    PORT: 3333,
    NODE_ENV: 'test',
  },
}))

vi.mock('../../../database/prisma', () => ({
  prisma: { user: mockPrismaUser },
}))

vi.mock('google-auth-library', () => ({
  // Must use a regular function (not arrow) so `new OAuth2Client()` works
  OAuth2Client: vi.fn(function (this: Record<string, unknown>) {
    this.getToken = mockGetToken
    this.verifyIdToken = mockVerifyIdToken
  }),
}))

// --- Import after mocks ---
import { googleAuth } from '../auth.service'
import { AppError } from '../../../shared/errors/AppError'

// --- Fixtures ---

const validInput = {
  code: 'valid-code',
  codeVerifier: 'valid-verifier',
  redirectUri: 'http://localhost:5173/callback',
}

const googlePayload = {
  sub: 'google-id-123',
  email: 'user@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
}

function makeTicket(payload: typeof googlePayload) {
  return { getPayload: () => payload }
}

const dbUser = {
  id: 'uuid-1',
  email: googlePayload.email,
  name: googlePayload.name,
  avatarUrl: googlePayload.picture,
  googleId: googlePayload.sub,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetToken.mockResolvedValue({ tokens: { id_token: 'id-token-jwt' } })
  mockVerifyIdToken.mockResolvedValue(makeTicket(googlePayload))
})

// --- Tests ---

describe('googleAuth', () => {
  describe('new user (never seen before)', () => {
    it('creates the user and returns safe fields', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null) // not found by googleId or email
      mockPrismaUser.create.mockResolvedValue(dbUser)

      const result = await googleAuth(validInput)

      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          email: googlePayload.email,
          name: googlePayload.name,
          googleId: googlePayload.sub,
          avatarUrl: googlePayload.picture,
          passwordHash: null,
        },
      })

      expect(result).toEqual({
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatarUrl: dbUser.avatarUrl,
      })

      // Must never expose passwordHash
      expect(result).not.toHaveProperty('passwordHash')
    })
  })

  describe('existing Google user (returning login)', () => {
    it('returns the existing user without touching the DB', async () => {
      mockPrismaUser.findUnique.mockResolvedValueOnce(dbUser) // found by googleId

      const result = await googleAuth(validInput)

      expect(mockPrismaUser.create).not.toHaveBeenCalled()
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
      expect(result.id).toBe(dbUser.id)
    })
  })

  describe('existing email account (link Google)', () => {
    it('links googleId to the email-based account', async () => {
      const emailUser = { ...dbUser, googleId: null }
      const linked = { ...dbUser }

      // First findUnique (by googleId) → null; second (by email) → emailUser
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(emailUser)
      mockPrismaUser.update.mockResolvedValue(linked)

      const result = await googleAuth(validInput)

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: emailUser.id },
        data: {
          googleId: googlePayload.sub,
          avatarUrl: emailUser.avatarUrl ?? googlePayload.picture,
        },
      })
      expect(result.id).toBe(linked.id)
    })
  })

  describe('error handling', () => {
    it('throws 401 when Google returns an HTTP error (invalid/expired code)', async () => {
      const googleError = Object.assign(new Error('invalid_grant'), { response: { status: 400 } })
      mockGetToken.mockRejectedValue(googleError)

      await expect(googleAuth(validInput)).rejects.toMatchObject({
        message: 'Falha na autenticação com Google',
        statusCode: 401,
      })
    })

    it('throws 502 on network-level failure (no response object)', async () => {
      mockGetToken.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(googleAuth(validInput)).rejects.toMatchObject({
        message: 'Erro ao conectar com Google',
        statusCode: 502,
      })
    })

    it('throws 401 when getToken returns no id_token', async () => {
      mockGetToken.mockResolvedValue({ tokens: { access_token: 'only-access' } })

      await expect(googleAuth(validInput)).rejects.toMatchObject({
        message: 'Falha na autenticação com Google',
        statusCode: 401,
      })
    })

    it('throws 401 when id_token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'))

      await expect(googleAuth(validInput)).rejects.toMatchObject({
        message: 'Falha na autenticação com Google',
        statusCode: 401,
      })
    })

    it('throws 401 when id_token payload is missing required fields', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: null, email: null }),
      })

      await expect(googleAuth(validInput)).rejects.toBeInstanceOf(AppError)
    })
  })
})
