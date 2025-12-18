# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy server files
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN cd server && npm install --production

# Create data directories
RUN mkdir -p /app/server/data /app/server/projects

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/server/data
ENV PROJECTS_BASE=/app/server/projects

# Expose port
EXPOSE 3000

# Start the server
WORKDIR /app/server
CMD ["node", "index.js"]
