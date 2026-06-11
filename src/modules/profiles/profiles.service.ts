import { prisma } from '../../database/prisma'
import { AppError } from '../../shared/errors/AppError'

export async function listProfiles(userId: string) {
  return prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createProfile(userId: string, data: { name: string; toolIds?: string[] }) {
  return prisma.profile.create({
    data: {
      name: data.name,
      toolIds: data.toolIds ?? [],
      userId,
    },
  })
}

export async function updateProfile(
  id: string,
  userId: string,
  data: { name?: string; toolIds?: string[] },
) {
  const profile = await prisma.profile.findFirst({ where: { id, userId } })
  if (!profile) {
    throw new AppError('Profile not found', 404)
  }

  return prisma.profile.update({
    where: { id },
    data,
  })
}

export async function deleteProfile(id: string, userId: string) {
  const profile = await prisma.profile.findFirst({ where: { id, userId } })
  if (!profile) {
    throw new AppError('Profile not found', 404)
  }

  await prisma.profile.delete({ where: { id } })
}

export async function activateProfile(id: string, userId: string) {
  const profile = await prisma.profile.findFirst({ where: { id, userId } })
  if (!profile) {
    throw new AppError('Profile not found', 404)
  }

  await prisma.profile.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  })

  return prisma.profile.update({
    where: { id },
    data: { isActive: true },
  })
}
