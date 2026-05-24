FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/ws/package.json ./apps/ws/

RUN npm install --workspace=apps/ws --workspace=packages/db --workspace=packages/shared

COPY packages/db/prisma ./packages/db/prisma
RUN npx prisma generate --schema=./packages/db/prisma/schema.prisma

COPY packages/shared/src ./packages/shared/src
COPY packages/db/src ./packages/db/src
COPY apps/ws/src ./apps/ws/src
COPY apps/ws/tsconfig.json ./apps/ws/
COPY tsconfig.base.json ./

WORKDIR /app/apps/ws
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
