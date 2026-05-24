FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for the entire monorepo
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm install --workspace=apps/api --workspace=packages/db --workspace=packages/shared

# Generate Prisma client
COPY packages/db/prisma ./packages/db/prisma
RUN npx prisma generate --schema=./packages/db/prisma/schema.prisma

# Copy source
COPY packages/shared/src ./packages/shared/src
COPY packages/db/src ./packages/db/src
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./

# Build
WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
