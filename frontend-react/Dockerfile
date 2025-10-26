# Build stage
# Stable version: Node.js 18.20.5 on Alpine 3.21
FROM node:18.20.5-alpine3.21 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for flexibility)
RUN npm install --production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
# Stable version: Nginx 1.27 on Alpine 3.21
FROM nginx:1.27-alpine3.21

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
