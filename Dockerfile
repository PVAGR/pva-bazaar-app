# Multi-stage build for PVA Bazaar - Optimized for Railway, Render, Fly.io

# Stage 1: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
COPY backend ./backend
RUN npm ci
RUN cd backend && npm run build
# Drop devDependencies so the runtime stage can copy a smaller production node_modules tree.
RUN npm prune --omit=dev

# Stage 2: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY Frontend ./Frontend
RUN npm ci
RUN cd Frontend && npm run build

# Stage 3: Runtime
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Root workspace hoists most deps to /app/node_modules — copy that tree + backend sources
COPY package*.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/backend ./backend

# Copy built frontend from builder
COPY --from=frontend-builder /app/Frontend/dist ./Frontend/dist

# Copy configuration files and Node entrypoint (required for `npm run start`)
COPY vercel.json ./
COPY .env.production* ./
COPY start.js ./

# Create logs directory
RUN mkdir -p logs

# Expose port (Railway/Render/Fly.io inject PORT at runtime; often not 5001)
EXPOSE 5001

# Health check must use the same PORT as the app (Render sets PORT dynamically)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT:-5001}/api/health-check" >/dev/null || exit 1'

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["npm", "run", "start"]
