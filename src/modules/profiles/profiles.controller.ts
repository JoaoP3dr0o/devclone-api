import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import * as profilesService from './profiles.service'

const createSchema = z.object({
  name: z.string().min(1),
  toolIds: z.array(z.string()).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  toolIds: z.array(z.string()).optional(),
})

const paramsSchema = z.object({ id: z.string().uuid() })

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const profiles = await profilesService.listProfiles(sub)
  reply.send({ profiles })
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const data = createSchema.parse(request.body)
  const profile = await profilesService.createProfile(sub, data)
  reply.status(201).send({ profile })
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const { id } = paramsSchema.parse(request.params)
  const data = updateSchema.parse(request.body)
  const profile = await profilesService.updateProfile(id, sub, data)
  reply.send({ profile })
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const { id } = paramsSchema.parse(request.params)
  await profilesService.deleteProfile(id, sub)
  reply.status(204).send()
}

export async function activate(request: FastifyRequest, reply: FastifyReply) {
  const { sub } = request.user as { sub: string }
  const { id } = paramsSchema.parse(request.params)
  const profile = await profilesService.activateProfile(id, sub)
  reply.send({ profile })
}
