# Multi-stage build for Node.js service
FROM --platform=linux/amd64 node:22-alpine AS base

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production

# Development dependencies for building
FROM base AS build-deps
RUN npm ci

# Copy source code and build
COPY . .
FROM build-deps AS build
RUN npm run build
#RUN mkdir -p /app/dist/src && cp -r /app/src/public /app/dist/src/public

# Production image
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

COPY --from=build /app/.env.example* ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4100/ || exit 1

EXPOSE 4100

# Start the application
CMD ["npm", "start"]

