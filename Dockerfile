# Multi-stage build for PVA Bazaar - Optimized for Railway, Render, Fly.io

# Stage 1: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
COPY backend ./backend
RUN npm ci
RUN cd backend && npm run build

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

# Copy production dependencies from backend builder
COPY package*.json ./
RUN npm ci --only=production

# Copy built backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy built frontend from builder
COPY --from=frontend-builder /app/Frontend/dist ./Frontend/dist

# Copy configuration files
COPY vercel.json ./
COPY .env.production* ./

# Create logs directory
RUN mkdir -p logs

# Expose port (Railway/Render/Fly.io will use PORT env var)
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5001/api/health-check || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["npm", "run", "start"]
