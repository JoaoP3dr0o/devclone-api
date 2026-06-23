# CHECKPOINT — devclone-api

## Estado atual

- **API em produção:** `https://api.devclone.com.br`
- **Deploy:** VPS `178.156.242.151` via Docker + Nginx Proxy Manager + Let's Encrypt SSL
- **Orquestração:** Coolify

## O que está funcionando

- `POST /auth/register` → retorna `{ user, token }` com status 201
- `POST /auth/login` → retorna `{ user, token }`
- `POST /auth/google` → fluxo PKCE (pendente ajuste em produção)
- CRUD completo de perfis isolados por usuário
- `GET /health` → `{ status: "ok" }`
- Migrations rodando automaticamente no start via Dockerfile

## Pendente

- **Google OAuth:** callback ainda tenta abrir `localhost:5173` em produção
- **Recuperação de senha:** endpoint e email transacional não implementados

## Stack

- Fastify + PostgreSQL + Prisma + JWT + bcrypt + Zod
- Docker multi-stage, `node:22-slim`
- Banco gerenciado pelo Coolify

## Commits recentes relevantes

- `fix: return JWT token on register response` (509bdb1)
