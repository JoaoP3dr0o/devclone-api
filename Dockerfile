FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# 1. Força a instalação de TODAS as dependências, incluindo as de dev (garante o tsc)
RUN npm ci --include=dev

# 2. Gera o client do Prisma e compila o código TypeScript
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# 3. Remove as dependências de desenvolvimento antes de passar para o próximo estágio
RUN npm prune --omit=dev

# ---

FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 4. Copia apenas o necessário do builder para produção
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]