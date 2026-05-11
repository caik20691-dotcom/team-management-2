# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --registry=$NPM_REGISTRY

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --registry=$NPM_REGISTRY

RUN npm install prisma --no-save --registry=$NPM_REGISTRY

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY prisma ./prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p uploads

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
