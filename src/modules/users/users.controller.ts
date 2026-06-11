import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import * as usersService from './users.service'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
})

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const user = await usersService.getUserById(sub)
  reply.send({ user })
}

export async function updateMe(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const data = updateSchema.parse(request.body)
  const user = await usersService.updateUser(sub, data)
  reply.send({ user })
}
