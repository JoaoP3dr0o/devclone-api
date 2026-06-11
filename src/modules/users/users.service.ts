import { prisma } from '../../database/prisma'
import { AppError } from '../../shared/errors/AppError'

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      googleId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  return user
}

export async function updateUser(id: string, data: { name?: string; avatarUrl?: string }) {
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}
