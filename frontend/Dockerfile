FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build the Next.js application
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS final
RUN apk add --no-cache openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

ENV NODE_ENV=production

# Create a non-privileged user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start script handled by docker-compose command
CMD ["node", "server.js"]
