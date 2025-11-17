#!/bin/sh

echo "🚀 Starting Mail Hooks Engine..."

# Create .env file with environment variables for inbound-email
echo "📝 Setting up environment variables..."
cat > /app/.env << EOF
DATABASE_URL=${DATABASE_URL}
LOG_LEVEL=${LOG_LEVEL}
ATTACHMENT_STORAGE=${ATTACHMENT_STORAGE}
MAX_FILE_SIZE=${MAX_FILE_SIZE}
NODE_ENV=${NODE_ENV}
PORT=25
EOF

# Run database migrations
echo "📦 Running database migrations..."
node migrations/init.js

if [ $? -ne 0 ]; then
  echo "❌ Database migrations failed"
  exit 1
fi

echo "✅ Migrations completed"
echo "📡 Starting SMTP server on port 25..."

# Start the SMTP service
exec npm start
