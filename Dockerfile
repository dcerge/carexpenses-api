# Multi-stage build for Node.js service
FROM node:22-alpine AS base

RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./

# Production dependencies only
FROM base AS dependencies
RUN npm ci --omit=dev

# Build stage - full deps + source
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine AS production

RUN apk add --no-cache curl
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/.env.example* ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4100/ || exit 1

EXPOSE 4100
CMD ["npm", "start"]