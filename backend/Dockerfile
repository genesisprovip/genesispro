# GenesisPro Backend - Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# ---
FROM node:18-alpine

# Security: non-root user
RUN addgroup -g 1001 -S genesispro && \
    adduser -S genesispro -u 1001 -G genesispro

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY package.json ./
COPY src/ ./src/

# Create uploads and logs directories
RUN mkdir -p uploads logs && chown -R genesispro:genesispro /app

USER genesispro

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/app.js"]
