Inicialize um projeto Node.js + Fastify para a API do DevClone.

## CONTEXTO
- API REST para o app desktop DevClone (Electron + React)
- Autenticação própria (email/senha) + OAuth Google
- Banco de dados: PostgreSQL via Prisma ORM
- Repositório: https://github.com/JoaoP3dr0o/devclone-api.git

## ESTRUTURA DO PROJETO

devclone-api/
├── src/
│   ├── server.ts          ← entry point, inicializa Fastify
│   ├── app.ts             ← registra plugins e rotas
│   ├── config/
│   │   └── env.ts         ← variáveis de ambiente com validação
│   ├── database/
│   │   └── prisma.ts      ← instância do Prisma Client
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   └── profiles/
│   │       ├── profiles.routes.ts
│   │       ├── profiles.controller.ts
│   │       └── profiles.service.ts
│   └── shared/
│       ├── middlewares/
│       │   └── auth.middleware.ts  ← verifica JWT
│       └── errors/
│           └── AppError.ts
├── prisma/
│   └── schema.prisma      ← schema do banco
├── .env.example
├── .env                   ← gitignored
├── .gitignore
├── tsconfig.json
└── package.json

## DEPENDÊNCIAS

Instalar:
- fastify
- @fastify/cors
- @fastify/jwt
- @fastify/cookie
- @prisma/client
- prisma (dev)
- typescript (dev)
- tsx (dev)
- @types/node (dev)
- zod (validação)
- bcryptjs + @types/bcryptjs
- googleapis (OAuth Google)

## SCHEMA PRISMA (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  avatarUrl     String?
  passwordHash  String?   // null se autenticou só via Google
  googleId      String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  profiles      Profile[]
  sessions      Session[]
}

model Profile {
  id        String   @id @default(uuid())
  name      String
  toolIds   String[] // array de tool IDs
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## ARQUIVO .env.example
DATABASE_URL="postgresql://user:password@localhost:5432/devclone"
JWT_SECRET="sua-chave-secreta-aqui"
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="305690759318-eb0ob57gassho59ejte0n4u74vcjn80h.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="sua-chave-secreta-google"
PORT=3333
NODE_ENV="development"

## ROTAS INICIAIS A IMPLEMENTAR

### Auth
POST /auth/register     → cadastro com email/senha
POST /auth/login        → login com email/senha → retorna JWT
POST /auth/google       → recebe code do OAuth Google → retorna JWT
POST /auth/refresh      → renova JWT
DELETE /auth/logout     → invalida sessão

### Users
GET /users/me           → retorna dados do usuário logado
PATCH /users/me         → atualiza nome/avatar

### Profiles
GET /profiles           → lista perfis do usuário logado
POST /profiles          → cria novo perfil
PATCH /profiles/:id     → atualiza perfil
DELETE /profiles/:id    → deleta perfil
PATCH /profiles/:id/activate → ativa um perfil

## IMPLEMENTAR AGORA

1. Setup completo do projeto (package.json, tsconfig, .gitignore)
2. Schema Prisma conforme acima
3. src/config/env.ts com validação via Zod
4. src/database/prisma.ts
5. src/server.ts e src/app.ts funcionando
6. Rotas de auth: register e login com email/senha funcionando
7. Middleware de autenticação JWT
8. Rotas de profiles completas (CRUD + activate)
9. Docker Compose para PostgreSQL local

## DOCKER COMPOSE (para desenvolvimento local)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: devclone
      POSTGRES_PASSWORD: devclone123
      POSTGRES_DB: devclone
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## SCRIPTS NO PACKAGE.JSON

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate",
  "db:studio": "prisma studio"
}
```

## REGRAS
1. TypeScript strict em todo o projeto
2. Zod para validação de todas as entradas
3. Erros tratados com AppError lançado nos services,
   capturado globalmente no app.ts
4. JWT gerado no login com payload: { sub: userId, email }
5. Passwords hasheadas com bcryptjs (salt 10)
6. Nunca retornar passwordHash nas respostas
7. Rota /health que retorna { status: 'ok' } para healthcheck

Após implementar tudo:
1. Rodar docker compose up -d para subir o PostgreSQL
2. Rodar npm run db:migrate para criar as tabelas
3. Testar POST /auth/register e POST /auth/login
4. Confirmar que retorna JWT válido

Commit ao final:
feat: initial devclone-api setup with auth and profiles
