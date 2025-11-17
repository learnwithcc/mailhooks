FROM node:20-alpine

WORKDIR /app

# Install git for npm dependencies
RUN apk add --no-cache git

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy migration files
COPY migrations ./migrations

# Copy configuration and startup script
COPY config.json ./
COPY entrypoint.sh ./

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose SMTP port
EXPOSE 25

# Health check - verify SMTP port is listening
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD netstat -tuln | grep -q :25 || exit 1

# Run migrations and start service
ENTRYPOINT ["./entrypoint.sh"]
